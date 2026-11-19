import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { W, H, clamp, ease, easeOut, lerp } from "../theme";
import type { ResolvedShot, Character as CharDef } from "../schema";
import { Character } from "../character/Character";
import { AtmosphericParticles } from "./AtmosphericParticles";
import { resolveActors } from "./Scene";

export type ParallaxPlane = {
  x: number;
  y: number;
  scale: number;
};

export type ParallaxSet = {
  sky: ParallaxPlane;
  mountains: ParallaxPlane;
  midground: ParallaxPlane;
  stage: ParallaxPlane;
  foreground: ParallaxPlane;
};

export const calcParallaxOffsets = (camera: string, frame: number, duration: number): ParallaxSet => {
  const p = clamp(frame / Math.max(1, duration));
  const ep = ease(p);

  const getPlane = (factor: number): ParallaxPlane => {
    let dx = 0;
    let dy = 0;
    let scale = 1.0;

    switch (camera) {
      case "panRight":
        dx = -ep * 180 * factor;
        break;
      case "panLeft":
        dx = ep * 180 * factor;
        break;
      case "pushIn":
        scale = 1.0 + ep * 0.12 * factor;
        dy = ep * 30 * factor;
        break;
      case "pullOut":
        scale = 1.08 - ep * 0.08 * factor;
        dy = -ep * 20 * factor;
        break;
      case "drift":
        dx = Math.sin(frame * 0.02) * 25 * factor;
        dy = Math.cos(frame * 0.015) * 15 * factor;
        break;
      case "whip": {
        const q = easeOut(clamp(frame / 8));
        dx = (1 - q) * 400 * factor;
        break;
      }
      case "zoom":
        scale = 1.0 + ep * 0.22 * factor;
        break;
      default:
        // subtle resting drift
        dx = Math.sin(frame * 0.01) * 12 * factor;
        dy = Math.cos(frame * 0.008) * 8 * factor;
        break;
    }

    return { x: dx, y: dy, scale };
  };

  return {
    sky: getPlane(0.15),
    mountains: getPlane(0.35),
    midground: getPlane(0.65),
    stage: getPlane(1.0),
    foreground: getPlane(1.45),
  };
};

export const ManhwaScene: React.FC<{
  shot: ResolvedShot;
  cast: Record<string, CharDef>;
  frame: number;
  fps: number;
}> = ({ shot, cast, frame, fps }) => {
  const dur = shot.duration;
  const offsets = calcParallaxOffsets(shot.camera, frame, dur);

  // Background dimension: 2400 x 1350 centered on 1920 x 1080
  const baseX = (W - 2400) / 2; // -240
  const baseY = (H - 1350) / 2; // -135

  const planeStyle = (p: ParallaxPlane): React.CSSProperties => ({
    position: "absolute",
    left: `${baseX + p.x}px`,
    top: `${baseY + p.y}px`,
    width: "2400px",
    height: "1350px",
    transform: `scale(${p.scale})`,
    transformOrigin: "center center",
    pointerEvents: "none",
  });

  // Staging for manhwa characters: horizon = 780
  const actorStates = resolveActors(shot, { horizon: 740 } as never, frame, dur);

  return (
    <AbsoluteFill style={{ backgroundColor: "#060312", overflow: "hidden" }}>
      {/* Plane 1: Cosmic Sky with Falling Stars */}
      <Img
        src={staticFile("bg/aetheria_ancient_sky/sky.png")}
        style={planeStyle(offsets.sky)}
      />

      {/* Plane 2: Distant Misty Mountains & Floating Monoliths */}
      <Img
        src={staticFile("bg/aetheria_ancient_sky/far_mountains.png")}
        style={planeStyle(offsets.mountains)}
      />

      {/* Plane 3: Midground Celestial Sanctuary & Ruins */}
      <Img
        src={staticFile("bg/aetheria_ancient_sky/midground.png")}
        style={planeStyle(offsets.midground)}
      />

      {/* Plane 4: Stage Ground - Constellation Altar Dais */}
      <Img
        src={staticFile("bg/aetheria_ancient_sky/stage_ground.png")}
        style={planeStyle(offsets.stage)}
      />

      {/* Plane 5: Character Staging */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${offsets.stage.x}px, ${offsets.stage.y}px) scale(${offsets.stage.scale})`,
          transformOrigin: "center bottom",
        }}
      >
        {actorStates.map((st, i) => {
          const ch = cast[st.a.id];
          if (!ch) return null;
          return (
            <div
              key={st.a.id || i}
              style={{
                position: "absolute",
                left: `${st.x}px`,
                top: `${st.y}px`,
                transform: `scale(${st.s})`,
                transformOrigin: "center bottom",
                opacity: st.opacity,
              }}
            >
              {/* Floor contact reflection shadow */}
              <div
                style={{
                  position: "absolute",
                  left: "-45px",
                  bottom: "-6px",
                  width: "90px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(10, 5, 20, 0.65)",
                  filter: "blur(4px)",
                }}
              />
              <Character
                ch={ch}
                id={st.a.id}
                pose={st.pose}
                prevPose={st.prevPose}
                poseT={st.poseAge / 6}
                expression={st.expression}
                exprAge={st.exprAge}
                facing={st.facing}
                talking={Boolean(st.a.talking)}
                t={frame / fps}
                frame={frame}
                walking={st.walking}
                light={{ side: st.facing === "right" ? 1 : -1, color: "#8be9fd", strength: 0.7 }}
              />
            </div>
          );
        })}
      </div>

      {/* Plane 6: Dynamic Atmospheric Particles (Stardust, Embers, God-rays) */}
      <AtmosphericParticles frame={frame} width={W} height={H} />

      {/* Plane 7: Foreground Silhouetted Arches & Crystal Shards */}
      <Img
        src={staticFile("bg/aetheria_ancient_sky/foreground.png")}
        style={planeStyle(offsets.foreground)}
      />

      {/* Cinematic Vignette */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: "radial-gradient(circle at center, transparent 55%, rgba(6, 2, 16, 0.75) 100%)",
        }}
      />

      {/* Cinematic 2.39:1 Scope Letterbox Bars */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "80px",
          backgroundColor: "#07040e",
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "80px",
          backgroundColor: "#07040e",
          zIndex: 100,
        }}
      />
    </AbsoluteFill>
  );
};
