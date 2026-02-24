import { DEFAULT_HOTKEYS, DEFAULT_SETTINGS } from "./constants";
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
  const uiLanguage = stored.uiLanguage === "zh" || stored.uiLanguage === "en" ? stored.uiLanguage : "en";
  const legacyModel = (stored as Partial<Settings> & { modelText?: string }).modelText;
  const model = stored.model || legacyModel || DEFAULT_SETTINGS.model;
  const slots = stored.slots?.length
    ? stored.slots.map((slot, index) => {
        const legacySlot = slot as typeof slot & { greeting?: boolean; closing?: boolean; emailFormat?: boolean };
        const hasEmailFormat = typeof legacySlot.emailFormat === "boolean";
        const inferredEmailFormat = (legacySlot.greeting ?? false) || (legacySlot.closing ?? false);
        return {
          ...DEFAULT_SETTINGS.slots[index % DEFAULT_SETTINGS.slots.length],
          ...slot,
          description: slot.description ?? "",
          emailFormat: hasEmailFormat ? legacySlot.emailFormat : inferredEmailFormat,
        };
      })
    : DEFAULT_SETTINGS.slots;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    model,
    uiLanguage,
    slots,
    hotkey: stored.hotkey || getDefaultHotkey(),
  };
};
