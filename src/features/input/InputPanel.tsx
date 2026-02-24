import { OCR_OPTIONS } from "../../lib/constants";
import type { OcrMode } from "../../lib/types";
import type { Translator } from "../../lib/i18n";

type InputPanelProps = {
  inputText: string;
  hotkey: string;
  ocrMode: OcrMode;
  candidateCount: number;
  historyEnabled: boolean;
  onChangeText: (value: string) => void;
  onCapture: () => void;
  onClipboard: () => void;
  onGenerate: () => void;
  onClear: () => void;
  onChangeOcrMode: (value: OcrMode) => void;
  onChangeCandidateCount: (value: number) => void;
  onChangeHistoryEnabled: (value: boolean) => void;
  t: Translator;
};

const InputPanel = ({
  inputText,
  hotkey,
  ocrMode,
  candidateCount,
  historyEnabled,
  onChangeText,
  onCapture,
  onClipboard,
  onGenerate,
  onClear,
  onChangeOcrMode,
  onChangeCandidateCount,
  onChangeHistoryEnabled,
  t,
}: InputPanelProps) => (
  <section className="panel panel-primary">
    <div className="panel-header">
      <h2>{t("panel.input")}</h2>
      <div className="chip">{t("label.hotkey")}: {hotkey}</div>
    </div>
    <div className="actions">
      <button className="primary" onClick={onCapture}>
        {t("action.capture")}
      </button>
      <button onClick={onClipboard}>{t("action.clipboardText")}</button>
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
      <div>
        <span>{t("label.candidateCount")}</span>
        <select
          value={candidateCount}
          onChange={(event) => onChangeCandidateCount(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span>{t("label.history")}</span>
        <select
          value={historyEnabled ? "on" : "off"}
          onChange={(event) => onChangeHistoryEnabled(event.target.value === "on")}
        >
          <option value="on">{t("toggle.on")}</option>
          <option value="off">{t("toggle.off")}</option>
        </select>
      </div>
    </div>
  </section>
);

export default InputPanel;
