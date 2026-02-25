import { LANGUAGE_OPTIONS, LENGTH_OPTIONS, TONE_OPTIONS } from "../../lib/constants";
import type { Settings, Slot } from "../../lib/types";
import { getDefaultHotkey } from "../../lib/settings";
import type { Translator } from "../../lib/i18n";

type SettingsPanelProps = {
  settings: Settings;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onSaveApiKey: () => void;
  onSettingsChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onUpdateSlot: (slotId: string, patch: Partial<Slot>) => void;
  onAddSlot: () => void;
  onRemoveSlot: (slotId: string) => void;
  showHotkey?: boolean;
  t: Translator;
};

const SettingsPanel = ({
  settings,
  apiKey,
  onApiKeyChange,
  onSaveApiKey,
  onSettingsChange,
  onUpdateSlot,
  onAddSlot,
  onRemoveSlot,
  showHotkey = true,
  t,
}: SettingsPanelProps) => (
  <section className="panel panel-settings">
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
          {settings.modelOptions.length === 0 ? (
            <select value="" disabled>
              <option value="">{t("hint.modelsEmpty")}</option>
            </select>
          ) : (
            <select value={settings.model} onChange={(event) => onSettingsChange("model", event.target.value)}>
              {(settings.modelOptions.includes(settings.model)
                ? settings.modelOptions
                : [settings.model, ...settings.modelOptions]
              ).map((model) => (
                <option value={model} key={model}>
                  {model}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {showHotkey ? (
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
      ) : null}
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
      <div className="slot-header">
        <h3>{t("panel.slotStyles")}</h3>
        <div className="slot-actions">
          <button onClick={onAddSlot} disabled={settings.slots.length >= 8}>
            {t("action.addSlot")}
          </button>
        </div>
      </div>
      <div className="slot-list">
        {settings.slots.map((slot) => (
          <div className="slot-card" key={slot.id}>
            <div className="slot-title">
              <div className="slot-name">
                <label>{t("label.slotName")}</label>
                <input value={slot.name} onChange={(event) => onUpdateSlot(slot.id, { name: event.target.value })} />
              </div>
              <button
                className="ghost"
                onClick={() => onRemoveSlot(slot.id)}
                disabled={settings.slots.length <= 1}
              >
                {t("action.removeSlot")}
              </button>
            </div>
            <div className="slot-fields">
              <div className="slot-field">
                <label>{t("label.tone")}</label>
                <select value={slot.toneClass} onChange={(event) => onUpdateSlot(slot.id, { toneClass: event.target.value })}>
                  {TONE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t(`tone.${option}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="slot-field">
                <label>{t("label.outputLanguage")}</label>
                <select value={slot.language} onChange={(event) => onUpdateSlot(slot.id, { language: event.target.value as Slot["language"] })}>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t(`language.${option}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="slot-field">
                <label>{t("label.length")}</label>
                <select value={slot.length} onChange={(event) => onUpdateSlot(slot.id, { length: event.target.value as Slot["length"] })}>
                  {LENGTH_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t(`length.${option}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="slot-field">
                <label>{t("label.emailFormat")}</label>
                <select
                  value={slot.emailFormat ? "yes" : "no"}
                  onChange={(event) => onUpdateSlot(slot.id, { emailFormat: event.target.value === "yes" })}
                >
                  <option value="yes">{t("option.yes")}</option>
                  <option value="no">{t("option.no")}</option>
                </select>
              </div>
              <div className="slot-field full">
                <label>{t("label.slotDescription")}</label>
                <input
                  value={slot.description}
                  onChange={(event) => onUpdateSlot(slot.id, { description: event.target.value })}
                  placeholder={t("placeholder.slotDescription")}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SettingsPanel;
