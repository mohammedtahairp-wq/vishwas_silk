import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { firebaseAuth } from "../config/firebase";
import { useAuth } from "../auth/AuthContext";
import { apiErrorMessage } from "../api/client";

type Step = "phone" | "otp";

export function LoginPage() {
  const { loginWithPhone } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      recaptchaVerifier.current?.clear();
    };
  }, []);

  function ensureRecaptcha() {
    if (!recaptchaVerifier.current && recaptchaContainerRef.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(firebaseAuth, recaptchaContainerRef.current, {
        size: "invisible",
      });
    }
    return recaptchaVerifier.current!;
  }

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const verifier = ensureRecaptcha();
      const fullPhone = `+91${phone.trim()}`;
      const result = await signInWithPhoneNumber(firebaseAuth, fullPhone, verifier);
      setConfirmationResult(result);
      setStep("otp");
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to send OTP. Please check the phone number."));
      recaptchaVerifier.current?.clear();
      recaptchaVerifier.current = null;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!confirmationResult) return;
    setError(null);
    setSubmitting(true);
    try {
      await confirmationResult.confirm(otp);
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error("Not authenticated with Firebase");
      const idToken = await user.getIdToken();
      const role = await loginWithPhone(idToken);
      navigate(`/${role}`, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid OTP. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    setStep("phone");
    setOtp("");
    setError(null);
    setConfirmationResult(null);
    recaptchaVerifier.current?.clear();
    recaptchaVerifier.current = null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #f1f5f9 0%, #d1fae5 50%, #ecfdf5 100%" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30" style={{ background: "linear-gradient(135deg, #34d399, #6ee7b7)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, #10b981, transparent)" }} />
      </div>

      <div ref={recaptchaContainerRef} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md mx-4 relative z-10"
      >
        <div className="rounded-3xl border border-white/60 p-8 md:p-10" style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 8px 32px rgba(16, 185, 129, 0.1), 0 1px 3px rgba(0,0,0,0.05)" }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <img src="/logo.jpeg" alt="VISHWAS SILK" className="h-24 w-auto" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#064e3b" }}>VISHWAS SILK</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              {step === "phone" ? "Sign in with your phone number" : `Enter the OTP sent to +91${phone}`}
            </p>
          </motion.div>

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Phone Number</label>
                <div className="flex">
                  <span className="flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl text-sm font-medium text-gray-500" style={{ background: "rgba(255,255,255,0.7)" }}>+91</span>
                  <input
                    className="flex-1 border border-gray-200 rounded-r-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.7)" }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    required
                    autoFocus
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                  />
                </div>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium"
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting || phone.length !== 10}
                className="w-full text-white rounded-xl py-3 font-bold text-sm tracking-wide disabled:opacity-50 transition-all duration-200"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 16px rgba(5, 150, 105, 0.35)" }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending OTP...
                  </span>
                ) : (
                  "Get OTP"
                )}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Verification Code</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.7)" }}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  required
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                />
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex gap-3">
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  type="button"
                  onClick={handleBack}
                  className="flex-1 rounded-xl py-3 font-bold text-sm tracking-wide border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  Change Number
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting || otp.length !== 6}
                  className="flex-[2] text-white rounded-xl py-3 font-bold text-sm tracking-wide disabled:opacity-50 transition-all duration-200"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 16px rgba(5, 150, 105, 0.35)" }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    "Verify & Sign In"
                  )}
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
