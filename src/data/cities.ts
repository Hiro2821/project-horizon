/** 主要都市のカメラプリセット。座標は各都市の代表的な地点（駅周辺）。 */
export interface CityPreset {
  id: string;
  nameJa: string;
  nameEn: string;
  lon: number;
  lat: number;
  /** ターゲットからカメラまでの距離 (m) */
  range: number;
  headingDeg: number;
  pitchDeg: number;
}

export const CITY_PRESETS: readonly CityPreset[] = [
  { id: 'tokyo', nameJa: '東京', nameEn: 'Tokyo', lon: 139.7671, lat: 35.6812, range: 42000, headingDeg: 0, pitchDeg: -40 },
  { id: 'osaka', nameJa: '大阪', nameEn: 'Osaka', lon: 135.5023, lat: 34.6937, range: 36000, headingDeg: 0, pitchDeg: -40 },
  { id: 'kyoto', nameJa: '京都', nameEn: 'Kyoto', lon: 135.7681, lat: 35.0116, range: 30000, headingDeg: 0, pitchDeg: -38 },
];
