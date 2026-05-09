export function generateUnsoldSlug(name: string, location: string): string {
  const parts = location.trim().split(/\s+/);
  const locPart = parts.slice(0, 2).join('-');
  const namePart = name
    .replace(/[()（）[\]【】·•「」『』]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${locPart}-${namePart}`.replace(/-+/g, '-').replace(/^-|-$/g, '');
}
