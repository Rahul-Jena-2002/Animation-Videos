import { getParticleState } from "../src/scene/AtmosphericParticles";

console.log("Testing getParticleState...");
const p0 = getParticleState(0, 0, 1920, 1080);
const p30 = getParticleState(0, 30, 1920, 1080);

if (typeof p0.x !== "number" || typeof p0.y !== "number" || typeof p0.opacity !== "number") {
  throw new Error("Invalid particle state structure");
}
if (p0.opacity < 0 || p0.opacity > 1) {
  throw new Error(`Particle opacity out of range: ${p0.opacity}`);
}
if (p0.y === p30.y && p0.x === p30.x) {
  throw new Error("Particle failed to animate over 30 frames");
}
console.log("PASS: Atmospheric particles calculate and animate correctly!");
