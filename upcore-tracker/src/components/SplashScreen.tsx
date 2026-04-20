import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BOOT_MESSAGES = [
  "CONNECTING TO MONGODB...",
  "LOADING CLUB ROSTER...",
  "SYNCING BRAWLTOOLS DATA...",
  "INITIALIZING POLLER...",
  "ALL SYSTEMS ONLINE",
];

function OrbitRing({ radius, duration, delay, opacity }: { radius: number; duration: number; delay: number; opacity: number }) {
  return (
    <motion.div
      className="absolute rounded-full border border-primary/20"
      style={{
        width: radius * 2,
        height: radius * 2,
        top: "50%",
        left: "50%",
        x: "-50%",
        y: "-50%",
        opacity,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    >
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.8)]"
        style={{ top: -3, left: "50%", x: "-50%" }}
      />
    </motion.div>
  );
}

function GridBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none"
      initial={{ top: "0%" }}
      animate={{ top: "100%" }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    />
  );
}

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const totalDuration = 2600;
    const msgInterval = totalDuration / BOOT_MESSAGES.length;

    const msgTimer = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, BOOT_MESSAGES.length - 1));
    }, msgInterval);

    const progressTimer = setInterval(() => {
      setProgress((p) => {
        const next = p + 2;
        return next > 100 ? 100 : next;
      });
    }, totalDuration / 50);

    const exitTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, 600);
    }, totalDuration + 200);

    return () => {
      clearInterval(msgTimer);
      clearInterval(progressTimer);
      clearTimeout(exitTimer);
    };
  }, [onDone]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
        >
          <GridBackground />
          <ScanLine />

          {/* Radial glow behind logo */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 480,
              height: 480,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(ellipse at center, hsl(var(--primary)/0.12) 0%, transparent 70%)",
            }}
          />

          {/* Orbit rings */}
          <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
            <OrbitRing radius={90}  duration={8}  delay={0}   opacity={0.6} />
            <OrbitRing radius={130} duration={14} delay={-4}  opacity={0.35} />
            <OrbitRing radius={170} duration={20} delay={-8}  opacity={0.2} />
          </div>

          {/* Center content */}
          <div className="relative flex flex-col items-center gap-5 z-10">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative"
            >
              <div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: "hsl(var(--primary)/0.35)", transform: "scale(1.4)" }}
              />
              <motion.img
                src="/upcore-logo-nobg.png"
                alt="UPCore"
                className="relative w-20 h-20 object-contain"
                style={{ filter: "brightness(0) invert(1) drop-shadow(0 0 16px hsl(var(--primary)/0.9))" }}
                animate={{ filter: [
                  "brightness(0) invert(1) drop-shadow(0 0 16px hsl(var(--primary)/0.6))",
                  "brightness(0) invert(1) drop-shadow(0 0 28px hsl(var(--primary)/1))",
                  "brightness(0) invert(1) drop-shadow(0 0 16px hsl(var(--primary)/0.6))",
                ] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>

            {/* Title */}
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="font-display font-black text-white tracking-[0.25em] text-4xl uppercase"
              >
                {"UPCORE".split("").map((ch, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.35 }}
                    className="inline-block"
                  >
                    {ch}
                  </motion.span>
                ))}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.5em" }}
                animate={{ opacity: 1, letterSpacing: "0.45em" }}
                transition={{ delay: 0.75, duration: 0.5 }}
                className="font-mono text-primary text-[11px] tracking-[0.45em] uppercase mt-1"
              >
                CLUB TRACKER
              </motion.p>
            </div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 240 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              className="relative"
            >
              <div className="h-px w-60 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <motion.p
                  key={msgIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-mono text-[9px] text-primary/70 tracking-widest"
                >
                  {BOOT_MESSAGES[msgIndex]}
                </motion.p>
                <p className="font-mono text-[9px] text-white/30 tracking-widest">{progress}%</p>
              </div>
            </motion.div>
          </div>

          {/* Corner decorations */}
          {[
            "top-4 left-4 border-t border-l",
            "top-4 right-4 border-t border-r",
            "bottom-4 left-4 border-b border-l",
            "bottom-4 right-4 border-b border-r",
          ].map((cls) => (
            <motion.div
              key={cls}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className={`absolute w-8 h-8 border-primary/30 ${cls}`}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
