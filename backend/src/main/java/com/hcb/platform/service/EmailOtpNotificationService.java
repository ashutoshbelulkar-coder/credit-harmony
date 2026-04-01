package com.hcb.platform.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Stub: logs OTP dispatch. Replace with SMTP or provider integration for production.
 */
@Service
public class EmailOtpNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailOtpNotificationService.class);

    public void notifyLoginOtp(String email, String otpPlainText, boolean dummyMode) {
        if (dummyMode) {
            log.info("MFA login OTP (dummy mode, code={}) would be sent to {}", otpPlainText, email);
        } else {
            log.info("MFA login OTP would be sent to {}", email);
        }
    }
}
