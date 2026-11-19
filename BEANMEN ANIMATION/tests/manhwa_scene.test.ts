import { calcParallaxOffsets } from "../src/scene/ManhwaScene";

console.log("Testing calcParallaxOffsets...");
const offsets = calcParallaxOffsets("panRight", 30, 90);
if (!offsets.sky || !offsets.mountains || !offsets.midground || !offsets.foreground) {
  throw new Error("Missing parallax plane offsets");
}
// Foreground must move faster than Sky during pan
if (Math.abs(offsets.foreground.x) <= Math.abs(offsets.sky.x)) {
  throw new Error("Foreground must exhibit greater parallax displacement than Sky");
}
console.log("Parallax samples:", offsets);
console.log("PASS: Parallax camera offsets correctly scaled!");
