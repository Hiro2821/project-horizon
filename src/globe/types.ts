/** 3D描画層とUI層の境界となる型。Cesiumには依存しない。 */

export interface ViewInfo {
  /** 画面中央が指す地域名 */
  regionName: string;
  /** カメラ高度 (m) */
  heightM: number;
}

export interface GlobeStatus {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface GlobeHandlers {
  onSelect: (code: string | null) => void;
  onView: (info: ViewInfo) => void;
  onClock: (time: Date, speed: number) => void;
  onStatus: (status: GlobeStatus) => void;
}
