/** 純粋な地理計算（Cesium非依存）。経度・緯度は度。 */

export type LonLat = [number, number];
export type Ring = LonLat[];
/** [外周, ...穴] */
export type PolygonGeom = Ring[];
/** [west, south, east, north] */
export type BBox = [number, number, number, number];

export interface PrefectureGeometry {
  polygons: PolygonGeom[];
  bbox: BBox;
  /** 最も大きいポリゴン（離島を除いた本体）の範囲 */
  mainBBox: BBox;
}

/** 描画負荷を抑えるための間引き間隔（約600m）。 */
const MIN_STEP_DEG = 0.006;
/** これより小さい島（約2km未満）は強調表示・選択の対象にしない。 */
const MIN_POLYGON_SPAN_DEG = 0.02;

export function bboxOf(ring: Ring): BBox {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < w) w = lon;
    if (lon > e) e = lon;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  return [w, s, e, n];
}

function mergeBBox(a: BBox, b: BBox): BBox {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

function bboxArea(b: BBox): number {
  return (b[2] - b[0]) * (b[3] - b[1]);
}

function decimateRing(raw: number[][]): Ring | null {
  if (raw.length < 4) return null;
  const first: LonLat = [raw[0][0], raw[0][1]];
  const out: Ring = [first];
  let last = first;
  for (let i = 1; i < raw.length - 1; i++) {
    const p: LonLat = [raw[i][0], raw[i][1]];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= MIN_STEP_DEG) {
      out.push(p);
      last = p;
    }
  }
  out.push(first); // 閉じたリングにする
  return out.length >= 4 ? out : null;
}

/** GeoJSON の MultiPolygon 座標列から、間引き済みの描画・判定用ジオメトリを作る。 */
export function buildGeometry(rawPolygons: number[][][][]): PrefectureGeometry | null {
  const polygons: PolygonGeom[] = [];
  let bbox: BBox | null = null;
  let mainBBox: BBox | null = null;

  for (const rawPoly of rawPolygons) {
    let outer: Ring | null = null;
    const holes: Ring[] = [];
    for (let i = 0; i < rawPoly.length; i++) {
      const ring = decimateRing(rawPoly[i]);
      if (!ring) continue;
      if (i === 0) outer = ring;
      else holes.push(ring);
    }
    if (!outer) continue;
    const b = bboxOf(outer);
    if (b[2] - b[0] < MIN_POLYGON_SPAN_DEG && b[3] - b[1] < MIN_POLYGON_SPAN_DEG) continue;

    polygons.push([outer, ...holes]);
    bbox = bbox ? mergeBBox(bbox, b) : b;
    if (!mainBBox || bboxArea(b) > bboxArea(mainBBox)) mainBBox = b;
  }

  if (!bbox || !mainBBox) return null;
  return { polygons, bbox, mainBBox };
}

export function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function containsPoint(geometry: PrefectureGeometry, lon: number, lat: number): boolean {
  const [w, s, e, n] = geometry.bbox;
  if (lon < w || lon > e || lat < s || lat > n) return false;
  for (const [outer, ...holes] of geometry.polygons) {
    if (!pointInRing(lon, lat, outer)) continue;
    if (holes.some((hole) => pointInRing(lon, lat, hole))) continue;
    return true;
  }
  return false;
}
