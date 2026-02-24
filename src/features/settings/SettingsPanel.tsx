import { LANGUAGE_OPTIONS, LENGTH_OPTIONS, TONE_OPTIONS } from "../../lib/constants";
import type { Settings, Slot } from "../../lib/types";
import { getDefaultHotkey } from "../../lib/settings";
import type { Translator } from "../../lib/i18n";

type SettingsPanelProps = {
  settings: Settings;
  apiKey: string;
  promptPath: string;
  onApiKeyChange: (value: string) => void;
  onSaveApiKey: () => void;
  onSettingsChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onOpenPromptFile: () => void;
  onUpdateSlot: (slotId: string, patch: Partial<Slot>) => void;
  t: Translator;
};

const SettingsPanel = ({
  settings,
  apiKey,
  promptPath,
  onApiKeyChange,
  onSaveApiKey,
  onSettingsChange,
  onOpenPromptFile,
  onUpdateSlot,
  t,
}: SettingsPanelProps) => (
  <section className="panel panel-settings">
    <div className="panel-header">
      <h2>{t("panel.settings")}</h2>
      <span className="chip">AgenType</span>
    </div>
    <div className="settings-grid">
      <div className="setting-block">
        <label>{t("label.apiKey")}</label>
        <div className="row">
          <input type="password" value={apiKey} placeholder="sk-..." onChange={(event) => onApiKeyChange(event.target.value)} />
          <button className="primary" onClick={onSaveApiKey}>
            {t("action.save")}
          </button>
        </div>
      </div>
      <div className="setting-block">
        <label>{t("label.language")}</label>
        <div className="row">
          <select
            value={settings.uiLanguage}
            onChange={(event) => onSettingsChange("uiLanguage", event.target.value as Settings["uiLanguage"])}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`language.${option}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="setting-block">
        <label>{t("label.model")}</label>
        <div className="row">
          <input
            value={settings.modelText}
            onChange={(event) => onSettingsChange("modelText", event.target.value)}
            placeholder={t("label.modelText")}
            list="model-options"
          />
          <input
            value={settings.modelVision}
            onChange={(event) => onSettingsChange("modelVision", event.target.value)}
            placeholder={t("label.modelVision")}
            list="model-options"
          />
          <datalist id="model-options">
            {settings.modelOptions.map((model) => (
              <option value={model} key={model} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="setting-block">
        <label>{t("label.hotkey")}</label>
        <div className="row">
          <input
            value={settings.hotkey}
            onChange={(event) => onSettingsChange("hotkey", event.target.value)}
            placeholder={getDefaultHotkey()}
          />
          <button onClick={() => onSettingsChange("hotkey", getDefaultHotkey())}>{t("action.reset")}</button>
        </div>
      </div>
      <div className="setting-block">
        <label>{t("label.promptFile")}</label>
        <div className="row">
          <input value={promptPath} readOnly />
          <button onClick={onOpenPromptFile}>{t("action.open")}</button>
        </div>
      </div>
      <div className="setting-block">
        <label>{t("label.historyLimit")}</label>
        <div className="row">
          <input
            type="number"
            min="10"
            max="200"
            value={settings.historyLimit}
            onChange={(event) => onSettingsChange("historyLimit", Number(event.target.value))}
          />
          <span className="hint">{t("hint.historyLimit")}</span>
        </div>
      </div>
    </div>

    <div className="slot-config">
      <h3>{t("panel.slotStyles")}</h3>
      <div className="slot-list">
        {settings.slots.map((slot) => (
          <div className="slot-card" key={slot.id}>
            <div className="slot-title">
              <input value={slot.name} onChange={(event) => onUpdateSlot(slot.id, { name: event.target.value })} />
              <span className="tag subtle">{slot.id}</span>
            </div>
            <div className="slot-fields">
              <select value={slot.toneClass} onChange={(event) => onUpdateSlot(slot.id, { toneClass: event.target.value })}>
                {TONE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`tone.${option}`)}
                  </option>
                ))}
              </select>
              <select value={slot.language} onChange={(event) => onUpdateSlot(slot.id, { language: event.target.value as Slot["language"] })}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`language.${option}`)}
                  </option>
                ))}
              </select>
              <select value={slot.length} onChange={(event) => onUpdateSlot(slot.id, { length: event.target.value as Slot["length"] })}>
                {LENGTH_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`length.${option}`)}
                  </option>
                ))}
              </select>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={slot.greeting}
                  onChange={(event) => onUpdateSlot(slot.id, { greeting: event.target.checked })}
                />
                <span>{t("label.greeting")}</span>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={slot.closing}
                  onChange={(event) => onUpdateSlot(slot.id, { closing: event.target.checked })}
                />
                <span>{t("label.closing")}</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SettingsPanel;
