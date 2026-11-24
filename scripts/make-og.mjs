// Renders public/og.png (1200x630) from a tiny SVG, so the share card is
// reproducible instead of a binary nobody can edit.
import fs from 'node:fs';
import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0F5566"/>
      <stop offset="1" stop-color="#0B3E4A"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <circle cx="1010" cy="120" r="210" fill="#C1F0EC" opacity="0.10"/>
  <circle cx="1090" cy="520" r="150" fill="#8AB946" opacity="0.12"/>
  <rect x="96" y="96" width="64" height="8" rx="4" fill="#C1F0EC"/>
  <text x="96" y="286" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-size="132" font-weight="bold" fill="#F4F7F8">winit</text>
  <text x="96" y="366" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-size="36" fill="#C1F0EC">A quiet place for goals, habits and time.</text>
  <text x="96" y="520" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-size="26" fill="#8FB3BC">winit-dz.vercel.app</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og.png');
console.log('public/og.png', fs.statSync('public/og.png').size, 'bytes');
