import * as Cesium from 'cesium';
import { CITY_PRESETS } from '../data/cities';
import { containsPoint, type Ring } from '../geo/geometry';
import type { PrefectureRecord } from '../geo/prefectures';
import type { GlobeHandlers, ViewInfo } from './types';

/**
 * Cesium Viewer を所有する唯一のクラス。Reactの再描画とは無関係に一度だけ生成し、destroy() で破棄する。
 * UIとのやり取りは GlobeHandlers（コールバック）とこのクラスのメソッドだけで行う。
 */

const ACCENT = Cesium.Color.fromCssColorString('#d2b074');
const BOUNDARY = Cesium.Color.fromCssColorString('#9fc0ff').withAlpha(0.38);
const NAVY = Cesium.Color.fromCssColorString('#05080f');

/** 日本列島のおおよその範囲（地理院タイルの配信範囲・表示地域の判定に使用） */
const JAPAN_BOX = { west: 122.0, south: 20.0, east: 154.5, north: 46.5 };
const MAX_CAMERA_HEIGHT_M = 25_000_000;
const MIN_ZOOM_DISTANCE_M = 400;

const flat = (ring: Ring): number[] => ring.flatMap(([lon, lat]) => [lon, lat]);

export class HorizonGlobe {
  private readonly viewer: Cesium.Viewer;
  private readonly handlers: GlobeHandlers;
  private readonly boundaryDS = new Cesium.CustomDataSource('prefecture-boundaries');
  private readonly selectionDS = new Cesium.CustomDataSource('prefecture-selection');
  private readonly clickHandler: Cesium.ScreenSpaceEventHandler;
  private readonly removers: Array<() => void> = [];
  private records: PrefectureRecord[] = [];
  private byCode = new Map<string, PrefectureRecord>();
  private lastClockEmit = 0;
  private lastViewEmit = 0;
  private destroyed = false;

  constructor(container: HTMLElement, handlers: GlobeHandlers) {
    this.handlers = handlers;

    // ion の共有デモトークンは使わない。トークンが設定された場合のみ ion を利用する。
    const token = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim() ?? '';
    Cesium.Ion.defaultAccessToken = token;

    // 世界の下地: Cesium 同梱の Natural Earth II（ネットワーク・トークン不要）
    const baseLayer = Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')),
    );
    baseLayer.errorEvent.addEventListener((error: Error) => {
      this.handlers.onStatus({ id: 'base-imagery', level: 'warn', message: `下地の地球画像を読み込めません: ${error.message}` });
    });

    this.viewer = new Cesium.Viewer(container, {
      baseLayer,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      sceneMode: Cesium.SceneMode.SCENE3D,
      msaaSamples: 4,
    });

    this.configureScene();
    this.configureCamera();
    this.addJapanImagery();
    this.setupTerrain(token);
    this.setupClock();

    void this.viewer.dataSources.add(this.boundaryDS);
    void this.viewer.dataSources.add(this.selectionDS);

    this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.clickHandler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      this.handleClick(event.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    this.flyToJapan(0);
    this.emitView();
  }

  // ---------------------------------------------------------------- 初期化

  private configureScene(): void {
    const { scene } = this.viewer;
    const globe = scene.globe;
    scene.backgroundColor = NAVY;
    globe.baseColor = Cesium.Color.fromCssColorString('#07101f');
    globe.enableLighting = true;
    globe.dynamicAtmosphereLighting = true;
    globe.showGroundAtmosphere = true;
    globe.maximumScreenSpaceError = 1.5;
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
    scene.postProcessStages.fxaa.enabled = true;
  }

  private configureCamera(): void {
    const { scene, camera } = this.viewer;
    const controller = scene.screenSpaceCameraController;
    controller.enableCollisionDetection = true;
    controller.minimumZoomDistance = MIN_ZOOM_DISTANCE_M;
    controller.maximumZoomDistance = MAX_CAMERA_HEIGHT_M;
    controller.inertiaSpin = 0.9;
    controller.inertiaTranslate = 0.9;
    controller.inertiaZoom = 0.8;

    camera.percentageChanged = 0.03;
    this.removers.push(
      camera.changed.addEventListener(() => {
        const now = performance.now();
        if (now - this.lastViewEmit > 250) {
          this.lastViewEmit = now;
          this.emitView();
        }
      }),
      camera.moveEnd.addEventListener(() => this.emitView()),
    );
  }

  /** 国土地理院タイル: 全国最新写真 + 陰影起伏図（日本の範囲のみ）。出典表示は credit で行う。 */
  private addJapanImagery(): void {
    const rectangle = Cesium.Rectangle.fromDegrees(JAPAN_BOX.west, JAPAN_BOX.south, JAPAN_BOX.east, JAPAN_BOX.north);
    const make = (path: string, ext: string, maxLevel: number) => {
      const provider = new Cesium.UrlTemplateImageryProvider({
        url: `https://cyberjapandata.gsi.go.jp/xyz/${path}/{z}/{x}/{y}.${ext}`,
        minimumLevel: 2,
        maximumLevel: maxLevel,
        rectangle,
        credit: '出典：国土地理院（地理院タイル）',
      });
      // 配信範囲外・海上のタイルは 404 になり得る。再試行せず静かに無視する。
      provider.errorEvent.addEventListener((error: Cesium.TileProviderError) => {
        error.retry = false;
      });
      return provider;
    };

    this.viewer.imageryLayers.addImageryProvider(make('seamlessphoto', 'jpg', 18));
    const shade = this.viewer.imageryLayers.addImageryProvider(make('hillshademap', 'png', 16));
    shade.alpha = 0.4;
  }

  private setupTerrain(token: string): void {
    if (!token) {
      this.handlers.onStatus({
        id: 'terrain',
        level: 'info',
        message:
          '標高データは未設定です（VITE_CESIUM_ION_TOKEN なし）。地形は平坦で、起伏は国土地理院の陰影起伏図で表現しています。',
      });
      return;
    }
    try {
      const terrain = Cesium.Terrain.fromWorldTerrain({ requestVertexNormals: true, requestWaterMask: true });
      terrain.readyEvent.addEventListener(() => {
        this.viewer.scene.globe.depthTestAgainstTerrain = true;
      });
      terrain.errorEvent.addEventListener((error: Error) => {
        this.handlers.onStatus({
          id: 'terrain',
          level: 'warn',
          message: `地形データの取得に失敗しました。平坦な地球で表示を続けます（${error.message}）`,
        });
      });
      this.viewer.scene.setTerrain(terrain);
    } catch (e) {
      this.handlers.onStatus({
        id: 'terrain',
        level: 'warn',
        message: `地形データを初期化できません: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  private setupClock(): void {
    const clock = this.viewer.clock;
    clock.currentTime = Cesium.JulianDate.now();
    clock.clockRange = Cesium.ClockRange.UNBOUNDED;
    clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    clock.multiplier = 1;
    clock.shouldAnimate = true;
    this.removers.push(
      clock.onTick.addEventListener(() => {
        const now = performance.now();
        if (now - this.lastClockEmit < 500) return;
        this.lastClockEmit = now;
        this.emitClock();
      }),
    );
    this.emitClock();
  }

  // ---------------------------------------------------------------- データ

  setPrefectures(records: PrefectureRecord[]): void {
    this.records = records;
    this.byCode = new Map(records.map((r) => [r.info.code, r]));

    const entities = this.boundaryDS.entities;
    entities.suspendEvents();
    entities.removeAll();
    for (const record of records) {
      for (const [outer] of record.geometry.polygons) {
        entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(flat(outer)),
            width: 1.2,
            material: BOUNDARY,
            clampToGround: true,
          },
        });
      }
    }
    entities.resumeEvents();
    this.emitView();
  }

  setBoundariesVisible(visible: boolean): void {
    this.boundaryDS.show = visible;
  }

  // ---------------------------------------------------------------- 選択

  selectPrefecture(code: string | null, options: { fly?: boolean } = {}): void {
    const entities = this.selectionDS.entities;
    entities.removeAll();
    if (!code) return;
    const record = this.byCode.get(code);
    if (!record) return;

    for (const [outer, ...holes] of record.geometry.polygons) {
      entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(flat(outer)),
            holes.map((hole) => new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(flat(hole)))),
          ),
          material: ACCENT.withAlpha(0.24),
        },
      });
      entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(flat(outer)),
          width: 3,
          material: ACCENT,
          clampToGround: true,
        },
      });
    }

    const [w, s, e, n] = record.geometry.mainBBox;
    entities.add({
      position: Cesium.Cartesian3.fromDegrees((w + e) / 2, (s + n) / 2),
      label: {
        text: record.info.nameJa,
        font: '600 20px "Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: NAVY,
        outlineWidth: 4,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    if (options.fly) this.flyToPrefecture(record);
  }

  private handleClick(position: Cesium.Cartesian2): void {
    const lonLat = this.pickLonLat(position);
    if (!lonLat) return; // 宇宙空間のクリックは無視（選択を維持）
    const code = this.findCode(lonLat[0], lonLat[1]);
    this.selectPrefecture(code);
    this.handlers.onSelect(code);
  }

  private pickLonLat(position: Cesium.Cartesian2): [number, number] | null {
    const { scene, camera } = this.viewer;
    let cartesian: Cesium.Cartesian3 | undefined;
    if (scene.pickPositionSupported && scene.globe.depthTestAgainstTerrain) {
      cartesian = scene.pickPosition(position);
    }
    if (!cartesian) cartesian = camera.pickEllipsoid(position, scene.globe.ellipsoid);
    if (!cartesian) return null;
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    return [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)];
  }

  private findCode(lon: number, lat: number): string | null {
    for (const record of this.records) {
      if (containsPoint(record.geometry, lon, lat)) return record.info.code;
    }
    return null;
  }

  // ---------------------------------------------------------------- カメラ

  flyToJapan(duration = 2.8): void {
    this.viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(137.5, 36.0, 0), 1_000_000),
      {
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-60), 3_600_000),
        duration,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      },
    );
  }

  flyToCity(id: string): void {
    const city = CITY_PRESETS.find((c) => c.id === id);
    if (!city) return;
    this.viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(city.lon, city.lat, 0), 1),
      {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(city.headingDeg),
          Cesium.Math.toRadians(city.pitchDeg),
          city.range,
        ),
        duration: 3.2,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      },
    );
  }

  private flyToPrefecture(record: PrefectureRecord): void {
    const [w, s, e, n] = record.geometry.mainBBox;
    const padLon = (e - w) * 0.25 + 0.05;
    const padLat = (n - s) * 0.25 + 0.05;
    this.viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(w - padLon, s - padLat, e + padLon, n + padLat),
      duration: 2.4,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }

  /** direction: 1 = ズームイン, -1 = ズームアウト（現在高度に比例した滑らかな移動） */
  zoom(direction: 1 | -1): void {
    const { camera } = this.viewer;
    const height = camera.positionCartographic.height;
    if (direction === -1 && height > MAX_CAMERA_HEIGHT_M * 0.95) return;
    const step = Math.max(height * 0.45, 200);
    const amount = direction === 1 ? Math.min(step, height - MIN_ZOOM_DISTANCE_M) : step;
    if (amount <= 0) return;
    const offset = Cesium.Cartesian3.multiplyByScalar(camera.direction, direction * amount, new Cesium.Cartesian3());
    camera.flyTo({
      destination: Cesium.Cartesian3.add(camera.position, offset, new Cesium.Cartesian3()),
      orientation: {
        direction: Cesium.Cartesian3.clone(camera.direction),
        up: Cesium.Cartesian3.clone(camera.up),
      },
      duration: 0.5,
      easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
    });
  }

  resetNorth(): void {
    const { camera } = this.viewer;
    camera.flyTo({
      destination: Cesium.Cartesian3.clone(camera.position),
      orientation: { heading: 0, pitch: camera.pitch, roll: 0 },
      duration: 0.8,
    });
  }

  // ---------------------------------------------------------------- 昼夜・時刻

  setLighting(enabled: boolean): void {
    this.viewer.scene.globe.enableLighting = enabled;
  }

  setGameTime(time: Date): void {
    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(time);
    this.emitClock();
  }

  /** multiplier 0 = 停止 */
  setTimeSpeed(multiplier: number): void {
    const clock = this.viewer.clock;
    clock.multiplier = multiplier;
    clock.shouldAnimate = multiplier !== 0;
    this.emitClock();
  }

  // ---------------------------------------------------------------- 通知

  private emitClock(): void {
    const clock = this.viewer.clock;
    this.handlers.onClock(Cesium.JulianDate.toDate(clock.currentTime), clock.shouldAnimate ? clock.multiplier : 0);
  }

  private emitView(): void {
    if (this.destroyed) return;
    this.handlers.onView(this.computeView());
  }

  private computeView(): ViewInfo {
    const { scene, camera } = this.viewer;
    const heightM = camera.positionCartographic.height;
    const center = new Cesium.Cartesian2(scene.canvas.clientWidth / 2, scene.canvas.clientHeight / 2);
    const hit = camera.pickEllipsoid(center, scene.globe.ellipsoid);
    if (!hit) return { regionName: '地球（上空）', heightM };

    const carto = Cesium.Cartographic.fromCartesian(hit);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);

    const code = this.findCode(lon, lat);
    const name = code ? this.byCode.get(code)?.info.nameJa : undefined;
    if (name) return { regionName: name, heightM };

    const inJapan =
      lon >= JAPAN_BOX.west && lon <= JAPAN_BOX.east && lat >= JAPAN_BOX.south && lat <= JAPAN_BOX.north;
    if (!inJapan) return { regionName: '日本国外', heightM };
    return { regionName: heightM > 1_200_000 ? '日本列島' : '日本近海', heightM };
  }

  // ---------------------------------------------------------------- 破棄

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.removers.forEach((remove) => remove());
    this.clickHandler.destroy();
    if (!this.viewer.isDestroyed()) this.viewer.destroy();
  }
}
