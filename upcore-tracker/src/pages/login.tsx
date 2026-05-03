import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/api";
import {
  Lock, Mail, Loader2, AlertCircle, Eye, EyeOff, ArrowRight, ArrowLeft,
  CheckCircle2, Menu, X,
  Activity, LayoutDashboard, Trophy, Search, BarChart2, Info, LogIn, Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Panel = "login" | "forgot" | "verify" | "newpass";

const panelVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.28, ease: "easeOut" } },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }),
};

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const styles: Record<string, string> = {
    tl: "top-0 left-0 border-t-2 border-l-2",
    tr: "top-0 right-0 border-t-2 border-r-2",
    bl: "bottom-0 left-0 border-b-2 border-l-2",
    br: "bottom-0 right-0 border-b-2 border-r-2",
  };
  return <div className={`absolute w-5 h-5 pointer-events-none ${styles[pos]}`} style={{ borderColor: "rgba(255,255,255,0.25)" }} />;
}

const NAV_ITEMS = [
  { href: "/",            label: "Command Center", icon: Home },
  { href: "/logs",        label: "Activity Logs",  icon: Activity },
  { href: "/overview",    label: "Club Overview",  icon: LayoutDashboard },
  { href: "/leaderboard", label: "Leaderboard",    icon: Trophy },
  { href: "/lookup",      label: "Lookup",         icon: Search },
  { href: "/stats",       label: "Stats",          icon: BarChart2 },
  { href: "/about",       label: "About",          icon: Info },
  { href: "/login",       label: "Log in",         icon: LogIn },
];

// ── OTP Box Input ───────────────────────────────────────────────────
interface OtpBoxesProps {
  digits: string[];
  onChange: (digits: string[]) => void;
  onComplete: (code: string) => void;
  status: "idle" | "checking" | "error";
  disabled?: boolean;
}

function OtpBoxes({ digits, onChange, onComplete, status, disabled }: OtpBoxesProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => refs.current[i]?.focus();

  const handleChange = (i: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    onChange(next);
    if (d) {
      if (i < 5) focus(i + 1);
      else if (next.every(x => x !== "")) onComplete(next.join(""));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = [...digits]; next[i] = ""; onChange(next);
      } else if (i > 0) {
        const next = [...digits]; next[i - 1] = ""; onChange(next);
        focus(i - 1);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      focus(i - 1); e.preventDefault();
    } else if (e.key === "ArrowRight" && i < 5) {
      focus(i + 1); e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = ["", "", "", "", "", ""];
    text.split("").forEach((c, i) => { next[i] = c; });
    onChange(next);
    const lastFilled = Math.min(text.length, 5);
    focus(lastFilled);
    if (text.length === 6) onComplete(text);
  };

  const boxColor = (i: number) => {
    if (status === "error") return "rgba(239,68,68,0.5)";
    if (status === "checking") return "rgba(255,255,255,0.3)";
    if (digits[i]) return "rgba(255,255,255,0.35)";
    return "rgba(255,255,255,0.1)";
  };

  const boxBg = (i: number) => {
    if (status === "error") return "rgba(220,38,38,0.08)";
    if (digits[i]) return "rgba(255,255,255,0.04)";
    return "transparent";
  };

  return (
    <div className="flex items-center justify-center gap-2.5">
      {digits.map((d, i) => (
        <div key={i} className="relative">
          <input
            ref={el => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={e => e.target.select()}
            disabled={disabled || status === "checking"}
            className="w-11 h-14 text-center text-xl font-mono font-bold text-white focus:outline-none transition-all duration-150 disabled:opacity-40"
            style={{
              background: boxBg(i),
              border: `1.5px solid ${boxColor(i)}`,
              borderRadius: 3,
              caretColor: "transparent",
            }}
          />
          {/* Cursor line when focused and empty */}
          {!d && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-px bg-white/20 pointer-events-none" />
          )}
        </div>
      ))}
    </div>
  );
}

const OTP_SESSION_KEY = "upcore_otp_session";

interface OtpSession {
  panel: "verify" | "newpass";
  email: string;
  otpExpiry: number;
}

function saveOtpSession(data: OtpSession) {
  try { sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify(data)); } catch {}
}
function clearOtpSession() {
  try { sessionStorage.removeItem(OTP_SESSION_KEY); } catch {}
}
function loadOtpSession(): OtpSession | null {
  try {
    const raw = sessionStorage.getItem(OTP_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as OtpSession;
    if (data.otpExpiry <= Date.now()) { clearOtpSession(); return null; }
    return data;
  } catch { return null; }
}

// ── Main Component ──────────────────────────────────────────────────
export default function Login() {
  const { login, admin } = useAuth();
  const [location, navigate] = useLocation();

  // Restore session from sessionStorage on first render
  const restored = loadOtpSession();

  const [panel, setPanel] = useState<Panel>(restored?.panel ?? "login");
  const [dir, setDir] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Login
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);

  // Forgot
  const [forgotEmail, setForgotEmail] = useState(restored?.email ?? "");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotErr, setForgotErr]   = useState<string | null>(null);

  // Verify (OTP boxes)
  const [digits, setDigits]         = useState<string[]>(["","","","","",""]);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "checking" | "error">("idle");
  const [verifyErr, setVerifyErr]   = useState<string | null>(null);

  // New password
  const [newPass, setNewPass]       = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetErr, setResetErr]     = useState<string | null>(null);
  const [resetDone, setResetDone]   = useState(false);

  // Countdown
  const [otpExpiry, setOtpExpiry]   = useState<number | null>(restored?.otpExpiry ?? null);
  const [secsLeft, setSecsLeft]     = useState(0);

  useEffect(() => {
    if (!otpExpiry) return;
    const tick = () => setSecsLeft(Math.max(0, Math.round((otpExpiry - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [otpExpiry]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (admin) navigate("/admin", { replace: true }); }, [admin, navigate]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const goTo = (next: Panel, direction: number) => {
    setDir(direction);
    setPanel(next);
    if (next === "login") clearOtpSession();
  };
  const codeExpired = secsLeft === 0 && !!otpExpiry;

  // ── Handlers ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setLoginErr(err instanceof Error ? err.message : "Login failed");
    } finally { setSubmitting(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr(null);
    setForgotLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const expiry = Date.now() + 5 * 60 * 1000;
      setOtpExpiry(expiry);
      setDigits(["","","","","",""]);
      setVerifyErr(null);
      setVerifyStatus("idle");
      saveOtpSession({ panel: "verify", email: forgotEmail.trim(), otpExpiry: expiry });
      setTimeout(() => goTo("verify", 1), 100);
    } catch (err) {
      setForgotErr(err instanceof Error ? err.message : "Failed to send code");
    } finally { setForgotLoading(false); }
  };

  const handleVerifyOtp = useCallback(async (code: string) => {
    setVerifyStatus("checking");
    setVerifyErr(null);
    try {
      const res = await fetch(getApiUrl("/api/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: code }),
      });
      const data = await res.json() as { valid?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      setVerifyStatus("idle");
      if (otpExpiry) saveOtpSession({ panel: "newpass", email: forgotEmail.trim(), otpExpiry });
      setTimeout(() => goTo("newpass", 1), 250);
    } catch (err) {
      setVerifyStatus("error");
      setVerifyErr(err instanceof Error ? err.message : "Invalid code");
      setTimeout(() => {
        setDigits(["","","","","",""]);
        setVerifyStatus("idle");
      }, 1200);
    }
  }, [forgotEmail]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr(null);
    if (newPass !== confirmPass) {
      setResetErr("Passwords do not match");
      return;
    }
    if (newPass.length < 6) {
      setResetErr("Password must be at least 6 characters");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: digits.join(""), newPassword: newPass }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      clearOtpSession();
      setResetDone(true);
    } catch (err) {
      setResetErr(err instanceof Error ? err.message : "Reset failed");
    } finally { setResetLoading(false); }
  };

  // ── Styles ──
  const labelCls    = `text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 block mb-2`;
  const inputWrap   = `flex items-center gap-3 px-4 py-3.5 bg-black border border-white/8 focus-within:border-white/35 focus-within:bg-white/[0.02] transition-all`;
  const fieldCls    = `bg-transparent text-sm text-white placeholder-white/15 focus:outline-none w-full font-mono tracking-wide`;
  const errCls      = `flex items-start gap-2 px-3 py-2.5 border text-xs font-mono bg-red-950/40 border-red-500/25 text-red-300`;
  const btnPrimary  = `w-full flex items-center justify-center gap-3 py-4 text-xs font-black uppercase tracking-[0.25em] transition-all`;

  // Recovery flow step dots
  const recoveryPanels: Panel[] = ["forgot", "verify", "newpass"];
  const showDots = panel !== "login";
  const dotIdx = recoveryPanels.indexOf(panel);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 50 }}>

      {/* Video Background */}
      <video
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        src="/login-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      {/* Dark overlay so card stays readable */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.58)" }} />
      {/* Subtle grid texture on top of video */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          repeating-linear-gradient(0deg,transparent,transparent 47px,rgba(255,255,255,0.018) 47px,rgba(255,255,255,0.018) 48px),
          repeating-linear-gradient(90deg,transparent,transparent 47px,rgba(255,255,255,0.018) 47px,rgba(255,255,255,0.018) 48px)
        `,
      }} />
      {/* Edge vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 80% at 50% 50%,transparent 20%,rgba(0,0,0,0.65) 100%)",
      }} />
      {/* Scan-line sweep */}
      <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.07) 50%,transparent)" }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Hamburger */}
      <motion.button
        onClick={() => setDrawerOpen(true)}
        className="absolute top-6 right-6 z-10 flex flex-col gap-[5px] p-1.5 text-white/50 hover:text-white transition-colors group"
        aria-label="Open navigation"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : 8 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <span className="block w-5 h-[1.5px] bg-current group-hover:bg-white transition-all" />
        <span className="block w-5 h-[1.5px] bg-current group-hover:bg-white transition-all" />
        <span className="block w-5 h-[1.5px] bg-current group-hover:bg-white transition-all" />
      </motion.button>

      {/* Drawer backdrop */}
      <div
        className="fixed inset-0 transition-all duration-300"
        style={{
          zIndex: 60,
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "all" : "none",
          background: "rgba(0,0,0,0.75)",
          backdropFilter: drawerOpen ? "blur(4px)" : "none",
        }}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-72 flex flex-col" style={{
        zIndex: 70,
        transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        background: "#080808",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/5 shrink-0">
          <div>
            <div className="text-[10px] font-mono text-white/40 tracking-[0.35em] uppercase">Navigation</div>
            <div className="font-display font-black text-white text-base tracking-[0.12em] uppercase leading-none mt-0.5">UPCORE</div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="text-white/40 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_ITEMS.map((item, idx) => {
            const isActive = location === item.href;
            const isSep = idx === NAV_ITEMS.length - 1;
            return (
              <React.Fragment key={item.href}>
                {isSep && <div className="my-3 border-t border-white/5" />}
                <Link href={item.href}>
                  <div onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3.5 px-4 py-3.5 mb-0.5 text-sm font-medium tracking-wider uppercase cursor-pointer transition-all duration-150 border-l-2",
                      isActive ? "text-white bg-white/6 border-white" : "text-white/45 hover:text-white hover:bg-white/4 border-transparent"
                    )}>
                    <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-white/30")} />
                    {item.label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </Link>
              </React.Fragment>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-white/5 shrink-0">
          <p className="text-[10px] font-mono text-white/20 tracking-[0.3em] uppercase">#RISEUP · UPCORE TRACKER</p>
        </div>
      </div>

      {/* Card */}
      <motion.div
        className="relative w-full max-w-[440px] mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="absolute -inset-px pointer-events-none" style={{
          background: "linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 50%,rgba(255,255,255,0.03) 100%)",
        }} />

        <div className="relative" style={{ background: "rgba(8,8,8,0.98)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="h-px w-full" style={{
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.5) 30%,rgba(255,255,255,0.5) 70%,transparent)",
          }} />

          {/* Header */}
          <div className="relative px-10 pt-10 pb-7 text-center">
            <Corner pos="tl" /><Corner pos="tr" />
            <p className="text-[11px] font-mono text-white/25 tracking-[0.45em] uppercase mb-5">UPCORE ESPORTS</p>
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="absolute inset-0 blur-xl opacity-20" style={{ background: "#fff", borderRadius: "50%" }} />
                <img src="/upcore-logo-nobg.png" alt="UPCore" className="relative h-12 w-12 object-contain"
                  style={{ filter: "brightness(0) invert(1)" }} />
              </div>
            </div>
            <h1 className="text-white uppercase leading-none mb-1"
              style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: "2.4rem", letterSpacing: "0.15em" }}>
              {panel === "login" ? "Tracker Portal" : panel === "forgot" ? "Key Recovery" : panel === "verify" ? "Verify Code" : "New Password"}
            </h1>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
              <p className="text-[11px] font-mono text-white/30 tracking-[0.35em] uppercase">
                {panel === "login" ? "Club Intelligence System" : panel === "forgot" ? "Identity Verification" : panel === "verify" ? "One-Time Code" : "Set New Access Key"}
              </p>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
          </div>

          {/* Panels */}
          <div className="px-10 pb-8 overflow-hidden" style={{ minHeight: 280 }}>
            <AnimatePresence custom={dir} mode="wait">

              {/* ── LOGIN ── */}
              {panel === "login" && (
                <motion.form key="login" custom={dir} variants={panelVariants} initial="enter" animate="center" exit="exit"
                  onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelCls}>Email Address</label>
                    <div className={inputWrap}>
                      <Mail className="w-3.5 h-3.5 text-white/20 shrink-0" />
                      <input type="email" required autoComplete="email" value={email}
                        onChange={e => setEmail(e.target.value)} placeholder="operator@upcore.gg" className={fieldCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Secret Key</label>
                    <div className={inputWrap}>
                      <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                      <input type={showPass ? "text" : "password"} required autoComplete="current-password"
                        value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={fieldCls} />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="text-white/15 hover:text-white/50 transition-colors shrink-0">
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {loginErr && <div className={errCls}><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{loginErr}</div>}
                  <button type="submit" disabled={submitting} className={`${btnPrimary} mt-1 disabled:opacity-40`}
                    style={{ background: submitting ? "rgba(255,255,255,0.05)" : "#fff", color: submitting ? "#fff" : "#000", border: submitting ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                    {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Authenticating…</> : <><span>Authorize Access</span><ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                  <button type="button" onClick={() => goTo("forgot", -1)}
                    className="w-full text-center text-[12px] font-mono text-white/30 hover:text-white/60 transition-colors pt-1 tracking-[0.2em] uppercase">
                    Forgot Key?
                  </button>
                </motion.form>
              )}

              {/* ── FORGOT ── */}
              {panel === "forgot" && (
                <motion.form key="forgot" custom={dir} variants={panelVariants} initial="enter" animate="center" exit="exit"
                  onSubmit={handleForgot} className="space-y-4">
                  <p className="text-[12px] font-mono text-white/35 leading-relaxed border-l-2 border-white/10 pl-3">
                    Enter your registered email address. A 6-digit code will be dispatched.
                  </p>
                  <div>
                    <label className={labelCls}>Registered Email</label>
                    <div className={inputWrap}>
                      <Mail className="w-3.5 h-3.5 text-white/20 shrink-0" />
                      <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        placeholder="operator@upcore.gg" className={fieldCls} />
                    </div>
                  </div>
                  {forgotErr && <div className={errCls}><AlertCircle className="w-3.5 h-3.5 shrink-0" />{forgotErr}</div>}
                  <button type="submit" disabled={forgotLoading} className={`${btnPrimary} disabled:opacity-40`}
                    style={{ background: "#fff", color: "#000", border: "none" }}>
                    {forgotLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</> : <><span>Send Recovery Code</span><ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                  <button type="button" onClick={() => goTo("login", 1)}
                    className="w-full flex items-center justify-center gap-1.5 text-[12px] font-mono text-white/30 hover:text-white/60 transition-colors tracking-[0.15em] uppercase">
                    <ArrowLeft className="w-3 h-3" /> Return to Login
                  </button>
                </motion.form>
              )}

              {/* ── VERIFY (6-box OTP) ── */}
              {panel === "verify" && (
                <motion.div key="verify" custom={dir} variants={panelVariants} initial="enter" animate="center" exit="exit"
                  className="space-y-5">

                  {/* Countdown */}
                  <div className={`flex items-center justify-between px-3 py-2 border font-mono text-xs ${
                    codeExpired ? "border-red-500/30 bg-red-950/30 text-red-400"
                    : secsLeft < 60 ? "border-amber-500/30 bg-amber-950/20 text-amber-400"
                    : "border-white/8 bg-white/[0.02] text-white/40"
                  }`}>
                    <span className="tracking-[0.15em] uppercase text-[10px]">{codeExpired ? "Code expired" : "Code expires in"}</span>
                    <span className="tabular-nums tracking-[0.2em]">
                      {codeExpired ? "—" : `${String(Math.floor(secsLeft / 60)).padStart(2, "0")}:${String(secsLeft % 60).padStart(2, "0")}`}
                    </span>
                  </div>

                  {codeExpired ? (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-[12px] font-mono text-red-400/80">This code has expired. Please request a new one.</p>
                      <button onClick={() => { goTo("forgot", -1); setOtpExpiry(null); setDigits(["","","","","",""]); }}
                        className="text-[12px] font-mono text-white/40 hover:text-white transition-colors tracking-[0.15em] uppercase">
                        ← Request new code
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        <p className="text-[12px] font-mono text-white/35 mb-5">
                          Code sent to <span className="text-white/60">{forgotEmail}</span>
                        </p>
                        <OtpBoxes
                          digits={digits}
                          onChange={setDigits}
                          onComplete={handleVerifyOtp}
                          status={verifyStatus}
                          disabled={codeExpired}
                        />
                        {verifyStatus === "checking" && (
                          <p className="mt-4 text-[11px] font-mono text-white/35 flex items-center justify-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> Verifying…
                          </p>
                        )}
                        {verifyErr && (
                          <p className="mt-4 text-[12px] font-mono text-red-400 flex items-center justify-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />{verifyErr}
                          </p>
                        )}
                        {!verifyErr && verifyStatus === "idle" && (
                          <p className="mt-4 text-[11px] font-mono text-white/20">
                            Code auto-submits when all 6 digits are entered
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={() => { goTo("forgot", -1); setDigits(["","","","","",""]); setVerifyErr(null); }}
                        className="w-full flex items-center justify-center gap-1.5 text-[12px] font-mono text-white/30 hover:text-white/60 transition-colors tracking-[0.15em] uppercase">
                        <ArrowLeft className="w-3 h-3" /> Back
                      </button>
                    </>
                  )}
                </motion.div>
              )}

              {/* ── NEW PASSWORD ── */}
              {panel === "newpass" && (
                <motion.form key="newpass" custom={dir} variants={panelVariants} initial="enter" animate="center" exit="exit"
                  onSubmit={handleReset} className="space-y-4">

                  {resetDone ? (
                    <div className="py-6 text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="w-14 h-14 flex items-center justify-center border border-white/15" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <CheckCircle2 className="w-7 h-7 text-white/70" />
                        </div>
                      </div>
                      <div>
                        <p className="text-[13px] font-mono text-white/70 tracking-wide">Password updated.</p>
                        <p className="text-[11px] font-mono text-white/30 mt-1">Your new access key is now active.</p>
                      </div>
                      <button type="button"
                        onClick={() => { goTo("login", 1); setDigits(["","","","","",""]); setNewPass(""); setConfirmPass(""); setResetDone(false); setOtpExpiry(null); }}
                        className={`${btnPrimary}`} style={{ background: "#fff", color: "#000", border: "none" }}>
                        <span>Log in now</span><ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[12px] font-mono text-white/35 border-l-2 border-white/10 pl-3 leading-relaxed">
                        Code verified. Set a new password for your account.
                      </p>
                      <div>
                        <label className={labelCls}>New Password</label>
                        <div className={inputWrap}>
                          <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                          <input type={showNew ? "text" : "password"} required minLength={6}
                            value={newPass} onChange={e => setNewPass(e.target.value)}
                            placeholder="min 6 characters" className={fieldCls} autoFocus />
                          <button type="button" onClick={() => setShowNew(v => !v)} className="text-white/15 hover:text-white/50 transition-colors shrink-0">
                            {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Confirm New Password</label>
                        <div className={`${inputWrap} ${confirmPass && confirmPass !== newPass ? "border-red-500/40" : confirmPass && confirmPass === newPass ? "border-emerald-500/30" : ""}`}>
                          <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                          <input type={showConfirm ? "text" : "password"} required
                            value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                            placeholder="re-enter password" className={fieldCls} />
                          <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-white/15 hover:text-white/50 transition-colors shrink-0">
                            {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {confirmPass && confirmPass !== newPass && (
                          <p className="mt-1.5 text-[11px] font-mono text-red-400/80">Passwords do not match</p>
                        )}
                      </div>
                      {resetErr && <div className={errCls}><AlertCircle className="w-3.5 h-3.5 shrink-0" />{resetErr}</div>}
                      <button type="submit" disabled={resetLoading} className={`${btnPrimary} disabled:opacity-40`}
                        style={{ background: "#fff", color: "#000", border: "none" }}>
                        {resetLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><span>Save New Password</span><ArrowRight className="w-3.5 h-3.5" /></>}
                      </button>
                    </>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Progress dots (recovery flow only) */}
          <div className="flex items-center justify-center gap-2 pb-6" style={{ minHeight: 24 }}>
            {showDots && recoveryPanels.map((p, i) => (
              <div key={p} className="transition-all duration-300" style={{
                width: i === dotIdx ? 24 : 6,
                height: 1,
                background: i === dotIdx ? "rgba(255,255,255,0.7)" : i < dotIdx ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              }} />
            ))}
          </div>

          {/* Footer */}
          <div className="relative px-10 py-4 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <Corner pos="bl" /><Corner pos="br" />
            <p className="text-[11px] font-mono text-white/20 uppercase tracking-[0.4em]">
              #RISEUP · UPCORE TRACKER · AUTHORIZED ACCESS ONLY
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
