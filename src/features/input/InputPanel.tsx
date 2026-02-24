import { OCR_LABELS } from "../../lib/constants";
import type { OcrMode } from "../../lib/types";

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
}: InputPanelProps) => (
  <section className="panel panel-primary">
    <div className="panel-header">
      <h2>输入与触发</h2>
      <div className="chip">快捷键：{hotkey}</div>
    </div>
    <div className="actions">
      <button className="primary" onClick={onCapture}>
        截图并生成
      </button>
      <button onClick={onClipboard}>读取剪贴板文本</button>
    </div>
    <div className="textarea-block">
      <label htmlFor="input">需要回复的内容</label>
      <textarea
        id="input"
        value={inputText}
        onChange={(event) => onChangeText(event.target.value)}
        placeholder="粘贴或输入对方的邮件/消息内容..."
      />
    </div>
    <div className="actions">
      <button onClick={onGenerate}>仅用文本生成</button>
      <button className="ghost" onClick={onClear}>
        清空输入
      </button>
    </div>
    <div className="inline-settings">
      <div>
        <span>OCR 模式</span>
        <select value={ocrMode} onChange={(event) => onChangeOcrMode(event.target.value as OcrMode)}>
          {Object.entries(OCR_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span>候选数量</span>
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
        <span>历史记录</span>
        <select
          value={historyEnabled ? "on" : "off"}
          onChange={(event) => onChangeHistoryEnabled(event.target.value === "on")}
        >
          <option value="on">开启</option>
          <option value="off">关闭</option>
        </select>
      </div>
    </div>
  </section>
);

export default InputPanel;
