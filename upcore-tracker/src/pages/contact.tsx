import React, { useState, useRef } from "react";
import { Mail, MapPin, Send, CheckCircle, AlertCircle, Loader2, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { getApiUrl } from "@/api";

const CONTACT_EMAIL = "officialecoleaf@gmail.com";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" } }),
};

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(getApiUrl("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Server error");
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
      setErrorMsg("Failed to send. Please email us directly at " + CONTACT_EMAIL);
    }
  };

  const inputCls = `w-full bg-white/4 border border-white/10 text-white placeholder-white/25 px-4 py-3.5 font-mono text-sm focus:outline-none focus:border-white/30 transition-colors`;
  const labelCls = `text-[10px] font-mono uppercase tracking-[0.2em] text-white/45 block mb-1.5`;

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden">

      {/* ── Background ── */}
      <div className="absolute inset-0" style={{ background: "#090909" }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 10% 90%, rgba(30,15,50,0.8) 0%, transparent 55%),
          radial-gradient(ellipse 60% 80% at 90% 10%, rgba(15,25,40,0.7) 0%, transparent 55%),
          radial-gradient(ellipse 50% 50% at 50% 50%, rgba(8,8,12,0.9) 0%, transparent 70%)
        `,
      }} />
      {/* Swirl texture */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="ctSwirl">
            <feTurbulence type="turbulence" baseFrequency="0.01 0.007" numOctaves="5" seed="12" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="150" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
        {Array.from({ length: 30 }).map((_, i) => (
          <line key={i} x1="0" y1={`${i * 3.5}%`} x2="100%" y2={`${i * 3.5}%`}
            stroke="#aaa" strokeWidth="0.4" style={{ filter: "url(#ctSwirl)" }} />
        ))}
      </svg>

      <div className="relative max-w-6xl mx-auto px-6 sm:px-10 py-14 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* ── Left Column ── */}
          <div className="space-y-8">
            {/* Heading */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
              <h1
                className="font-black uppercase leading-none"
                style={{
                  fontSize: "clamp(2.8rem, 7vw, 4.5rem)",
                  fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                  letterSpacing: "0.04em",
                  lineHeight: 1.05,
                }}
              >
                <span className="text-white">GET IN </span>
                <span className="text-white/40">TOUCH</span>
              </h1>
              <div className="mt-3 h-[2px] w-20 bg-white/20" />
            </motion.div>

            {/* Description */}
            <motion.p
              variants={fadeUp} initial="hidden" animate="show" custom={1}
              className="text-white/55 text-base leading-relaxed font-mono max-w-md"
            >
              Have a question, proposal, or want to collaborate? We're always looking for new
              opportunities. Fill out the form and our team will get back to you within 24 hours.
            </motion.p>

            {/* Contact info */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 border border-white/12 bg-white/5 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-white/60" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35 mb-1">Email Us</p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-white/80 font-mono text-sm hover:text-white transition-colors"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 border border-white/12 bg-white/5 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.4194C45.5603 0.4017 45.468 0.4443 45.4204 0.5295C44.7963 1.6486 44.105 3.0699 43.6209 4.1892C38.1637 3.3738 32.7345 3.3738 27.3892 4.1892C26.905 3.0444 26.1886 1.6486 25.5617 0.5295C25.5141 0.4470 25.4218 0.4044 25.3294 0.4194C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9148 10.8048 4.9432 10.7825 4.9801C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4569 0.335386 45.5195 0.385761 45.5593C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4397C19.7295 52.5609 20.9469 50.5795 21.9907 48.4978C22.0523 48.3708 21.9935 48.2182 21.8676 48.1698C19.9366 47.4321 18.0979 46.5452 16.3292 45.5393C16.1893 45.4569 16.1781 45.2588 16.3068 45.1624C16.679 44.8886 17.0513 44.6035 17.4067 44.3156C17.471 44.2614 17.5605 44.2500 17.6362 44.2841C29.2558 49.6009 41.8354 49.6009 53.3179 44.2841C53.3935 44.2472 53.4831 44.2586 53.5502 44.3128C53.9057 44.6007 54.2779 44.8886 54.6529 45.1624C54.7816 45.2588 54.7732 45.4569 54.6333 45.5393C52.8646 46.5622 51.0259 47.4321 49.0921 48.1670C48.9662 48.2154 48.9102 48.3708 48.9718 48.4978C50.038 50.5767 51.2554 52.5581 52.5959 54.4369C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5593C70.6551 45.5195 70.6887 45.4597 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9829C60.1772 4.9432 60.1437 4.9148 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2534 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2534 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="rgba(255,255,255,0.75)"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35 mb-1">Discord</p>
                  <p className="text-white/80 font-mono text-sm">bittu00</p>
                </div>
              </div>
            </motion.div>

            {/* Footer tag */}
            <motion.p
              variants={fadeUp} initial="hidden" animate="show" custom={3}
              className="text-[10px] font-mono text-white/18 uppercase tracking-[0.3em] pt-4"
            >
              #RISEUP · UPCORE ESPORTS
            </motion.p>
          </div>

          {/* ── Right Column — Form card ── */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}>
            <div style={{
              background: "rgba(10,10,14,0.75)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderLeft: "3px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(20px)",
            }}>
              <div className="px-7 py-8 space-y-5">

                {/* Success state */}
                {status === "success" ? (
                  <div className="py-12 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 border border-white/15 bg-white/5 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-white/80" />
                    </div>
                    <div>
                      <h3
                        className="text-white font-black uppercase tracking-wider mb-1"
                        style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: "1.6rem" }}
                      >
                        Message Sent!
                      </h3>
                      <p className="text-white/40 font-mono text-xs">We'll get back to you within 24 hours.</p>
                    </div>
                    <button
                      onClick={() => setStatus("idle")}
                      className="mt-2 text-[10px] font-mono text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors"
                    >
                      Send another →
                    </button>
                  </div>
                ) : (
                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    {/* Name + Email row */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Name</label>
                        <input
                          type="text" required placeholder="Your Name"
                          value={form.name} onChange={set("name")}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Email</label>
                        <input
                          type="email" required placeholder="your@email.com"
                          value={form.email} onChange={set("email")}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className={labelCls}>Subject</label>
                      <input
                        type="text" required placeholder="Topic of Discussion"
                        value={form.subject} onChange={set("subject")}
                        className={inputCls}
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className={labelCls}>Message</label>
                      <textarea
                        required rows={5} placeholder="Tell us more..."
                        value={form.message} onChange={set("message")}
                        className={`${inputCls} resize-none`}
                      />
                    </div>

                    {/* Error */}
                    {status === "error" && (
                      <div className="flex items-start gap-2 px-3 py-2.5 bg-red-900/20 border border-red-500/20 text-red-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="text-xs font-mono">{errorMsg}</span>
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="w-full flex items-center justify-center gap-3 py-4 font-black uppercase disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                      style={{
                        background: "#ffffff",
                        color: "#000000",
                        fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                        fontSize: "0.9rem",
                        letterSpacing: "0.18em",
                      }}
                      onMouseEnter={(e) => { if (status !== "loading") (e.currentTarget as HTMLButtonElement).style.background = "#e0e0e0"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ffffff"; }}
                    >
                      {status === "loading" ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                      ) : (
                        <><Send className="w-4 h-4" />Send Message</>
                      )}
                    </button>

                    <p className="text-center text-[10px] font-mono text-white/20 uppercase tracking-widest pt-1">
                      No login required · Replies within 24h
                    </p>
                  </form>
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
