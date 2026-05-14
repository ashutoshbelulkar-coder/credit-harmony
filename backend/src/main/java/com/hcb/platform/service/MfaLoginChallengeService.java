package com.hcb.platform.service;

import com.hcb.platform.common.AuthOperationException;
import com.hcb.platform.model.entity.MfaLoginChallenge;
import com.hcb.platform.model.entity.User;
import com.hcb.platform.repository.MfaLoginChallengeRepository;
import com.hcb.platform.repository.UserRepository;
import com.hcb.platform.util.EmailMaskUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MfaLoginChallengeService {

    static final String DUMMY_OTP_PLACEHOLDER = "DUMMY";
    static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int CHALLENGE_TTL_MINUTES = 10;
    private static final int MAX_OTP_ATTEMPTS = 8;

    private final MfaLoginChallengeRepository challengeRepository;
    private final UserRepository userRepository;
    private final EmailOtpNotificationService emailOtpNotificationService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${hcb.auth.mfa.dummy-otp-enabled:true}")
    private boolean dummyOtpEnabled;

    @Value("${hcb.auth.mfa.dummy-otp-code:123456}")
    private String dummyOtpCode;

    public record IssuedChallenge(String id, String emailMasked, int resendAvailableInSeconds) {}

    @Transactional
    public IssuedChallenge createChallenge(long userId, String email) {
        challengeRepository.deleteByUserId(userId);
        String id = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime now = LocalDateTime.now().withNano(0);
        LocalDateTime expires = now.plusMinutes(CHALLENGE_TTL_MINUTES);
        LocalDateTime resendAfter = now.plusSeconds(RESEND_COOLDOWN_SECONDS);

        String otpHash;
        String plainForLog;
        if (dummyOtpEnabled) {
            otpHash = DUMMY_OTP_PLACEHOLDER;
            plainForLog = dummyOtpCode != null ? dummyOtpCode : "123456";
        } else {
            String code = randomSixDigit();
            otpHash = passwordEncoder.encode(code);
            plainForLog = code;
        }

        MfaLoginChallenge row = MfaLoginChallenge.builder()
            .id(id)
            .userId(userId)
            .otpHash(otpHash)
            .expiresAt(expires)
            .resendNotBefore(resendAfter)
            .createdAt(now)
            .attemptCount(0)
            .build();
        challengeRepository.save(row);

        emailOtpNotificationService.notifyLoginOtp(email, plainForLog, dummyOtpEnabled);

        return new IssuedChallenge(id, EmailMaskUtil.maskEmail(email), RESEND_COOLDOWN_SECONDS);
    }

    /**
     * @return user id for the verified challenge
     */
    @Transactional
    public long verifyCodeAndConsume(String challengeId, String rawCode) {
        MfaLoginChallenge ch = challengeRepository.findById(challengeId)
            .orElseThrow(() -> new AuthOperationException(
                "ERR_MFA_CHALLENGE_INVALID",
                "Invalid or expired verification challenge",
                HttpStatus.UNAUTHORIZED
            ));
        LocalDateTime now = LocalDateTime.now().withNano(0);
        if (ch.getExpiresAt().isBefore(now)) {
            challengeRepository.delete(ch);
            throw new AuthOperationException(
                "ERR_MFA_CHALLENGE_EXPIRED",
                "Verification code has expired",
                HttpStatus.UNAUTHORIZED
            );
        }
        String code = rawCode == null ? "" : rawCode.trim();
        if (!StringUtils.hasText(code)) {
            bumpAttempts(ch);
            throw new AuthOperationException(
                "ERR_MFA_INVALID",
                "Invalid verification code",
                HttpStatus.UNAUTHORIZED
            );
        }
        boolean ok;
        if (DUMMY_OTP_PLACEHOLDER.equals(ch.getOtpHash()) && dummyOtpEnabled) {
            String expected = dummyOtpCode != null ? dummyOtpCode.trim() : "123456";
            ok = expected.equals(code);
        } else {
            ok = passwordEncoder.matches(code, ch.getOtpHash());
        }
        if (!ok) {
            bumpAttempts(ch);
            throw new AuthOperationException(
                "ERR_MFA_INVALID",
                "Invalid verification code",
                HttpStatus.UNAUTHORIZED
            );
        }
        long userId = ch.getUserId();
        challengeRepository.delete(ch);
        return userId;
    }

    private void bumpAttempts(MfaLoginChallenge ch) {
        ch.setAttemptCount(ch.getAttemptCount() + 1);
        challengeRepository.save(ch);
        if (ch.getAttemptCount() >= MAX_OTP_ATTEMPTS) {
            challengeRepository.delete(ch);
            throw new AuthOperationException(
                "ERR_MFA_LOCKED",
                "Too many invalid attempts. Please sign in again.",
                HttpStatus.UNAUTHORIZED
            );
        }
    }

    @Transactional
    public void resend(String challengeId) {
        MfaLoginChallenge ch = challengeRepository.findById(challengeId)
            .orElseThrow(() -> new AuthOperationException(
                "ERR_MFA_CHALLENGE_INVALID",
                "Invalid or expired verification challenge",
                HttpStatus.UNAUTHORIZED
            ));
        LocalDateTime now = LocalDateTime.now().withNano(0);
        if (ch.getExpiresAt().isBefore(now)) {
            challengeRepository.delete(ch);
            throw new AuthOperationException(
                "ERR_MFA_CHALLENGE_EXPIRED",
                "Verification code has expired",
                HttpStatus.UNAUTHORIZED
            );
        }
        if (now.isBefore(ch.getResendNotBefore())) {
            long seconds = java.time.Duration.between(now, ch.getResendNotBefore()).getSeconds();
            int retry = (int) Math.max(1, Math.min(seconds, RESEND_COOLDOWN_SECONDS));
            throw new AuthOperationException(
                "ERR_MFA_RESEND_COOLDOWN",
                "Please wait before requesting a new code",
                HttpStatus.TOO_MANY_REQUESTS,
                retry
            );
        }

        String otpHash;
        String plainForLog;
        if (dummyOtpEnabled) {
            otpHash = DUMMY_OTP_PLACEHOLDER;
            plainForLog = dummyOtpCode != null ? dummyOtpCode : "123456";
        } else {
            String code = randomSixDigit();
            otpHash = passwordEncoder.encode(code);
            plainForLog = code;
        }
        ch.setOtpHash(otpHash);
        ch.setResendNotBefore(now.plusSeconds(RESEND_COOLDOWN_SECONDS));
        ch.setExpiresAt(now.plusMinutes(CHALLENGE_TTL_MINUTES));
        challengeRepository.save(ch);

        User user = userRepository.findById(ch.getUserId())
            .orElseThrow(() -> new AuthOperationException(
                "ERR_MFA_CHALLENGE_INVALID",
                "Invalid or expired verification challenge",
                HttpStatus.UNAUTHORIZED
            ));
        emailOtpNotificationService.notifyLoginOtp(user.getEmail(), plainForLog, dummyOtpEnabled);
    }

    private String randomSixDigit() {
        int n = secureRandom.nextInt(900_000) + 100_000;
        return String.valueOf(n);
    }
}