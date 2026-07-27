"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        const role = data?.user?.role;

        if (role === "DRIVER") router.push("/daily-report/driver");
        else if (role === "SALES_REP") router.push("/daily-report/rep");
        else if (role === "CASHIER") router.push("/cashier");
        else router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#0E1512" }}>
      {/* ── LEFT 2/3 — Branding ── */}
      <div className="hidden lg:flex lg:w-2/3 relative overflow-hidden flex-col justify-center items-center p-12">
        {/* Animated route SVG */}
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 1200 800"
          style={{ opacity: 0.16 }}
        >
          <path
            className="route-line"
            d="M -50 620 L 180 620 L 260 520 L 500 520 L 560 420 L 820 420 L 900 300 L 1250 300"
          />
          <path
            className="route-line-slow"
            d="M -50 180 L 220 180 L 300 260 L 540 260 L 610 360 L 900 360 L 970 480 L 1250 480"
          />
          <path
            className="route-line-dashed"
            d="M -50 720 L 150 720 L 210 660 L 430 660"
          />
          <circle className="route-node" cx="260" cy="520" r="3" />
          <circle className="route-node" cx="560" cy="420" r="3" />
          <circle className="route-node" cx="900" cy="300" r="3" />
          <circle className="route-node" cx="300" cy="260" r="3" />
          <circle className="route-node" cx="610" cy="360" r="3" />
          <circle className="route-node" cx="970" cy="480" r="3" />
        </svg>

        {/* Content */}
        <div className="relative z-10 max-w-lg text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div
              className="w-10 h-10 border flex items-center justify-center"
              style={{
                borderColor: "#C9A227",
                color: "#C9A227",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              N
            </div>
            <span
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "28px",
                color: "#EDE8DD",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Nampark
            </span>
          </div>

          <h2
            className="mb-4"
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "36px",
              color: "#EDE8DD",
              lineHeight: 1.2,
            }}
          >
            Route Management System
          </h2>

          <p
            className="mb-8"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "15px",
              color: "#8A9690",
              lineHeight: 1.7,
            }}
          >
            Streamline your FMCG distribution across 8 routes. Track daily
            assignments, monitor fleet performance, and generate real-time
            reports for AnswerPort Ltd / Kanini Haraka Enterprises.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {["Daily Tracking", "Fleet Management", "Performance Reports", "Return Analysis"].map(
              (label) => (
                <span
                  key={label}
                  className="px-4 py-2 text-xs"
                  style={{
                    background: "#182019",
                    border: "1px solid #26312B",
                    color: "#8A9690",
                    fontFamily: "'IBM Plex Mono', monospace",
                    letterSpacing: "0.5px",
                  }}
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT 1/3 — Login Panel ── */}
      <div
        className="w-full lg:w-1/3 flex flex-col justify-center items-center p-8 relative"
        style={{ background: "#141C18" }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div
            className="w-8 h-8 border flex items-center justify-center"
            style={{
              borderColor: "#C9A227",
              color: "#C9A227",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            N
          </div>
          <span
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "20px",
              color: "#EDE8DD",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            Nampark
          </span>
        </div>

        {/* Status pill */}
        <div
          className="flex items-center gap-2 mb-6"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.6px",
            color: "#8A9690",
          }}
        >
          <span className="status-dot" />
          62 ROUTES · NAMPARK BRANCH · SYSTEM ONLINE
        </div>

        {/* Login card */}
        <div className="login-card w-full max-w-sm">
          <div className="mb-6">
            <h3
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: "18px",
                fontWeight: 500,
                color: "#EDE8DD",
                letterSpacing: "0.3px",
              }}
            >
              Sign in to your account
            </h3>
            <p
              className="mt-1"
              style={{ fontSize: "13px", color: "#8A9690" }}
            >
              Route Management System
            </p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 text-sm" style={{ background: "rgba(220,38,38,0.1)", color: "#fca5a5", border: "1px solid rgba(220,38,38,0.2)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                className="block mb-2"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.9px",
                  color: "#5C665F",
                  textTransform: "uppercase",
                }}
              >
                Work email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@answerport.co.ke"
                autoComplete="username"
                className="login-input"
                required
              />
            </div>

            <div className="mb-4">
              <label
                className="block mb-2"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.9px",
                  color: "#5C665F",
                  textTransform: "uppercase",
                }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="login-input pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pw-toggle"
                >
                  {showPassword ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6 text-xs" style={{ color: "#8A9690" }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-[#C9A227]"
                />
                Stay signed in
              </label>
              <a
                href="#"
                className="hover:underline"
                style={{ color: "#C9A227" }}
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="divider" />

          <div
            className="flex justify-between"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: "#5C665F",
            }}
          >
            <span>ANSWERPORT LTD</span>
            <span>SYSTEM v1.0</span>
          </div>
        </div>

        <p
          className="mt-6 text-center"
          style={{
            fontSize: "11px",
            color: "#5C665F",
            lineHeight: 1.6,
          }}
        >
          Nampark Branch Operations, on behalf of
          <br />
          Kanini Haraka Enterprises
        </p>
      </div>
    </div>
  );
}
