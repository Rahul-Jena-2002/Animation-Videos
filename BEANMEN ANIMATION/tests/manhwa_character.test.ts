import { getMorrowFoxState } from "../src/character/MorrowFox";
import { getGlyphPulse } from "../src/character/ManhwaEnhancements";

console.log("Testing Morrow fox and character enhancements...");
const fox = getMorrowFoxState(15, "walk");
if (typeof fox.tailWave !== "number" || typeof fox.bounce !== "number") {
  throw new Error("Invalid Morrow fox animation metrics");
}
const pulse = getGlyphPulse(30);
if (pulse < 0.6 || pulse > 1.2) {
  throw new Error(`Glyph pulse out of expected range: ${pulse}`);
}
console.log("PASS: Manhwa enhancements and Morrow rig compute valid states!");
