import type { PrefectureInfo } from '../domain/types';
import { buildGeometry, type PrefectureGeometry } from './geometry';

export interface PrefectureRecord {
  info: PrefectureInfo;
  geometry: PrefectureGeometry;
}

export interface PrefectureLoadResult {
  records: PrefectureRecord[];
  sourceUrl: string;
}

/** 既定の取得先（dataofjapan/land: 地球地図日本を変換した都道府県GeoJSON）。出典は DATA_SOURCES.md を参照。 */
const DEFAULT_REMOTE_URL = 'https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson';
const FETCH_TIMEOUT_MS = 45_000;
const MIN_EXPECTED_PREFECTURES = 40;

interface RawFeature {
  properties?: Record<string, unknown> | null;
  geometry?: { type?: string; coordinates?: unknown } | null;
}

function pickString(props: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = props[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
}

function parseFeature(feature: RawFeature): PrefectureRecord | null {
  const props = feature.properties ?? {};
  const rawCode = pickString(props, ['id', 'code', 'JISCODE', 'N03_007']);
  const nameJa = pickString(props, ['nam_ja', 'name_ja', 'N03_001', 'pref', 'name']);
  if (!rawCode || !nameJa) return null;

  const g = feature.geometry;
  if (!g || !g.coordinates) return null;
  let rawPolygons: number[][][][];
  if (g.type === 'Polygon') rawPolygons = [g.coordinates as number[][][]];
  else if (g.type === 'MultiPolygon') rawPolygons = g.coordinates as number[][][][];
  else return null;

  const geometry = buildGeometry(rawPolygons);
  if (!geometry) return null;

  return {
    info: {
      code: rawCode.replace(/\D/g, '').padStart(2, '0'),
      nameJa,
      nameEn: pickString(props, ['nam', 'name_en', 'NAME_EN']),
    },
    geometry,
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    window.clearTimeout(timer);
  }
}

function parseCollection(json: unknown): PrefectureRecord[] {
  const features = (json as { features?: RawFeature[] } | null)?.features;
  if (!Array.isArray(features)) throw new Error('FeatureCollection ではありません');
  const records = features.map(parseFeature).filter((r): r is PrefectureRecord => r !== null);
  if (records.length < MIN_EXPECTED_PREFECTURES) {
    throw new Error(`都道府県数が想定より少ない (${records.length})`);
  }
  return records.sort((a, b) => a.info.code.localeCompare(b.info.code));
}

/**
 * 都道府県境界を読み込む。候補を順に試し、すべて失敗した場合のみ例外を投げる。
 * 1) VITE_PREFECTURES_URL  2) 同梱の public/data/japan.geojson  3) 既定の外部URL
 */
export async function loadPrefectures(): Promise<PrefectureLoadResult> {
  const candidates = [
    import.meta.env.VITE_PREFECTURES_URL?.trim(),
    `${import.meta.env.BASE_URL}data/japan.geojson`,
    DEFAULT_REMOTE_URL,
  ].filter((u): u is string => Boolean(u));

  const errors: string[] = [];
  for (const url of candidates) {
    try {
      const records = parseCollection(await fetchJson(url));
      return { records, sourceUrl: url };
    } catch (e) {
      errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(errors.join('\n'));
}
