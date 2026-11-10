interface CameraControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onNorth: () => void;
  onJapan: () => void;
}

export function CameraControls({ onZoomIn, onZoomOut, onNorth, onJapan }: CameraControlsProps) {
  return (
    <div className="camera-controls">
      <p className="hint controls-hint">ドラッグ: 回転 / ホイール・ピンチ: ズーム / 右ドラッグ・二本指: 傾き</p>
      <div className="control-stack">
        <button type="button" onClick={onZoomIn} aria-label="ズームイン">
          ＋
        </button>
        <button type="button" onClick={onZoomOut} aria-label="ズームアウト">
          －
        </button>
        <button type="button" onClick={onNorth} aria-label="北を上にする">
          N
        </button>
      </div>
      <button type="button" className="primary" onClick={onJapan}>
        日本全体へ戻る
      </button>
    </div>
  );
}
