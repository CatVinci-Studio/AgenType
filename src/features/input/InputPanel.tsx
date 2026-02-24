import { useState } from "react";
import { OCR_OPTIONS } from "../../lib/constants";
import type { OcrMode } from "../../lib/types";
import type { Translator } from "../../lib/i18n";

type InputPanelProps = {
  inputText: string;
  hotkey: string;
  ocrMode: OcrMode;
  onChangeText: (value: string) => void;
  onCapture: () => void;
  onGenerate: () => void;
  onClear: () => void;
  onChangeOcrMode: (value: OcrMode) => void;
  onReadClipboard: () => void;
  t: Translator;
};

const InputPanel = ({
  inputText,
  hotkey,
  ocrMode,
  onChangeText,
  onCapture,
  onGenerate,
  onClear,
  onChangeOcrMode,
  onReadClipboard,
  t,
}: InputPanelProps) => {
  const [activeTab, setActiveTab] = useState<"capture" | "clipboard">("capture");

  return (
    <section className="panel panel-primary">
      <div className="panel-header">
        <h2>{t("panel.input")}</h2>
        <div className="chip">{t("label.hotkey")}: {hotkey}</div>
      </div>
      <div className="tab-bar">
        <button
          className={`tab ${activeTab === "capture" ? "active" : ""}`}
          onClick={() => setActiveTab("capture")}
        >
          {t("tab.captureImage")}
        </button>
        <button
          className={`tab ${activeTab === "clipboard" ? "active" : ""}`}
          onClick={() => setActiveTab("clipboard")}
        >
          {t("tab.clipboardText")}
        </button>
      </div>
      {activeTab === "capture" ? (
        <div className="tab-panel">
          <div className="actions">
            <button className="primary" onClick={onCapture}>
              {t("action.capture")}
            </button>
          </div>
          <div className="inline-settings">
            <div>
              <span>{t("label.ocrMode")}</span>
              <select value={ocrMode} onChange={(event) => onChangeOcrMode(event.target.value as OcrMode)}>
                {OCR_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {t(`ocr.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="tab-panel">
          <div className="actions">
            <button onClick={onReadClipboard}>{t("action.clipboardText")}</button>
          </div>
          <div className="textarea-block">
            <label htmlFor="input">{t("label.replyInput")}</label>
            <textarea
              id="input"
              value={inputText}
              onChange={(event) => onChangeText(event.target.value)}
              placeholder={t("placeholder.input")}
            />
          </div>
          <div className="actions">
            <button onClick={onGenerate}>{t("action.generate")}</button>
            <button className="ghost" onClick={onClear}>
              {t("action.clear")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default InputPanel;
