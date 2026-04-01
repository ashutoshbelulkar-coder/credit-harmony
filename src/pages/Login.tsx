import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api-client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, useReducedMotion } from "framer-motion";
import CreditNetworkCanvas from "@/components/CreditNetworkCanvas";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  Users,
} from "lucide-react";

import { toast } from "sonner";
import { showDemoAccountRecoveryUi } from "@/lib/feature-flags";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

const trustIndicators = [
  { icon: ShieldCheck, label: "256-bit Encrypted" },
  { icon: KeyRound, label: "Enterprise Security" },
  { icon: Users, label: "Role-Based Access" },
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, verifyMfaLogin, resendMfaOtp } = useAuth();
  const prefersReduced = useReducedMotion();

  const sessionExpired = searchParams.get("expired") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    server?: string;
    otp?: string;
  }>({});

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [emailMasked, setEmailMasked] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [otpCode, setOtpCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendSeconds]);

  const resetCredentialFormErrors = () => {
    setTurnstileKey((k) => k + 1);
    setCaptchaToken(null);
  };

  const handleCredentialSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_REGEX.test(email))
      next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setErrors({ ...next, server: "Please complete the security verification." });
      return;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      const result = await login(
        email.trim(),
        password,
        rememberMe,
        captchaToken ?? undefined
      );
      if (result.kind === "mfa_required") {
        setMfaChallengeId(result.mfaChallengeId);
        setEmailMasked(result.emailMasked);
        setResendSeconds(result.resendAvailableInSeconds);
        setStep("otp");
        setOtpCode("");
        setErrors({});
        return;
      }
      navigate("/", { replace: true });
    } catch (err) {
      resetCredentialFormErrors();
      if (err instanceof ApiError) {
        if (err.isUnauthorized) {
          setErrors({ server: "Invalid email or password. Please try again." });
        } else if (err.isForbidden) {
          setErrors({
            server: "Your account has been suspended. Please contact your administrator.",
          });
        } else if (err.code === "ERR_CAPTCHA_REQUIRED" || err.code === "ERR_CAPTCHA_INVALID") {
          setErrors({
            server: err.message || "Security verification failed. Please try again.",
          });
        } else {
          setErrors({ server: err.message || "An unexpected error occurred. Please try again." });
        }
      } else {
        setErrors({ server: "Unable to connect to the server. Please check your connection." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaChallengeId) return;
    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setErrors({ otp: "Enter the 6-digit code from your email." });
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      await verifyMfaLogin(mfaChallengeId, code);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isUnauthorized) {
          setErrors({ otp: "Invalid or expired code. Please try again." });
        } else {
          setErrors({ server: err.message || "Verification failed. Please try again." });
        }
      } else {
        setErrors({ server: "Unable to connect to the server. Please check your connection." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!mfaChallengeId || resendSeconds > 0 || isResending) return;
    setIsResending(true);
    setErrors({});
    try {
      await resendMfaOtp(mfaChallengeId);
      setResendSeconds(60);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429 && err.retryAfterSeconds != null) {
        setResendSeconds(err.retryAfterSeconds);
      } else if (err instanceof ApiError) {
        setErrors({ server: err.message || "Could not resend code." });
      } else {
        setErrors({ server: "Unable to connect to the server." });
      }
    } finally {
      setIsResending(false);
    }
  };

  const goBackToCredentials = () => {
    setStep("credentials");
    setMfaChallengeId(null);
    setEmailMasked("");
    setOtpCode("");
    setResendSeconds(0);
    setErrors({});
    resetCredentialFormErrors();
  };

  const fadeUp = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: "easeOut" as const },
      };

  const stagger = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
      };

  const staggerDelay = (i: number) =>
    prefersReduced ? {} : { transition: { delay: 0.05 * i, duration: 0.3 } };

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      {/* ── Left Brand Panel ── */}
      <div className="relative hidden w-full shrink flex-col items-center justify-center overflow-hidden bg-[#0B2E5B] px-8 py-8 lg:flex lg:w-1/2 lg:h-full lg:py-0 lg:shrink-0">
        <CreditNetworkCanvas reduced={!!prefersReduced} />

        <motion.div
          className="relative z-10 flex flex-col items-center text-center"
          {...fadeUp}
        >
          <img
            src="/crif-logo-white.png"
            alt="CRIF – Together to the next level"
            className="h-7 w-auto md:h-8 lg:h-14"
            draggable={false}
          />
        </motion.div>

        {/* Decorative corner accent */}
        <div className="absolute bottom-0 right-0 hidden h-32 w-32 rounded-tl-full bg-white/[0.03] lg:block" />
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex w-full min-h-screen flex-1 flex-col items-center justify-center bg-background px-6 py-6 overflow-y-auto lg:min-h-0 lg:overflow-hidden lg:w-1/2 lg:h-full lg:py-0">
        <motion.div
          className="w-full max-w-[420px]"
          {...fadeUp}
        >
          <div role="main" aria-label="Sign in">
            {/* Header */}
            <motion.div className="mb-6 lg:mb-8" {...stagger} {...staggerDelay(0)}>
              <h1 className="font-sans text-[22px] font-bold leading-tight text-[#0B2E5B] dark:text-foreground">
                {step === "credentials" ? "Login" : "Verify sign-in"}
              </h1>
              {step === "otp" && (
                <p className="mt-2 text-[12px] text-muted-foreground leading-snug">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-medium text-foreground">{emailMasked || "your email"}</span>.
                </p>
              )}
            </motion.div>

            {/* Session expired banner */}
            {sessionExpired && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-[12px]">
                  Your session has expired. Please sign in again.
                </AlertDescription>
              </Alert>
            )}

            {/* Server error */}
            {errors.server && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-[12px]">{errors.server}</AlertDescription>
              </Alert>
            )}

            {/* Forms */}
            {step === "credentials" ? (
            <form onSubmit={handleCredentialSubmit} className="space-y-5 lg:space-y-6">
              {/* Email */}
              <motion.div
                className="space-y-2"
                {...stagger}
                {...staggerDelay(1)}
              >
                <Label
                  htmlFor="login-email"
                  className="text-[11px] font-medium text-gray-700 dark:text-muted-foreground"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10 text-base sm:text-[13px] transition-all duration-200 focus-visible:ring-crif-orange/60 focus-visible:border-crif-orange"
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? "login-email-error" : undefined
                    }
                  />
                </div>
                {errors.email && (
                  <p
                    id="login-email-error"
                    className="text-[11px] text-destructive"
                    role="alert"
                  >
                    {errors.email}
                  </p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div
                className="space-y-2"
                {...stagger}
                {...staggerDelay(2)}
              >
                <Label
                  htmlFor="login-password"
                  className="text-[11px] font-medium text-gray-700 dark:text-muted-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10 pr-10 text-base sm:text-[13px] transition-all duration-200 focus-visible:ring-crif-orange/60 focus-visible:border-crif-orange"
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "login-password-error" : undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm transition-colors"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="login-password-error"
                    className="text-[11px] text-destructive"
                    role="alert"
                  >
                    {errors.password}
                  </p>
                )}
              </motion.div>

              {/* Remember + Forgot */}
              <motion.div
                className="flex items-center justify-between"
                {...stagger}
                {...staggerDelay(3)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                    className="h-4 w-4 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label
                    htmlFor="remember-me"
                    className="cursor-pointer text-[11px] font-normal text-muted-foreground"
                  >
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      showDemoAccountRecoveryUi()
                        ? "Password reset is not wired in this demo build."
                        : "Password reset is managed by your administrator."
                    )
                  }
                  className="text-[11px] font-medium text-crif-orange hover:text-crif-orange/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded transition-colors"
                >
                  Forgot password?
                </button>
              </motion.div>

              {TURNSTILE_SITE_KEY ? (
                <motion.div
                  className="flex justify-center overflow-x-auto py-1"
                  {...stagger}
                  {...staggerDelay(4)}
                >
                  <Turnstile
                    key={turnstileKey}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                  />
                </motion.div>
              ) : null}

              {/* Sign In */}
              <motion.div {...stagger} {...staggerDelay(5)}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-[10px] bg-primary text-[13px] font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-crif-orange/60 focus-visible:ring-offset-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </motion.div>
            </form>
            ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-5 lg:space-y-6">
              <motion.div className="space-y-2" {...stagger} {...staggerDelay(1)}>
                <Label
                  htmlFor="login-otp"
                  className="text-[11px] font-medium text-gray-700 dark:text-muted-foreground"
                >
                  One-time code
                </Label>
                <Input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-11 text-center text-lg tracking-[0.35em] font-mono text-base sm:text-[15px] transition-all duration-200 focus-visible:ring-crif-orange/60 focus-visible:border-crif-orange"
                  aria-invalid={!!errors.otp}
                  aria-describedby={errors.otp ? "login-otp-error" : undefined}
                />
                {errors.otp && (
                  <p id="login-otp-error" className="text-[11px] text-destructive" role="alert">
                    {errors.otp}
                  </p>
                )}
              </motion.div>
              <motion.div className="flex flex-col gap-3" {...stagger} {...staggerDelay(2)}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-[10px] bg-primary text-[13px] font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-crif-orange/60 focus-visible:ring-offset-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify and continue"
                  )}
                </Button>
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:items-center">
                  <button
                    type="button"
                    disabled={resendSeconds > 0 || isResending}
                    onClick={() => void handleResend()}
                    className="text-[11px] font-medium text-crif-orange hover:text-crif-orange/80 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded transition-colors"
                  >
                    {isResending
                      ? "Sending…"
                      : resendSeconds > 0
                        ? `Resend code (${resendSeconds}s)`
                        : "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={goBackToCredentials}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded transition-colors"
                  >
                    Back to sign in
                  </button>
                </div>
              </motion.div>
            </form>
            )}
          </div>

          {/* Trust Indicators */}
          <motion.div
            className="mt-6 flex items-center justify-center gap-6"
            {...stagger}
            {...staggerDelay(6)}
          >
            {trustIndicators.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
