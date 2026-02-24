import en from "../locales/en";
import zh from "../locales/zh";
import type { UiLanguage } from "./types";

export type Translator = (key: string, params?: Record<string, string | number>) => string;

const dictionaries: Record<UiLanguage, Record<string, string>> = {
  en,
  zh,
};

export const createTranslator = (locale: UiLanguage): Translator => {
  const messages = dictionaries[locale] ?? dictionaries.en;
  return (key, params) => {
    let text = messages[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replaceAll(`{${paramKey}}`, String(value));
      });
    }
    return text;
  };
};
