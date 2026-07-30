import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const blue = "#059669";

const brandSvg = (size, { round = false, foregroundOnly = false } = {}) => Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    ${foregroundOnly ? "" : `<rect width="32" height="32" rx="${round ? 16 : 0}" fill="${blue}"/>`}
    <g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 6.5l3 3-13 13H9.5v-3l13-13z"/>
      <path d="M19 10l3 3"/>
      <path d="M8 24h16"/>
    </g>
  </svg>
`);

async function writeIcon(destination, size, options = {}) {
  await mkdir(path.dirname(destination), { recursive: true });
  let image = sharp(brandSvg(size, options));
  if (options.opaque) image = image.flatten({ background: blue }).removeAlpha();
  await image.png().toFile(destination);
}

async function writeSplash(destination) {
  const metadata = await sharp(destination).metadata();
  const width = metadata.width ?? 2732;
  const height = metadata.height ?? 2732;
  const markSize = Math.round(Math.min(width, height) * 0.24);
  const mark = await sharp(brandSvg(markSize, { foregroundOnly: true }))
    .resize(markSize, markSize)
    .png()
    .toBuffer();

  const splash = await sharp({
    create: { width, height, channels: 4, background: blue },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();

  await sharp(splash).toFile(destination);
}

const androidDensities = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

for (const [density, size] of Object.entries(androidDensities)) {
  const directory = path.join(root, "android", "app", "src", "main", "res", `mipmap-${density}`);
  await writeIcon(path.join(directory, "ic_launcher.png"), size);
  await writeIcon(path.join(directory, "ic_launcher_round.png"), size, { round: true });
  await writeIcon(path.join(directory, "ic_launcher_foreground.png"), Math.round(size * 2.25), {
    foregroundOnly: true,
  });
}

await writeIcon(path.join(root, "public", "icon-192.png"), 192, { round: true, opaque: true });
await writeIcon(path.join(root, "public", "icon-512.png"), 512, { round: true, opaque: true });

const androidRes = path.join(root, "android", "app", "src", "main", "res");
for (const directory of [
  "drawable",
  "drawable-land-hdpi",
  "drawable-land-mdpi",
  "drawable-land-xhdpi",
  "drawable-land-xxhdpi",
  "drawable-land-xxxhdpi",
  "drawable-port-hdpi",
  "drawable-port-mdpi",
  "drawable-port-xhdpi",
  "drawable-port-xxhdpi",
  "drawable-port-xxxhdpi",
]) {
  const splash = path.join(androidRes, directory, "splash.png");
  await access(splash);
  await writeSplash(splash);
}

await writeIcon(
  path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png"),
  1024,
  { opaque: true },
);

for (const filename of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await writeSplash(path.join(root, "ios", "App", "App", "Assets.xcassets", "Splash.imageset", filename));
}

console.log("Generated Anovo icons and splash screens for Android and iOS.");
