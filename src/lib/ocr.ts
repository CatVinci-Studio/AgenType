import { readImage } from "@tauri-apps/plugin-clipboard-manager";
import type { Image } from "@tauri-apps/api/image";
import { sleep } from "./utils";

export const imageToBase64 = async (image: Image) => {
  const rgba = await image.rgba();
  const { width, height } = await image.size();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("无法读取截图数据");
  }
  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1] ?? "";
};

type WaitForClipboardImageOptions = {
  timeoutMs?: number;
  intervalMs?: number;
};

export const waitForClipboardImage = async ({ timeoutMs = 12000, intervalMs = 350 }: WaitForClipboardImageOptions = {}) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const image = await readImage();
      if (image) {
        return image;
      }
    } catch (error) {
      // ignore while waiting
    }
    await sleep(intervalMs);
  }
  throw new Error("未检测到截图，请重试");
};
