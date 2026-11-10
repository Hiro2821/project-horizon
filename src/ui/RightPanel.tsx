import type { PrefectureRecord } from '../geo/prefectures';
import { StatRows } from './StatRows';

interface RightPanelProps {
  record: PrefectureRecord | null;
  onClose: () => void;
  onFly: (code: string) => void;
}

export function RightPanel({ record, onClose, onFly }: RightPanelProps) {
  if (!record) return null;
  const { info, geometry } = record;
  const [w, s, e, n] = geometry.mainBBox;

  return (
    <aside className="panel right-panel" aria-label={`${info.nameJa}の情報`}>
      <div className="panel-head">
        <div>
          <span className="label">選択中の都道府県</span>
          <h2 className="pref-name">{info.nameJa}</h2>
          {info.nameEn && <span className="muted">{info.nameEn}</span>}
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="閉じる">
          ×
        </button>
      </div>

      <dl className="stat-rows">
        <div className="stat-row">
          <dt>都道府県コード</dt>
          <dd className="tabular">{info.code}</dd>
        </div>
        <div className="stat-row">
          <dt>境界範囲の中心</dt>
          <dd className="tabular">
            {((s + n) / 2).toFixed(2)}°N, {((w + e) / 2).toFixed(2)}°E
          </dd>
        </div>
      </dl>

      <h3>統計情報</h3>
      <StatRows regionCode={info.code} />

      <button type="button" className="primary" onClick={() => onFly(info.code)}>
        この地域へ移動
      </button>
      <p className="hint">
        境界データ: 地球地図日本（国土地理院）。統計は出典付きのデータが登録されるまで表示しません。
      </p>
    </aside>
  );
}
