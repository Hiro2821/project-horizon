/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cesium ion アクセストークン（任意。Cesium World Terrain 用） */
  readonly VITE_CESIUM_ION_TOKEN?: string;
  /** 都道府県境界 GeoJSON の取得先（任意） */
  readonly VITE_PREFECTURES_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
