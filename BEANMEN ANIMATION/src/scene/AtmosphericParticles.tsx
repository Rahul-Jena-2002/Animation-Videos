import React from "react";
import { rand, clamp } from "../theme";

export type ParticleState = {
  x: number;
  y: number;
  r: number;
  opacity: number;
  color: string;
};

export const getParticleState = (index: number, frame: number, width = 1920, height = 1080): ParticleState => {
  const seed = index * 19.387 + 4.12;
  const baseX = rand(seed) * width;
  const baseY = rand(seed + 1.23) * height;
  const speedY = 0.4 + rand(seed + 2.34) * 0.8;
  const ampX = 15 + rand(seed + 3.45) * 30;
  const freqX = 0.03 + rand(seed + 4.56) * 0.04;
  
  // Drift upward/downward and oscillate horizontally
  const y = (baseY - frame * speedY + height * 10) % height;
  const x = (baseX + Math.sin(frame * freqX + seed) * ampX + width) % width;
  
  // Pulsing glimmer opacity
  const pulse = Math.sin(frame * 0.08 + seed * 2);
  const opacity = clamp(0.25 + 0.65 * ((pulse + 1) / 2), 0.05, 0.95);
  
  const r = 1.5 + rand(seed + 5.67) * 2.5;
  const isCyan = rand(seed + 6.78) > 0.65;
  const color = isCyan ? "#a5f3fc" : "#fef08a"; // cyan or celestial gold

  return { x, y, r, opacity, color };
};

export const getEmberState = (index: number, frame: number, width = 1920, height = 1080): ParticleState => {
  const seed = index * 31.84 + 17.5;
  const baseX = rand(seed) * width;
  const speedY = 1.2 + rand(seed + 1.1) * 1.5;
  const y = (height - ((frame * speedY + rand(seed + 2.2) * height) % height));
  const x = (baseX + Math.sin(frame * 0.05 + seed) * 25 + width) % width;
  const life = 1 - (y / height); // brighter as it rises from bottom
  const opacity = clamp(life * 0.8 + 0.2, 0.1, 0.9);
  const r = 1.2 + rand(seed + 3.3) * 2.0;
  
  return {
    x,
    y,
    r,
    opacity,
    color: "#f59e0b", // warm amber ember
  };
};

export const AtmosphericParticles: React.FC<{
  frame: number;
  width?: number;
  height?: number;
  stardustCount?: number;
  emberCount?: number;
}> = ({ frame, width = 1920, height = 1080, stardustCount = 45, emberCount = 30 }) => {
  const stardust = Array.from({ length: stardustCount }, (_, i) => getParticleState(i, frame, width, height));
  const embers = Array.from({ length: emberCount }, (_, i) => getEmberState(i, frame, width, height));

  // Volumetric god-ray sweep angle
  const rayAngle = -25 + Math.sin(frame * 0.015) * 4;
  const rayOpacity = clamp(0.18 + Math.sin(frame * 0.025) * 0.08, 0.08, 0.28);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="stardustGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <linearGradient id="godRayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#080417" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Volumetric God-Ray Light Shafts */}
        <g transform={`rotate(${rayAngle} ${width / 2} 0)`} opacity={rayOpacity} style={{ mixBlendMode: "screen" }}>
          <polygon points={`300,-100 650,-100 1100,${height + 200} 500,${height + 200}`} fill="url(#godRayGrad)" />
          <polygon points={`900,-100 1200,-100 1750,${height + 200} 1250,${height + 200}`} fill="url(#godRayGrad)" opacity={0.65} />
        </g>

        {/* Floating Stardust Particles */}
        <g filter="url(#stardustGlow)">
          {stardust.map((p, i) => (
            <circle
              key={`dust-${i}`}
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={p.color}
              opacity={p.opacity}
            />
          ))}
        </g>

        {/* Rising Celestial Embers */}
        <g filter="url(#stardustGlow)">
          {embers.map((e, i) => (
            <circle
              key={`ember-${i}`}
              cx={e.x}
              cy={e.y}
              r={e.r}
              fill={e.color}
              opacity={e.opacity}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};
