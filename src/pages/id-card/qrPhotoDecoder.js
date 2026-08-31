const imageFromFile = (file) => new Promise((resolve, reject) => {
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Photo open nahi hui.")); };
  image.src = url;
});

const canvasFile = async (image, cropRatio, highContrast) => {
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) * cropRatio;
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  const outputSize = Math.min(1800, Math.max(900, Math.round(sourceSize * 2)));
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d", { willReadFrequently: highContrast });
  context.imageSmoothingEnabled = false;
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
  if (highContrast) {
    const pixels = context.getImageData(0, 0, outputSize, outputSize);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const gray = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114;
      const value = gray > 145 ? 255 : 0;
      pixels.data[index] = value;
      pixels.data[index + 1] = value;
      pixels.data[index + 2] = value;
    }
    context.putImageData(pixels, 0, 0);
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new File([blob], `qr-${cropRatio}-${highContrast}.png`, { type: "image/png" });
};

const nativeQrScan = async (file) => {
  if (!("BarcodeDetector" in window)) return "";
  const formats = await window.BarcodeDetector.getSupportedFormats?.();
  if (formats && !formats.includes("qr_code")) return "";
  const bitmap = await createImageBitmap(file);
  try {
    const results = await new window.BarcodeDetector({ formats: ["qr_code"] }).detect(bitmap);
    return results[0]?.rawValue || "";
  } finally { bitmap.close?.(); }
};

export const decodeQrPhoto = async (file, reader) => {
  try {
    const value = await nativeQrScan(file);
    if (value) return value;
  } catch { /* html5 decoder neeche try hoga */ }

  const candidates = [file];
  const image = await imageFromFile(file);
  for (const ratio of [0.85, 0.65, 0.48]) {
    candidates.push(await canvasFile(image, ratio, false));
    candidates.push(await canvasFile(image, ratio, true));
  }
  let lastError;
  for (const candidate of candidates) {
    try { return await reader.scanFile(candidate, true); }
    catch (error) { lastError = error; }
  }
  throw lastError || new Error("QR nahi mila.");
};
