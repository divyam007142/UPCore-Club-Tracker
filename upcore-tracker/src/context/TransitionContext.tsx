import { createContext, useContext, useRef, useState, useCallback, ReactNode } from "react";

interface TransitionContextValue {
  triggerTransition: (durationMs?: number) => void;
}

const TransitionContext = createContext<TransitionContextValue>({
  triggerTransition: () => {},
});

export function usePageTransition() {
  return useContext(TransitionContext);
}

interface TransitionProviderProps {
  children: ReactNode;
}

export function TransitionProvider({ children }: TransitionProviderProps) {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerTransition = useCallback((durationMs = 1400) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setFadingOut(false);
    setVisible(true);

    timerRef.current = setTimeout(() => {
      setFadingOut(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setFadingOut(false);
      }, 400);
    }, durationMs);
  }, []);

  return (
    <TransitionContext.Provider value={{ triggerTransition }}>
      {children}
      {visible && (
        <>
          <style>{`
            @keyframes spin-cw  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
            @keyframes spin-ccw { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
            @keyframes dot-pulse {
              0%, 80%, 100% { opacity: 0.2; transform: scale(0.85); }
              40%            { opacity: 1;   transform: scale(1); }
            }
            @keyframes loader-fade-in {
              from { opacity: 0; transform: scale(0.92); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(0, 0, 0, 0.78)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "22px",
              opacity: fadingOut ? 0 : 1,
              transition: fadingOut ? "opacity 0.4s ease" : "opacity 0.25s ease",
              animation: fadingOut ? "none" : "loader-fade-in 0.25s ease both",
            }}
          >
            <div style={{ position: "relative", width: 88, height: 88 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "hsl(199 100% 50%)",
                borderRightColor: "hsl(199 100% 50% / 0.25)",
                animation: "spin-cw 1.4s cubic-bezier(0.6,0,0.4,1) infinite",
                boxShadow: "0 0 14px 0 hsl(199 100% 50% / 0.35)",
              }} />
              <div style={{
                position: "absolute", inset: 14, borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "hsl(275 87% 65%)",
                borderLeftColor: "hsl(275 87% 65% / 0.25)",
                animation: "spin-ccw 1.0s cubic-bezier(0.6,0,0.4,1) infinite",
                boxShadow: "0 0 10px 0 hsl(275 87% 55% / 0.3)",
              }} />
              <div style={{
                position: "absolute", inset: 28, borderRadius: "50%",
                border: "1.5px solid transparent",
                borderBottomColor: "hsl(199 100% 50% / 0.8)",
                borderRightColor: "hsl(199 100% 50% / 0.2)",
                animation: "spin-cw 0.7s linear infinite",
              }} />
              <div style={{
                position: "absolute", inset: "50%",
                width: 6, height: 6, marginLeft: -3, marginTop: -3,
                borderRadius: "50%",
                background: "hsl(199 100% 60%)",
                boxShadow: "0 0 8px 3px hsl(199 100% 50% / 0.6)",
              }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: "hsl(199 100% 50%)",
                    animation: `dot-pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.45em",
                textTransform: "uppercase",
                color: "hsl(199 100% 50% / 0.55)",
              }}>
                REFRESHING
              </span>
            </div>
          </div>
        </>
      )}
    </TransitionContext.Provider>
  );
}
