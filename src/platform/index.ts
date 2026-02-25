import type { Platform } from "./types";

const detectTauriRuntime = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const anyWindow = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return Boolean(anyWindow.__TAURI__ || anyWindow.__TAURI_INTERNALS__);
};

const resolvePlatformId = () => {
  const envPlatform = import.meta.env.VITE_PLATFORM;
  if (envPlatform === "desktop" || envPlatform === "web") {
    return envPlatform;
  }
  return detectTauriRuntime() ? "desktop" : "web";
};

let platformPromise: Promise<Platform> | null = null;

export const getPlatform = () => {
  if (!platformPromise) {
    const platformId = resolvePlatformId();
    platformPromise = platformId === "desktop"
      ? import("./desktop").then((module) => module.platform)
      : import("./web").then((module) => module.platform);
  }
  return platformPromise;
};

export type { Platform, PlatformCapabilities, PlatformStorage } from "./types";
