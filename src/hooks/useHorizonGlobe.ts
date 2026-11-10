import { useEffect, useRef, useState, type RefObject } from 'react';
import { HorizonGlobe } from '../globe/HorizonGlobe';
import type { GlobeHandlers } from '../globe/types';

/**
 * HorizonGlobe を一度だけ生成して返す。
 * ハンドラは ref 経由で最新のものを参照するため、Reactの再描画でViewerが作り直されることはない。
 */
export function useHorizonGlobe(
  containerRef: RefObject<HTMLDivElement | null>,
  handlers: GlobeHandlers,
): HorizonGlobe | null {
  const [globe, setGlobe] = useState<HorizonGlobe | null>(null);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let instance: HorizonGlobe | null = null;
    try {
      instance = new HorizonGlobe(element, {
        onSelect: (code) => handlersRef.current.onSelect(code),
        onView: (info) => handlersRef.current.onView(info),
        onClock: (time, speed) => handlersRef.current.onClock(time, speed),
        onStatus: (status) => handlersRef.current.onStatus(status),
      });
      setGlobe(instance);
    } catch (e) {
      handlersRef.current.onStatus({
        id: 'webgl',
        level: 'error',
        message: `3D表示を初期化できませんでした（WebGL が利用できない可能性があります）: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
    }

    return () => {
      instance?.destroy();
      setGlobe(null);
    };
  }, [containerRef]);

  return globe;
}
