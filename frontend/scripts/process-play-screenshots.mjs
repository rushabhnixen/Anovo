import path from "node:path";
import sharp from "sharp";

const directory = path.join(process.cwd(), "store-assets", "google-play", "screenshots");
const background = "#020617";

async function phoneScreenshot(input, output, transform = (image) => image) {
  const image = transform(sharp(path.join(directory, input)));
  await image
    .resize(1080, 1920, { fit: "contain", background, kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(directory, output));
}

await phoneScreenshot("01-home.png", "phone-01-home.png");
await phoneScreenshot(
  "02-paraphrase-full.png",
  "phone-02-paraphrase-alternatives.png",
  (image) => image.extract({ left: 0, top: 790, width: 417, height: 741 }),
);
await sharp(path.join(directory, "03-humanize.png"))
  .resize(1030, 1920, { fit: "contain", background, kernel: sharp.kernel.lanczos3 })
  .extend({ left: 25, right: 25, top: 0, bottom: 0, background })
  .png({ compressionLevel: 9 })
  .toFile(path.join(directory, "phone-03-humanize.png"));

console.log(`Prepared 1080x1920 Play screenshots in ${directory}`);
