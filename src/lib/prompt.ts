import { LENGTH_OPTIONS, TONE_OPTIONS } from "./constants";
import type { PromptConfig, Slot } from "./types";

export const buildStyleLines = (slots: Slot[]) =>
  slots
    .map((slot) => {
      const greeting = slot.greeting ? "是" : "否";
      const closing = slot.closing ? "是" : "否";
      const languageLabel = slot.language === "zh" ? "中文" : "英文";
      const lengthLabel = LENGTH_OPTIONS.find((option) => option.value === slot.length)?.label ?? slot.length;
      const toneLabel = TONE_OPTIONS.find((option) => option.value === slot.toneClass)?.label ?? slot.toneClass;
      return `${slot.id}: 语气=${toneLabel}, 语言=${languageLabel}, 长度=${lengthLabel}, 称呼=${greeting}, 收尾=${closing}`;
    })
    .join("\n");

export const renderPrompt = (config: PromptConfig, input: string, count: number, styles: string) =>
  config.template
    .replace("{{input}}", input)
    .replace("{{count}}", String(count))
    .replace("{{styles}}", styles);
