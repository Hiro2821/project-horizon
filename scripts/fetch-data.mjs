// 都道府県境界 GeoJSON を public/data/ に同梱するためのスクリプト（任意）。
// 使い方: npm run fetch-data
// 同梱すると、実行時の外部取得（raw.githubusercontent.com）に依存せずGitHub Pagesで配信できる。
// データの出典・利用条件は DATA_SOURCES.md を必ず確認すること。

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson';
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../public/data/japan.geojson');

const res = await fetch(SOURCE_URL);
if (!res.ok) {
  console.error(`取得に失敗しました: HTTP ${res.status} (${SOURCE_URL})`);
  process.exit(1);
}
const text = await res.text();
const json = JSON.parse(text); // 妥当なJSONか検証
if (!Array.isArray(json.features) || json.features.length < 40) {
  console.error('想定した都道府県データではありません。保存を中止しました。');
  process.exit(1);
}

await mkdir(dirname(out), { recursive: true });
await writeFile(out, text, 'utf8');
console.log(`保存しました: ${out}（${json.features.length} features）`);
console.log('出典: 地球地図日本（国土地理院）/ dataofjapan/land。利用条件は DATA_SOURCES.md を参照。');
