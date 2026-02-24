import StatusBadge from "./StatusBadge";
import type { Status } from "../lib/types";

type AppHeaderProps = {
  status: Status;
  onReloadPrompts: () => void;
  onOpenFloating: () => void;
};

const AppHeader = ({ status, onReloadPrompts, onOpenFloating }: AppHeaderProps) => (
  <header className="app-header">
    <div>
      <p className="eyebrow">AgenType</p>
      <h1>一键截取 · 多风格回复 · 快速插入</h1>
      <p className="subhead">全局快捷键触发截图与剪贴板读取，生成多个候选回复并直接插入当前输入框。</p>
    </div>
    <div className="status-block">
      <StatusBadge status={status} />
      <button className="ghost" onClick={onReloadPrompts}>
        重新加载 Prompt
      </button>
      <button className="ghost" onClick={onOpenFloating}>
        打开浮窗
      </button>
    </div>
  </header>
);

export default AppHeader;
