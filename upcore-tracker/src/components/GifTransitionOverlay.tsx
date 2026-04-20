import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { usePageTransition } from "@/context/TransitionContext";

export default function GifTransitionOverlay() {
  const [location] = useLocation();
  const prevLocation = useRef(location);
  const { triggerTransition } = usePageTransition();

  useEffect(() => {
    if (location === prevLocation.current) return;
    prevLocation.current = location;
    triggerTransition(1400);
  }, [location, triggerTransition]);

  return null;
}
