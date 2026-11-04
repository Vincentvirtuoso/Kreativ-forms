export function toSafeFilename(name: string, extension: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[\s.]+$/g, "")
    .slice(0, 100);

  return `${cleaned || "signature"}.${extension}`;
}
