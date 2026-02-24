import type { Candidate, HistoryEntry } from "../../lib/types";
import { formatLocalTime } from "../../lib/utils";

type HistoryPanelProps = {
  history: HistoryEntry[];
  historyEnabled: boolean;
  selectedHistoryId?: string;
  onSelect?: (id: string) => void;
  onCopy: (text: string) => void;
  onInsert?: (text: string) => void;
  variant?: "compact" | "full";
};

const renderActions = (candidates: Candidate[], onCopy: (text: string) => void) =>
  candidates.slice(0, 1).map((candidate) => (
    <button key={candidate.id} onClick={() => onCopy(candidate.text)}>
      复制
    </button>
  ));

const HistoryPanel = ({
  history,
  historyEnabled,
  selectedHistoryId,
  onSelect,
  onCopy,
  onInsert,
  variant = "full",
}: HistoryPanelProps) => (
  <section className="panel panel-history">
    <div className="panel-header">
      <h2>历史记录</h2>
      <span className="chip">{history.length} 条</span>
    </div>
    {!historyEnabled ? (
      <div className="empty">历史记录已关闭。</div>
    ) : history.length === 0 ? (
      <div className="empty">暂无历史记录。</div>
    ) : (
      <div className="history-list">
        {(variant === "compact" ? history.slice(0, 6) : history).map((entry) => (
          <div
            className={`history-item ${entry.id === selectedHistoryId ? "active" : ""}`}
            key={entry.id}
          >
            <div>
              <span className="tag subtle">{formatLocalTime(entry.createdAt)}</span>
              <p>{entry.input || "(截图内容)"}</p>
            </div>
            <div className="history-actions">
              {variant === "full" && onSelect ? <button onClick={() => onSelect(entry.id)}>查看</button> : null}
              {renderActions(entry.candidates, onCopy)}
            </div>
          </div>
        ))}
      </div>
    )}
    {variant === "full" && onInsert && selectedHistoryId ? (
      <HistoryDetail
        entry={history.find((item) => item.id === selectedHistoryId)}
        onCopy={onCopy}
        onInsert={onInsert}
      />
    ) : null}
  </section>
);

type HistoryDetailProps = {
  entry?: HistoryEntry;
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
};

const HistoryDetail = ({ entry, onCopy, onInsert }: HistoryDetailProps) => {
  if (!entry) {
    return null;
  }

  return (
    <div className="history-detail">
      <div className="panel-header">
        <h3>历史详情</h3>
        <span className="chip">{entry.candidates.length} 条</span>
      </div>
      <div className="candidate-list">
        {entry.candidates.map((candidate) => (
          <div className="candidate-card" key={candidate.id}>
            <div className="candidate-head">
              <span className="tag">{candidate.id}</span>
            </div>
            <p>{candidate.text}</p>
            <div className="actions">
              <button className="primary" onClick={() => onCopy(candidate.text)}>
                复制
              </button>
              <button onClick={() => onInsert(candidate.text)}>插入</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPanel;
