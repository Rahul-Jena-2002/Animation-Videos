import React from "react";
import { clamp } from "../theme";

export const getGlyphPulse = (frame: number): number => {
  return clamp(0.85 + 0.25 * Math.sin(frame * 0.12), 0.6, 1.2);
};

export const KaelGlyphs: React.FC<{ frame: number; side?: number }> = ({ frame, side = 1 }) => {
  const pulse = getGlyphPulse(frame);

  return (
    <g transform={`scale(${side}, 1)`}>
      <defs>
        <filter id="kaelRuneGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Constellation arm sleeve runes */}
      <g filter="url(#kaelRuneGlow)" opacity={pulse}>
        {/* Zodiac star line connecting wrist to shoulder */}
        <path
          d="M 12 18 L 18 35 L 8 52 L 20 75 L 14 95"
          fill="none"
          stroke="#fde047"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Constellation star nodes */}
        <circle cx="12" cy="18" r="3" fill="#ffffff" />
        <circle cx="18" cy="35" r="4" fill="#fbbf24" />
        <circle cx="8" cy="52" r="3.5" fill="#ffffff" />
        <circle cx="20" cy="75" r="4.5" fill="#f59e0b" />
        <circle cx="14" cy="95" r="3" fill="#ffffff" />

        {/* Orbiting celestial rune ring at wrist */}
        <ellipse cx="14" cy="95" rx="8" ry="4" fill="none" stroke="#67e8f9" strokeWidth="1.5" />
      </g>
    </g>
  );
};

export const SeraphineBlade: React.FC<{ frame: number }> = ({ frame }) => {
  const bladeGlow = clamp(0.75 + 0.25 * Math.sin(frame * 0.15), 0.5, 1.0);

  return (
    <g transform="translate(15, -40) rotate(-25)">
      <defs>
        <filter id="swordAura" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hilt and Crossguard */}
      <rect x="-5" y="110" width="10" height="35" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="2" />
      <polygon points="-25,110 25,110 18,100 -18,100" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
      <circle cx="0" cy="148" r="6" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />

      {/* Massive Runic Blade */}
      <polygon
        points="-14,100 -18,-60 0,-95 18,-60 14,100"
        fill="#e2e8f0"
        stroke="#1e293b"
        strokeWidth="3"
      />

      {/* Runic Energy Fuller Groove */}
      <line x1="0" y1="95" x2="0" y2="-75" stroke="#0ea5e9" strokeWidth="4" />

      {/* Shimmering Azure Energy Aura along Blade Edges */}
      <g filter="url(#swordAura)" opacity={bladeGlow}>
        <path
          d="M -18 -60 L 0 -95 L 18 -60"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Ancient runes inscribed on blade */}
        <circle cx="0" cy="65" r="4" fill="#a5f3fc" />
        <circle cx="0" cy="25" r="5" fill="#38bdf8" />
        <circle cx="0" cy="-15" r="4" fill="#a5f3fc" />
        <circle cx="0" cy="-55" r="3" fill="#ffffff" />
      </g>
    </g>
  );
};
