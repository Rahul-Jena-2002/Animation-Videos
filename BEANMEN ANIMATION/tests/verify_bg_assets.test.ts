import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const bgDir = path.join(root, "public", "bg", "aetheria_ancient_sky");
const requiredPlanes = [
  "sky.png",
  "far_mountains.png",
  "midground.png",
  "stage_ground.png",
  "foreground.png"
];

for (const plane of requiredPlanes) {
  const filePath = path.join(bgDir, plane);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing background plane: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  if (stat.size < 50_000) {
    throw new Error(`Background plane ${plane} is too small (${stat.size} bytes)`);
  }
}
console.log("PASS: All 5 background planes verified on disk!");
