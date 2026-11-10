# PROJECT HORIZON

現実の日本を3D空間に再現し、将来的に国家運営シミュレーションへ発展させるためのWebアプリの**初期基盤**です。
現段階の範囲は「3D地理空間」のみで、国家運営・経済シミュレーションは含みません。

## 技術構成

React 18 / TypeScript / Vite / CesiumJS / CSS（追加の描画ライブラリなし）

## 起動とビルド

```bash
npm install
npm run dev        # 開発サーバー
npm run typecheck  # 型チェック
npm run build      # 本番ビルド（dist/）
npm run preview    # ビルド結果の確認
npm run fetch-data # （任意）都道府県GeoJSONを public/data/ に同梱
```

### 環境変数（すべて任意、`.env.example` 参照）

| 変数 | 内容 |
| --- | --- |
| `VITE_CESIUM_ION_TOKEN` | 設定すると Cesium World Terrain（3D標高）を使用。未設定なら地形は平坦で、地理院の陰影起伏図で起伏を表現 |
| `VITE_PREFECTURES_URL` | 都道府県境界GeoJSONの取得先を上書き |
| `VITE_BASE` | 絶対パスのbaseが必要な場合のみ（既定は相対パス `./`） |

`VITE_` 付きの値はビルド成果物に含まれ公開されます。秘密情報は入れないでください。
Cesium ion トークンは GitHub の Actions **Variables**（`VITE_CESIUM_ION_TOKEN`）に登録する想定で、リポジトリにはコミットしません。

## GitHub Pages

- `.github/workflows/deploy.yml` が `main` への push で `dist/` を公開します（Settings → Pages → Source を **GitHub Actions** に設定）。
- Vite の `base` は `./`（相対パス）なので、`https://<user>.github.io/<repo>/` のサブパスでも動作します。
- ルーティングを持たない単一ページなので、SPA用の `404.html` は不要です（URLでの画面遷移を導入する時に追加）。

## 構成

```
src/
  domain/   型・統計モジュールのレジストリ（人口/経済/交通/環境…を後から registerStatModule で追加）
  geo/      純粋な地理計算と都道府県GeoJSONの読み込み（Cesium非依存）
  globe/    HorizonGlobe: Cesium Viewer を所有する唯一のクラス（Reactから独立）
  hooks/    useHorizonGlobe: Viewerを一度だけ生成し、再描画で作り直さない
  ui/       React コンポーネント（上部バー・左右パネル・カメラ操作・通知）
  data/     主要都市プリセット
```

3D描画（`globe/`）とUI（`ui/`）は `globe/types.ts` のコールバックとメソッドだけで接続されています。

## 現在できること

- 日本を中心にした3D地球の表示・回転・ズーム、東京/大阪/京都/日本全体へのカメラ移動
- 都道府県のクリック選択（強調表示・名称ラベル・右パネル）、名称/コード検索
- 昼夜表示（太陽光）、ゲーム内日時（JST）の時刻プリセットと時間加速
- 外部データ（地形・境界・タイル）の取得失敗時も画面を止めず、通知で知らせる

## 既知の制限

- 3D標高は `VITE_CESIUM_ION_TOKEN` 設定時のみ。未設定時は陰影起伏図による見た目の起伏表現です。
- 統計情報は未登録（「データ未登録」表示）。建物データは扱っていません。
- 利用データの出典・条件は [DATA_SOURCES.md](./DATA_SOURCES.md) を参照してください。
