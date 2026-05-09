import sharp from 'sharp';

type Options = { maxWidth?: number; quality?: number };

export async function optimizeToWebP(
  buffer: Buffer,
  { maxWidth = 1200, quality = 85 }: Options = {}
): Promise<Buffer> {
  return sharp(buffer)
    .resize(maxWidth, undefined, { withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}
