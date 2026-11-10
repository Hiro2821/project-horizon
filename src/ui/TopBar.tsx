import { formatGameTime, formatHeight } from '../lib/time';

interface TopBarProps {
  regionName: string;
  heightM: number;
  gameTime: Date;
  speed: number;
}

export function TopBar({ regionName, heightM, gameTime, speed }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-mark" aria-hidden="true" />
        <span className="logo-text">PROJECT HORIZON</span>
      </div>
      <div className="topbar-region" aria-live="polite">
        <span className="label">表示地域</span>
        <strong>{regionName}</strong>
        <span className="muted">高度 {formatHeight(heightM)}</span>
      </div>
      <div className="topbar-time">
        <span className="label">ゲーム内日時（JST）</span>
        <strong className="tabular">{formatGameTime(gameTime)}</strong>
        <span className="muted">{speed === 0 ? '停止中' : speed === 1 ? '等倍' : `×${speed.toLocaleString('ja-JP')}`}</span>
      </div>
    </header>
  );
}
