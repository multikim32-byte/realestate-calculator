import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '../public/icon.svg');
const svg = readFileSync(svgPath);

await sharp(svg).resize(192, 192).png().toFile(join(__dirname, '../public/icon-192.png'));
console.log('✓ icon-192.png');

await sharp(svg).resize(512, 512).png().toFile(join(__dirname, '../public/icon-512.png'));
console.log('✓ icon-512.png');
