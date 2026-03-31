import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Building2,
  KeyRound,
  Users,
} from "lucide-react";

import { toast } from "sonner";
import { showDemoAccountRecoveryUi } from "@/lib/feature-flags";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trustIndicators = [
  { icon: ShieldCheck, label: "256-bit Encrypted" },
  { icon: KeyRound, label: "Enterprise Security" },
  { icon: Users, label: "Role-Based Access" },
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const prefersReduced = useReducedMotion();

  const sessionExpired = searchParams.get("expired") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; server?: string }>(
    {}
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_REGEX.test(email))
      next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      await login(email.trim(), password, rememberMe);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isUnauthorized) {
          setErrors({ server: "Invalid email or password. Please try again." });
        } else if (err.isForbidden) {
          setErrors({ server: "Your account has been suspended. Please contact your administrator." });
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
                Login
              </h1>
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
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

              {/* Sign In */}
              <motion.div {...stagger} {...staggerDelay(4)}>
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

              {showDemoAccountRecoveryUi() && (
                <>
                  {/* SSO Divider */}
                  <motion.div
                    className="relative flex items-center py-1"
                    {...stagger}
                    {...staggerDelay(5)}
                  >
                    <div className="flex-1 border-t border-border" />
                    <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      or
                    </span>
                    <div className="flex-1 border-t border-border" />
                  </motion.div>

                  {/* SSO Button (demo / optional deployment) */}
                  <motion.div {...stagger} {...staggerDelay(6)}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-[10px] border-border text-[13px] font-medium text-foreground transition-all duration-200 hover:bg-muted hover:border-border"
                      onClick={() => toast.info("SSO integration is not wired in this demo build.")}
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Sign in with SSO
                    </Button>
                  </motion.div>
                </>
              )}
            </form>
          </div>

          {/* Trust Indicators */}
          <motion.div
            className="mt-6 flex items-center justify-center gap-6"
            {...stagger}
            {...staggerDelay(7)}
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
