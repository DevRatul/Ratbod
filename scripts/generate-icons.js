import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5D13" />
      <stop offset="100%" stop-color="#D83B00" />
    </linearGradient>
  </defs>
  <!-- Background squircle filled with brand color -->
  <rect width="512" height="512" rx="112" fill="url(#grad)" />
  <!-- Activity / Heartbeat pulse line -->
  <path d="M 64 256 H 144 L 200 392 L 312 120 L 368 256 H 448" 
        fill="none" 
        stroke="#FFFFFF" 
        stroke-width="44" 
        stroke-linecap="round" 
        stroke-linejoin="round" />
</svg>`;

async function generate() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write SVG file
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'mask-icon.svg'), svgContent);

  const svgBuffer = Buffer.from(svgContent);

  // Generate PNG sizes
  await sharp(svgBuffer).resize(180, 180).toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(180, 180).toFile(path.join(publicDir, 'apple-touch-icon-precomposed.png'));
  await sharp(svgBuffer).resize(192, 192).toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(svgBuffer).resize(32, 32).toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(svgBuffer).resize(16, 16).toFile(path.join(publicDir, 'favicon-16x16.png'));

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
