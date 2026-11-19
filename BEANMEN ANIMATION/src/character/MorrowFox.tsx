import React from "react";
import { clamp, easeOut } from "../theme";

export type MorrowFoxState = {
  tailWave: number;
  bounce: number;
  earTwitch: number;
  glow: number;
};

export const getMorrowFoxState = (frame: number, pose: string): MorrowFoxState => {
  const isMoving = pose === "walk" || pose === "run";
  const speed = pose === "run" ? 0.35 : isMoving ? 0.2 : 0.08;
  const tailWave = Math.sin(frame * speed) * (isMoving ? 14 : 7);
  const bounce = isMoving ? Math.abs(Math.sin(frame * speed * 2)) * 12 : Math.sin(frame * 0.05) * 3;
  const earTwitch = Math.sin(frame * 0.12) > 0.8 ? 5 : 0;
  const glow = 0.7 + 0.3 * Math.sin(frame * 0.1);

  return { tailWave, bounce, earTwitch, glow };
};

export const MorrowFox: React.FC<{
  frame: number;
  pose?: string;
  facing?: "left" | "right" | "front";
  scale?: number;
}> = ({ frame, pose = "stand", facing = "right", scale = 1.0 }) => {
  const st = getMorrowFoxState(frame, pose);
  const mirror = facing === "left" ? -1 : 1;

  return (
    <div
      style={{
        transform: `scale(${scale * mirror}, ${scale}) translateY(${-st.bounce}px)`,
        transformOrigin: "center bottom",
        display: "inline-block",
        position: "relative",
      }}
    >
      <svg width="240" height="200" viewBox="-120 -150 240 200">
        <defs>
          <filter id="celestialFoxGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <linearGradient id="foxFurGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>

          <linearGradient id="tailStardust" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" />
          </linearGradient>
        </defs>

        {/* 3 Constellation Tails (Animated Waving) */}
        <g filter="url(#celestialFoxGlow)" opacity={st.glow}>
          {/* Left / Upper Tail */}
          <path
            d={`M -20 -30 Q ${-65 + st.tailWave} -85 ${-95 + st.tailWave * 1.3} -120 Q ${-50 + st.tailWave} -90 -15 -45 Z`}
            fill="url(#tailStardust)"
          />
          {/* Center Main Tail */}
          <path
            d={`M -25 -25 Q ${-80 - st.tailWave * 0.8} -60 ${-115 - st.tailWave * 1.5} -80 Q ${-75 - st.tailWave * 0.5} -40 -20 -15 Z`}
            fill="url(#tailStardust)"
          />
          {/* Lower Tail */}
          <path
            d={`M -20 -15 Q ${-60 + st.tailWave * 0.6} -25 ${-85 + st.tailWave} -30 Q ${-55 + st.tailWave * 0.4} -10 -15 -5 Z`}
            fill="url(#tailStardust)"
          />
          
          {/* Stardust constellation nodes along tails */}
          <circle cx={-95 + st.tailWave * 1.3} cy={-120} r="4" fill="#ffffff" />
          <circle cx={-115 - st.tailWave * 1.5} cy={-80} r="5" fill="#fef08a" />
          <circle cx={-85 + st.tailWave} cy={-30} r="3" fill="#ffffff" />
          <line x1={-95 + st.tailWave * 1.3} y1={-120} x2={-115 - st.tailWave * 1.5} y2={-80} stroke="#fef08a" strokeWidth="1.5" strokeDasharray="3 3" />
        </g>

        {/* Fox Body */}
        {/* Rear Legs */}
        <path d="M -25 -10 Q -35 25 -30 45 L -20 45 Q -20 15 -10 -5 Z" fill="#fef3c7" stroke="#2a1c15" strokeWidth="2.5" />
        {/* Torso */}
        <ellipse cx="0" cy="5" rx="36" ry="24" fill="url(#foxFurGrad)" stroke="#2a1c15" strokeWidth="3" />
        {/* Chest Fluff */}
        <path d="M 12 -12 Q 35 5 18 22 Q 10 12 12 -12 Z" fill="#ffffff" />

        {/* Front Legs */}
        <path d="M 18 5 L 24 45 L 34 45 L 28 8 Z" fill="#fde68a" stroke="#2a1c15" strokeWidth="2.5" />
        <path d="M 8 5 L 12 45 L 20 45 L 16 8 Z" fill="#fef3c7" stroke="#2a1c15" strokeWidth="2.5" />

        {/* Fox Head */}
        <g transform={`translate(28, -22) rotate(${st.earTwitch})`}>
          {/* Left Ear */}
          <polygon points="-8,-12 -2,-42 12,-16" fill="#fde68a" stroke="#2a1c15" strokeWidth="2" />
          <polygon points="-4,-14 0,-36 8,-18" fill="#fda4af" />

          {/* Right Ear */}
          <polygon points="6,-14 18,-45 28,-18" fill="#fde68a" stroke="#2a1c15" strokeWidth="2" />
          <polygon points="10,-16 18,-38 24,-20" fill="#fda4af" />

          {/* Head Base */}
          <polygon points="-12,-8 28,-8 38,12 8,18 -8,8" fill="url(#foxFurGrad)" stroke="#2a1c15" strokeWidth="2.5" />

          {/* Snout */}
          <polygon points="20,-2 46,6 24,14" fill="#ffffff" stroke="#2a1c15" strokeWidth="2" />
          <circle cx="45" cy="6" r="3" fill="#1e1b4b" />

          {/* Eye with golden star shine */}
          <ellipse cx="18" cy="2" rx="5" ry="6" fill="#f59e0b" />
          <ellipse cx="18" cy="2" rx="2" ry="5" fill="#1e1b4b" />
          <circle cx="16" cy="0" r="1.5" fill="#ffffff" />

          {/* Celestial Forehead Star Rune */}
          <g transform="translate(6, -2) scale(0.6)" filter="url(#celestialFoxGlow)">
            <polygon points="0,-8 2,-2 8,0 2,2 0,8 -2,2 -8,0 -2,-2" fill="#38bdf8" />
          </g>
        </g>
      </svg>
    </div>
  );
};
