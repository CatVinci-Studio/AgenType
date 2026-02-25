import { useRef } from "react";
import type { ChangeEvent, ClipboardEvent } from "react";
import { OCR_OPTIONS } from "../../lib/constants";
import type { OcrMode } from "../../lib/types";
import type { Translator } from "../../lib/i18n";

type InputPanelProps = {
  inputText: string;
  inputMode: "text" | "image";
  hotkey?: string;
  showHotkey?: boolean;
  showCapture?: boolean;
  showOcrMode?: boolean;
  showClipboard?: boolean;
  ocrMode?: OcrMode;
  onChangeText: (value: string) => void;
  onChangeMode: (mode: "text" | "image") => void;
  onCapture?: () => void;
  onGenerate: () => void;
  onClear: () => void;
  onChangeOcrMode?: (value: OcrMode) => void;
  onReadClipboard?: () => void;
  onImageFile?: (file: File) => void;
  imagePreviewUrl?: string | null;
  t: Translator;
};

const InputPanel = ({
  inputText,
  inputMode,
  hotkey,
  showHotkey = true,
  showCapture = false,
  showOcrMode = false,
  showClipboard,
  ocrMode,
  onChangeText,
  onChangeMode,
  onCapture,
  onGenerate,
  onClear,
  onChangeOcrMode,
  onReadClipboard,
  onImageFile,
  imagePreviewUrl,
  t,
}: InputPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isTextMode = inputMode === "text";
  const isImageMode = inputMode === "image";
  const canCapture = Boolean(showCapture && onCapture);
  const canShowOcr = Boolean(showOcrMode && onChangeOcrMode && ocrMode);
  const canReadClipboard = Boolean(isTextMode && (showClipboard ?? true) && onReadClipboard);
  const canUploadImage = Boolean(isImageMode && onImageFile);

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!onImageFile) {
      return;
    }
    const items = event.clipboardData?.items ?? [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          onImageFile(file);
          return;
        }
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImageFile) {
      onImageFile(file);
    }
    event.target.value = "";
  };

  return (
    <section className="panel panel-primary">
      <div className="panel-header">
        <h2>{t("panel.input")}</h2>
        {showHotkey && hotkey ? <div className="chip">{t("label.hotkey")}: {hotkey}</div> : null}
      </div>
      <div className="input-tabs">
        <button
          type="button"
          className={`tab ${isTextMode ? "active" : ""}`}
          onClick={() => onChangeMode("text")}
        >
          {t("tab.textInput")}
        </button>
        <button
          type="button"
          className={`tab ${isImageMode ? "active" : ""}`}
          onClick={() => onChangeMode("image")}
        >
          {t("tab.imageInput")}
        </button>
      </div>
      {canCapture ? (
        <div className="actions">
          <button className="primary" onClick={onCapture}>
            {t("action.capture")}
          </button>
        </div>
      ) : null}
      {canShowOcr ? (
        <div className="inline-settings">
          <div>
            <span>{t("label.ocrMode")}</span>
            <select value={ocrMode} onChange={(event) => onChangeOcrMode?.(event.target.value as OcrMode)}>
              {OCR_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`ocr.${value}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
      {isTextMode ? (
        <div className="textarea-block">
          <label htmlFor="input">{t("label.replyInput")}</label>
          <textarea
            id="input"
            value={inputText}
            onChange={(event) => onChangeText(event.target.value)}
            placeholder={t("placeholder.input")}
          />
        </div>
      ) : (
        <div
          className="image-input"
          tabIndex={0}
          role="region"
          aria-label={t("tab.imageInput")}
          onPaste={handlePaste}
          onClick={(event) => event.currentTarget.focus()}
        >
          {imagePreviewUrl ? (
            <img className="image-preview" src={imagePreviewUrl} alt={t("tab.imageInput")} />
          ) : (
            <div className="image-placeholder">{t("hint.pasteImage")}</div>
          )}
        </div>
      )}
      <div className="actions">
        {canReadClipboard ? <button onClick={onReadClipboard}>{t("action.clipboardText")}</button> : null}
        {canUploadImage ? (
          <button onClick={() => fileInputRef.current?.click()}>{t("action.uploadImage")}</button>
        ) : null}
      </div>
      <div className="actions">
        <button onClick={onGenerate}>{t("action.generate")}</button>
        <button className="ghost" onClick={onClear}>
          {t("action.clear")}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </section>
  );
};

export default InputPanel;
