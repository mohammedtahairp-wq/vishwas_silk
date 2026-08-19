import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import { apiClient, apiErrorMessage } from "../api/client";

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
  }
}

export function LoginPage() {
  const { loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const widgetInitRef = useRef(false);

  useEffect(() => {
    if (document.getElementById("msg91-widget-script")) return;

    const script = document.createElement("script");
    script.id = "msg91-widget-script";
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  async function handleSendOtp() {
    setError(null);
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!window.initSendOTP) {
      setError("OTP service is loading. Please wait a moment and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await apiClient.post<{ registered: boolean }>("/auth/check-phone", { phone });
      if (!data.registered) {
        setError("This phone number is not registered. Please contact admin.");
        setSubmitting(false);
        return;
      }
      widgetInitRef.current = false;
      tryInitWidget();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to verify phone. Please try again."));
      setSubmitting(false);
    }
  }

  function tryInitWidget() {
    if (widgetInitRef.current) return;

    if (!window.initSendOTP) {
      setTimeout(tryInitWidget, 300);
      return;
    }

    widgetInitRef.current = true;

    window.initSendOTP({
      widgetId: "366873666f70363331363236",
      tokenAuth: "562052TL8m0XmAw6a854b16P1",
      identifier: `91${phone}`,
      success: async (data: Record<string, unknown>) => {
        try {
          const widgetToken =
            (data.message as string) ||
            (data.token as string) ||
            (data.access_token as string) ||
            JSON.stringify(data);
          const role = await loginWithOtp(widgetToken, phone);
          navigate(`/${role}`, { replace: true });
        } catch (err) {
          setError(apiErrorMessage(err, "Login failed. Please try again."));
          setSubmitting(false);
        }
      },
      failure: (err: Record<string, unknown>) => {
        setError(
          (err.message as string) ||
            (err.error as string) ||
            "OTP verification failed. Please try again."
        );
        setSubmitting(false);
      },
    });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #f1f5f9 0%, #d1fae5 50%, #ecfdf5 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30"
          style={{ background: "linear-gradient(135deg, #34d399, #6ee7b7)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #10b981, transparent)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md mx-4 relative z-10"
      >
        <div
          className="rounded-3xl border border-white/60 p-8 md:p-10"
          style={{
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow:
              "0 8px 32px rgba(16, 185, 129, 0.1), 0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
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
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "#064e3b" }}
            >
              VISHWAS SILK
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Sign in with your phone number
            </p>
          </motion.div>

          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Phone Number
              </label>
              <div className="flex">
                <span
                  className="flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl text-sm font-medium text-gray-500"
                  style={{ background: "rgba(255,255,255,0.7)" }}
                >
                  +91
                </span>
                <input
                  className="flex-1 border border-gray-200 rounded-r-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.7)" }}
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="Enter 10-digit number"
                  required
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  disabled={submitting}
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
              onClick={handleSendOtp}
              disabled={submitting || phone.length !== 10}
              className="w-full text-white rounded-xl py-3 font-bold text-sm tracking-wide disabled:opacity-50 transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #059669, #10b981)",
                boxShadow: "0 4px 16px rgba(5, 150, 105, 0.35)",
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading widget...
                </span>
              ) : (
                "Send OTP"
              )}
            </motion.button>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400 font-medium">
            The MSG91 OTP widget will appear above after clicking.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
