import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const mp4Path = path.join(root, "out", "the-atlas-of-hollow-stars-chapter-01", "the-atlas-of-hollow-stars-chapter-01.mp4");

if (!fs.existsSync(mp4Path)) {
  throw new Error(`Output MP4 does not exist at: ${mp4Path}`);
}

const stat = fs.statSync(mp4Path);
console.log(`Checking MP4 file: ${mp4Path}`);
console.log(`File size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);

if (stat.size < 50 * 1024 * 1024) {
  throw new Error(`File size is suspiciously small: ${stat.size} bytes`);
}

const probeOut = execFileSync("ffprobe", [
  "-v", "error",
  "-show_entries", "stream=codec_name,width,height,duration",
  "-of", "json",
  mp4Path
], { encoding: "utf8" });

const probe = JSON.parse(probeOut);
const videoStream = probe.streams.find((s: any) => s.width && s.height);
const audioStream = probe.streams.find((s: any) => s.codec_name === "aac");

if (!videoStream) {
  throw new Error("No video stream found in MP4");
}
if (!audioStream) {
  throw new Error("No AAC audio stream found in MP4");
}

console.log("Video Stream:", {
  codec: videoStream.codec_name,
  width: videoStream.width,
  height: videoStream.height,
  duration: videoStream.duration,
});

if (videoStream.width !== 1920 || videoStream.height !== 1080) {
  throw new Error(`Invalid resolution: ${videoStream.width}x${videoStream.height}, expected 1920x1080`);
}
if (parseFloat(videoStream.duration) < 400) {
  throw new Error(`Invalid duration: ${videoStream.duration}s, expected > 400s`);
}

console.log("PASS: Chapter 01 Showcase MP4 verified successfully with ffprobe!");
