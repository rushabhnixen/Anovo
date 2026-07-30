import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const output = path.join(root, "store-assets", "google-play");
const blue = "#059669";

await mkdir(path.join(output, "screenshots"), { recursive: true });

const iconSource = path.join(root, "public", "favicon.svg");
await sharp(iconSource, { density: 768 })
  .resize(512, 512)
  .flatten({ background: blue })
  .removeAlpha()
  .png()
  .toFile(path.join(output, "app-icon-512.png"));

const featureGraphic = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#075985"/>
      <stop offset="0.55" stop-color="#059669"/>
      <stop offset="1" stop-color="#38bdf8"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#082f49" flood-opacity=".28"/>
    </filter>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <circle cx="900" cy="70" r="185" fill="#fff" opacity=".08"/>
  <circle cx="785" cy="450" r="245" fill="#fff" opacity=".06"/>
  <g transform="translate(72 126)" filter="url(#shadow)">
    <rect width="210" height="210" rx="48" fill="#fff"/>
    <g transform="translate(41 41) scale(4)" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 6.5l3 3-13 13H9.5v-3l13-13z"/>
      <path d="M19 10l3 3"/>
      <path d="M8 24h16"/>
    </g>
  </g>
  <text x="332" y="210" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="700">Anovo</text>
  <text x="334" y="267" fill="#e0f2fe" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="500">Write better. Sound human.</text>
  <g transform="translate(334 316)" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="600">
    <rect width="176" height="54" rx="27" fill="#fff" opacity=".16"/><text x="28" y="35" fill="#fff">Paraphrase</text>
    <rect x="192" width="164" height="54" rx="27" fill="#fff" opacity=".16"/><text x="224" y="35" fill="#fff">Humanize</text>
    <rect x="372" width="166" height="54" rx="27" fill="#fff" opacity=".16"/><text x="402" y="35" fill="#fff">Improve</text>
  </g>
</svg>`);

await sharp(featureGraphic)
  .png()
  .toFile(path.join(output, "feature-graphic-1024x500.png"));

console.log(`Generated Google Play assets in ${output}`);
