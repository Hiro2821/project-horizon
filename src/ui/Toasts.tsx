import type { GlobeStatus } from '../globe/types';

interface ToastsProps {
  statuses: GlobeStatus[];
  onDismiss: (id: string) => void;
}

export function Toasts({ statuses, onDismiss }: ToastsProps) {
  if (statuses.length === 0) return null;
  return (
    <div className="toasts" role="status">
      {statuses.map((s) => (
        <div key={s.id} className={`toast ${s.level}`}>
          <span>{s.message}</span>
          <button type="button" className="icon-button" onClick={() => onDismiss(s.id)} aria-label="通知を閉じる">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
