import React from "react";
import { motion } from "framer-motion";

export function LogoMark() {
  return (
    <motion.img
      src="/upcore-logo-nobg.png"
      alt="UPCore"
      draggable={false}
      className="select-none w-full h-full object-contain"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      style={{
        filter:
          "brightness(0) invert(1) drop-shadow(0 0 18px rgba(255,255,255,0.6)) drop-shadow(0 0 40px rgba(0,200,255,0.4))",
      }}
    />
  );
}
