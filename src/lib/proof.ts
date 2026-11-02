export const MAX_PROOF_EDGE = 768;
export const PROOF_QUALITY = 0.72;
export const MAX_PROOF_CHARS = 4_000_000;

const PROOF_DATA_URL = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

/** Shrinks a picked photo in the browser so only a small copy ever leaves the device. */
export async function readProofImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PROOF_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", PROOF_QUALITY);
}

export function isProofDataUrl(value: string) {
  return PROOF_DATA_URL.test(value) && value.length <= MAX_PROOF_CHARS;
}

export function proofNote(note?: string) {
  const trimmed = (note ?? "").trim();
  return trimmed ? `Proof of work · ${trimmed}` : "Proof of work";
}
