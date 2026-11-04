export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, content] = dataUrl.split(",");

  if (!header || !content) {
    throw new Error("Invalid signature data URL.");
  }

  const mimeType = header.match(/data:(.*?);base64/)?.[1];

  if (mimeType !== "image/png") {
    throw new Error("Signature must be a PNG image.");
  }

  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: "image/png" });
}
