import { useMemo, useState } from 'react';
import { CITY_PRESETS } from '../data/cities';
import type { LoadState } from '../domain/types';
import type { PrefectureRecord } from '../geo/prefectures';
import { StatRows } from './StatRows';

interface LeftPanelProps {
  open: boolean;
  onToggle: () => void;
  records: PrefectureRecord[];
  dataState: LoadState;
  selectedCode: string | null;
  onSelectPrefecture: (code: string) => void;
  onFlyCity: (id: string) => void;
  onFlyJapan: () => void;
  lighting: boolean;
  onLighting: (value: boolean) => void;
  boundaries: boolean;
  onBoundaries: (value: boolean) => void;
  speed: number;
  onSpeed: (value: number) => void;
  onTimePreset: (hour: number) => void;
  onTimeNow: () => void;
}

const SPEEDS: Array<{ value: number; label: string }> = [
  { value: 0, label: '停止' },
  { value: 1, label: '等倍' },
  { value: 60, label: '×60（1分/秒）' },
  { value: 600, label: '×600（10分/秒）' },
  { value: 3600, label: '×3,600（1時間/秒）' },
];

const TIME_PRESETS: Array<{ hour: number; label: string }> = [
  { hour: 7, label: '朝' },
  { hour: 12, label: '昼' },
  { hour: 16, label: '夕' },
  { hour: 22, label: '夜' },
];

export function LeftPanel(props: LeftPanelProps) {
  const { records, selectedCode } = props;
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return records
      .filter(
        (r) => r.info.nameJa.includes(q) || r.info.nameEn.toLowerCase().includes(q) || r.info.code === q,
      )
      .slice(0, 8);
  }, [query, records]);

  const selected = records.find((r) => r.info.code === selectedCode);

  return (
    <>
      <button className="menu-toggle" type="button" onClick={props.onToggle} aria-expanded={props.open}>
        {props.open ? '閉じる' : 'メニュー'}
      </button>
      <aside className={`panel left-panel${props.open ? '' : ' collapsed'}`}>
        <section>
          <h2>地域検索</h2>
          <input
            type="search"
            value={query}
            placeholder={props.dataState === 'ready' ? '都道府県名・コードで検索' : '境界データ読み込み中…'}
            disabled={props.dataState !== 'ready'}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="都道府県を検索"
          />
          {results.length > 0 && (
            <ul className="result-list">
              {results.map((r) => (
                <li key={r.info.code}>
                  <button
                    type="button"
                    className={r.info.code === selectedCode ? 'active' : ''}
                    onClick={() => {
                      props.onSelectPrefecture(r.info.code);
                      setQuery('');
                    }}
                  >
                    <span>{r.info.nameJa}</span>
                    <span className="muted">{r.info.nameEn}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && results.length === 0 && props.dataState === 'ready' && (
            <p className="hint">該当する都道府県がありません。</p>
          )}
        </section>

        <section>
          <h2>国家情報</h2>
          <dl className="stat-rows">
            <div className="stat-row">
              <dt>国名</dt>
              <dd>日本</dd>
            </div>
            <div className="stat-row">
              <dt>都道府県数</dt>
              <dd>{props.dataState === 'ready' ? `${records.length}` : '—'}</dd>
            </div>
          </dl>
          <StatRows regionCode="JP" />
        </section>

        <section>
          <h2>地域情報</h2>
          <p className="hint">選択中: {selected ? selected.info.nameJa : '未選択（地図上の都道府県をクリック）'}</p>
          <div className="button-row">
            {CITY_PRESETS.map((city) => (
              <button key={city.id} type="button" onClick={() => props.onFlyCity(city.id)}>
                {city.nameJa}
              </button>
            ))}
            <button type="button" onClick={props.onFlyJapan}>
              日本全体
            </button>
          </div>
        </section>

        <section>
          <h2>設定</h2>
          <label className="switch">
            <input type="checkbox" checked={props.lighting} onChange={(e) => props.onLighting(e.target.checked)} />
            <span>昼夜表示（太陽光）</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={props.boundaries} onChange={(e) => props.onBoundaries(e.target.checked)} />
            <span>都道府県境界線</span>
          </label>
          <div className="field">
            <span className="label">時刻（JST）</span>
            <div className="button-row">
              {TIME_PRESETS.map((p) => (
                <button key={p.hour} type="button" onClick={() => props.onTimePreset(p.hour)}>
                  {p.label}
                </button>
              ))}
              <button type="button" onClick={props.onTimeNow}>
                現在
              </button>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="speed">
              時間の進み方
            </label>
            <select id="speed" value={props.speed} onChange={(e) => props.onSpeed(Number(e.target.value))}>
              {SPEEDS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </section>
      </aside>
    </>
  );
}
