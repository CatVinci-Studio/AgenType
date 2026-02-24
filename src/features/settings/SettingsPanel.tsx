import { LANGUAGE_OPTIONS, LENGTH_OPTIONS, TONE_OPTIONS } from "../../lib/constants";
import type { Settings, Slot } from "../../lib/types";
import { getDefaultHotkey } from "../../lib/settings";

type SettingsPanelProps = {
  settings: Settings;
  apiKey: string;
  promptPath: string;
  onApiKeyChange: (value: string) => void;
  onSaveApiKey: () => void;
  onSettingsChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onOpenPromptFile: () => void;
  onUpdateSlot: (slotId: string, patch: Partial<Slot>) => void;
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
}: SettingsPanelProps) => (
  <section className="panel panel-settings">
    <div className="panel-header">
      <h2>设置</h2>
      <span className="chip">AgenType</span>
    </div>
    <div className="settings-grid">
      <div className="setting-block">
        <label>OpenAI API Key</label>
        <div className="row">
          <input type="password" value={apiKey} placeholder="sk-..." onChange={(event) => onApiKeyChange(event.target.value)} />
          <button className="primary" onClick={onSaveApiKey}>
            保存
          </button>
        </div>
      </div>
      <div className="setting-block">
        <label>模型选择</label>
        <div className="row">
          <input
            value={settings.modelText}
            onChange={(event) => onSettingsChange("modelText", event.target.value)}
            placeholder="文本模型"
            list="model-options"
          />
          <input
            value={settings.modelVision}
            onChange={(event) => onSettingsChange("modelVision", event.target.value)}
            placeholder="视觉模型"
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
        <label>快捷键</label>
        <div className="row">
          <input
            value={settings.hotkey}
            onChange={(event) => onSettingsChange("hotkey", event.target.value)}
            placeholder={getDefaultHotkey()}
          />
          <button onClick={() => onSettingsChange("hotkey", getDefaultHotkey())}>恢复默认</button>
        </div>
      </div>
      <div className="setting-block">
        <label>Prompt 文件</label>
        <div className="row">
          <input value={promptPath} readOnly />
          <button onClick={onOpenPromptFile}>打开</button>
        </div>
      </div>
      <div className="setting-block">
        <label>历史记录上限</label>
        <div className="row">
          <input
            type="number"
            min="10"
            max="200"
            value={settings.historyLimit}
            onChange={(event) => onSettingsChange("historyLimit", Number(event.target.value))}
          />
          <span className="hint">建议 50</span>
        </div>
      </div>
    </div>

    <div className="slot-config">
      <h3>候选槽位风格</h3>
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
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select value={slot.language} onChange={(event) => onUpdateSlot(slot.id, { language: event.target.value as Slot["language"] })}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select value={slot.length} onChange={(event) => onUpdateSlot(slot.id, { length: event.target.value as Slot["length"] })}>
                {LENGTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={slot.greeting}
                  onChange={(event) => onUpdateSlot(slot.id, { greeting: event.target.checked })}
                />
                <span>称呼</span>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={slot.closing}
                  onChange={(event) => onUpdateSlot(slot.id, { closing: event.target.checked })}
                />
                <span>收尾</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SettingsPanel;
