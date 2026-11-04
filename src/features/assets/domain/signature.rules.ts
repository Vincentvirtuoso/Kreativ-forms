import type { CreateSignatureInput, SignatureFormat } from "./signature.types";

export function getSignatureFormat(input: {
  svg?: string | null;
  png?: Blob | null;
}): SignatureFormat {
  const hasSvg = Boolean(input.svg?.trim());
  const hasPng = Boolean(input.png);

  if (hasSvg && hasPng) return "both";
  if (hasSvg) return "svg";
  if (hasPng) return "png";

  throw new Error("A signature must contain SVG or PNG data.");
}

export function validateSignatureInput(input: CreateSignatureInput): void {
  if (!input.name.trim()) {
    throw new Error("A signature name is required.");
  }

  getSignatureFormat(input);

  if (input.png && input.png.type !== "image/png") {
    throw new Error("Signature image must be a PNG file.");
  }

  if (input.png && input.png.size === 0) {
    throw new Error("Signature image cannot be empty.");
  }
}
