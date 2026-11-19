import { shouldRenderManhwaScene } from "../src/Video";

if (!shouldRenderManhwaScene("aetheria_ancient_sky")) {
  throw new Error("Expected aetheria_ancient_sky to route to ManhwaScene");
}
if (shouldRenderManhwaScene("office")) {
  throw new Error("Standard 2D scene should not route to ManhwaScene");
}
console.log("PASS: Video routing logic verified!");
