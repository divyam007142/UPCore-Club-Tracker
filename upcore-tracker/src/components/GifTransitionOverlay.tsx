import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { usePageTransition } from "@/context/TransitionContext";

export default function GifTransitionOverlay() {
  const [location] = useLocation();
  const prevLocation = useRef(location);
  const { triggerTransition } = usePageTransition();

  useEffect(() => {
    if (location === prevLocation.current) return;
    const from = prevLocation.current;
    prevLocation.current = location;
    if (location.startsWith("/admin") || from.startsWith("/admin")) return;
    triggerTransition(900);
  }, [location, triggerTransition]);

  return null;
}
