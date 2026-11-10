import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LoadState } from './domain/types';
import type { PrefectureRecord } from './geo/prefectures';
import { loadPrefectures } from './geo/prefectures';
import type { GlobeStatus, ViewInfo } from './globe/types';
import { useHorizonGlobe } from './hooks/useHorizonGlobe';
import { withJstHour } from './lib/time';
import { CameraControls } from './ui/CameraControls';
import { LeftPanel } from './ui/LeftPanel';
import { RightPanel } from './ui/RightPanel';
import { Toasts } from './ui/Toasts';
import { TopBar } from './ui/TopBar';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [records, setRecords] = useState<PrefectureRecord[]>([]);
  const [dataState, setDataState] = useState<LoadState>('loading');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [view, setView] = useState<ViewInfo>({ regionName: '日本列島', heightM: 0 });
  const [clock, setClock] = useState<{ time: Date; speed: number }>({ time: new Date(), speed: 1 });
  const [statuses, setStatuses] = useState<GlobeStatus[]>([]);
  const [lighting, setLighting] = useState(true);
  const [boundaries, setBoundaries] = useState(true);
  const [leftOpen, setLeftOpen] = useState(() => window.matchMedia('(min-width: 900px)').matches);

  const pushStatus = useCallback((status: GlobeStatus) => {
    setStatuses((prev) => [...prev.filter((s) => s.id !== status.id), status]);
  }, []);

  const globe = useHorizonGlobe(containerRef, {
    onSelect: setSelectedCode,
    onView: setView,
    onClock: (time, speed) => setClock({ time, speed }),
    onStatus: pushStatus,
  });

  // 都道府県境界の読み込み（外部取得に失敗してもアプリ全体は動き続ける）
  useEffect(() => {
    let cancelled = false;
    loadPrefectures()
      .then((result) => {
        if (cancelled) return;
        setRecords(result.records);
        setDataState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDataState('error');
        pushStatus({
          id: 'prefectures',
          level: 'warn',
          message: `都道府県境界データを取得できませんでした。地図の表示は続行しますが、都道府県の選択は利用できません。（${
            error instanceof Error ? error.message.split('\n')[0] : String(error)
          }）`,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [pushStatus]);

  // データと3D描画層がそろったら境界を渡す
  useEffect(() => {
    if (globe && records.length > 0) globe.setPrefectures(records);
  }, [globe, records]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.info.code === selectedCode) ?? null,
    [records, selectedCode],
  );

  const selectPrefecture = useCallback(
    (code: string | null, fly: boolean) => {
      setSelectedCode(code);
      globe?.selectPrefecture(code, { fly });
    },
    [globe],
  );

  return (
    <div className="app">
      <div ref={containerRef} className="globe" />

      <TopBar regionName={view.regionName} heightM={view.heightM} gameTime={clock.time} speed={clock.speed} />

      <LeftPanel
        open={leftOpen}
        onToggle={() => setLeftOpen((v) => !v)}
        records={records}
        dataState={dataState}
        selectedCode={selectedCode}
        onSelectPrefecture={(code) => selectPrefecture(code, true)}
        onFlyCity={(id) => globe?.flyToCity(id)}
        onFlyJapan={() => globe?.flyToJapan()}
        lighting={lighting}
        onLighting={(value) => {
          setLighting(value);
          globe?.setLighting(value);
        }}
        boundaries={boundaries}
        onBoundaries={(value) => {
          setBoundaries(value);
          globe?.setBoundariesVisible(value);
        }}
        speed={clock.speed}
        onSpeed={(value) => globe?.setTimeSpeed(value)}
        onTimePreset={(hour) => globe?.setGameTime(withJstHour(clock.time, hour))}
        onTimeNow={() => globe?.setGameTime(new Date())}
      />

      <RightPanel
        record={selectedRecord}
        onClose={() => selectPrefecture(null, false)}
        onFly={(code) => selectPrefecture(code, true)}
      />

      <CameraControls
        onZoomIn={() => globe?.zoom(1)}
        onZoomOut={() => globe?.zoom(-1)}
        onNorth={() => globe?.resetNorth()}
        onJapan={() => globe?.flyToJapan()}
      />

      <Toasts
        statuses={statuses}
        onDismiss={(id) => setStatuses((prev) => prev.filter((s) => s.id !== id))}
      />
    </div>
  );
}
