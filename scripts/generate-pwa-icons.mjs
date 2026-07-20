import fs from "fs";
import path from "path";
import sharp from "sharp";

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(process.cwd(), "public", "icon.svg");
const outDir = path.join(process.cwd(), "public", "icons");

fs.mkdirSync(outDir, { recursive: true });
const svg = fs.readFileSync(svgPath);

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, `icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}
