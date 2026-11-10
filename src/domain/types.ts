/**
 * ドメイン層の型。3D描画(Cesium)にもUI(React)にも依存しない。
 * 人口・経済・交通・環境などの統計は StatModule として後から差し込む。
 */

/** 都道府県の識別情報（JIS X 0401 の2桁コード） */
export interface PrefectureInfo {
  code: string;
  nameJa: string;
  nameEn: string;
}

/** 統計値。出典を必ず伴う（架空の数値は登録しない） */
export interface StatValue {
  value: string;
  unit?: string;
  year?: number;
  source: string;
}

/** 将来の人口・経済・交通・環境データ等を登録するための共通インターフェース */
export interface StatModule {
  id: string;
  label: string;
  lookup(regionCode: string): StatValue | undefined;
}

export type LoadState = 'loading' | 'ready' | 'error';
