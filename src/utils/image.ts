// 把用户选的图片缩放并转成 data URL(自包含、可持久化,避免 blob: URL 刷新失效)。
// 用 createImageBitmap 解码:imageOrientation:'from-image' 会应用 EXIF 方向(手机竖拍不再被转 90°),
// 缩到最长边 maxSize 后以 JPEG 压缩,base64 体积小。非图片/损坏文件会 reject,由调用方处理。
export async function fileToDataUrl(file: File, maxSize = 720, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}
