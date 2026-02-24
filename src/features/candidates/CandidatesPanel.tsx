import type { Candidate, Slot } from "../../lib/types";

type CandidatesPanelProps = {
  candidates: Candidate[];
  slots: Slot[];
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
  title?: string;
};

const CandidatesPanel = ({ candidates, slots, onCopy, onInsert, title = "候选回复" }: CandidatesPanelProps) => (
  <section className="panel panel-candidates">
    <div className="panel-header">
      <h2>{title}</h2>
      <span className="chip">{candidates.length} 条</span>
    </div>
    {candidates.length === 0 ? (
      <div className="empty">等待生成回复。</div>
    ) : (
      <div className="candidate-list">
        {candidates.map((candidate) => {
          const slot = slots.find((item) => item.id === candidate.id);
          return (
            <div className="candidate-card" key={candidate.id}>
              <div className="candidate-head">
                <span className="tag">{slot?.name || candidate.id}</span>
                <span className="tag subtle">{slot?.language === "en" ? "EN" : "中文"}</span>
              </div>
              <p>{candidate.text}</p>
              <div className="actions">
                <button className="primary" onClick={() => onCopy(candidate.text)}>
                  复制
                </button>
                <button onClick={() => onInsert(candidate.text)}>插入</button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
);

export default CandidatesPanel;
