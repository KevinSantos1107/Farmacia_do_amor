import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const input = 'assets-src/icon-original.png';
const outDir = 'public';

if (!fs.existsSync(input)) {
  console.error(`Input file not found: ${input}`);
  process.exit(1);
}

async function generate() {
  console.log('Generating PWA icons from', input);

  // 192x192 (meta <= ~30 KB)
  const icon192 = path.join(outDir, 'icon-192.png');
  await sharp(input)
    .resize(192, 192, { fit: 'cover' })
    .png({ compressionLevel: 9, effort: 10, palette: true })
    .toFile(icon192);
  const stat192 = fs.statSync(icon192);
  console.log(`Generated ${icon192}: ${stat192.size} bytes (${(stat192.size / 1024).toFixed(1)} KB)`);

  // 512x512 (meta <= ~90 KB)
  const icon512 = path.join(outDir, 'icon-512.png');
  await sharp(input)
    .resize(512, 512, { fit: 'cover' })
    .png({ compressionLevel: 9, effort: 10, palette: true, quality: 50 })
    .toFile(icon512);
  const stat512 = fs.statSync(icon512);
  console.log(`Generated ${icon512}: ${stat512.size} bytes (${(stat512.size / 1024).toFixed(1)} KB)`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
