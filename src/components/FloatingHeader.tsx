type FloatingHeaderProps = {
  onOpenMain: () => void;
  onClose: () => void;
};

const FloatingHeader = ({ onOpenMain, onClose }: FloatingHeaderProps) => (
  <header className="floating-header">
    <div>
      <p className="eyebrow">AgenType</p>
      <h1>浮窗模式</h1>
    </div>
    <div className="floating-actions">
      <button className="ghost" onClick={onOpenMain}>
        打开主界面
      </button>
      <button className="ghost" onClick={onClose}>
        隐藏
      </button>
    </div>
  </header>
);

export default FloatingHeader;
