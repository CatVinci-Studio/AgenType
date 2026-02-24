import { DEFAULT_HOTKEYS, DEFAULT_SETTINGS, DEFAULT_SLOTS } from "./constants";
import { clampNumber } from "./utils";
import type { Settings } from "./types";

export const getDefaultHotkey = () => {
  if (navigator.userAgent.includes("Mac")) {
    return DEFAULT_HOTKEYS.mac;
  }
  return DEFAULT_HOTKEYS.other;
};

export const mergeSettings = (stored?: Partial<Settings> | null): Settings => {
  if (!stored) {
    return {
      ...DEFAULT_SETTINGS,
      hotkey: getDefaultHotkey(),
    };
  }
  const candidateCount = clampNumber(
    Number(stored.candidateCount || DEFAULT_SETTINGS.candidateCount),
    1,
    DEFAULT_SLOTS.length,
  );
  const uiLanguage = stored.uiLanguage === "zh" || stored.uiLanguage === "en" ? stored.uiLanguage : "en";
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    candidateCount,
    uiLanguage,
    slots: stored.slots?.length ? stored.slots : DEFAULT_SETTINGS.slots,
    hotkey: stored.hotkey || getDefaultHotkey(),
  };
};
