import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

// DOM がパースされたことを検出するイベントを設定
window.addEventListener('DOMContentLoaded', () => {
  // 制御クラスのインスタンスを生成
  const app = new App3();
  // 初期化
  app.init();
  // 描画
  app.render();
}, false);

/**
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
class App3 {
  /**
   * カメラ定義のための定数
   */
  static get CAMERA_PARAM() {
    return {
      // fovy は Field of View Y のことで、縦方向の視野角を意味する
      fovy: 45,
      // 描画する空間のアスペクト比（縦横比）
      aspect: window.innerWidth / window.innerHeight,
      // 描画する空間のニアクリップ面（最近面）
      near: 1.0,
      // 描画する空間のファークリップ面（最遠面）
      far: 60.0,
      // カメラの位置
      x: 30.0,
      y: 5.0,
      z: 30.0,
      // カメラの中止点
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    };
  }
  /**
   * レンダラー定義のための定数
   */
  static get RENDERER_PARAM() {
    return {
      // レンダラーが背景をリセットする際に使われる背景色
      clearColor: 0x111196,
      // レンダラーが描画する領域の横幅
      width: window.innerWidth,
      // レンダラーが描画する領域の縦幅
      height: window.innerHeight,
    };
  }
  /**
   * ディレクショナルライト定義のための定数
   */
  static get DIRECTIONAL_LIGHT_PARAM() {
    return {
      color: 0xffffff, // 光の色
      intensity: 2.2,  // 光の強度
      x: 0.5,          // 光の向きを表すベクトルの X 要素
      y: 0.5,          // 光の向きを表すベクトルの Y 要素
      z: 0.5           // 光の向きを表すベクトルの Z 要素
    };
  }
  /**
   * アンビエントライト定義のための定数
   */
  static get AMBIENT_LIGHT_PARAM() {
    return {
      color: 0xffffff, // 光の色
      intensity: 0.8,  // 光の強度
    };
  }
  /**
   * マテリアル定義のための定数
   */
  static get MATERIAL_PARAM() {
    return {
      color: 0x3399ff, // マテリアルの基本色
    };
  }

  /**
   * コンストラクタ
   * @constructor
   */
  constructor() {
    this.renderer;         // レンダラ
    this.scene;            // シーン
    this.camera;           // カメラ
    this.directionalLight; // ディレクショナルライト
    this.ambientLight;     // アンビエントライト
    this.material;         // マテリアル
    this.torusGeometry;    // トーラスジオメトリ
    this.torusArray;       // トーラスメッシュの配列 @@@
    this.controls;         // オービットコントロール
    this.axesHelper;       // 軸ヘルパー
    this.boxGridSize = 10;
    this.boxSpacing = 1.5;
    this.boxes = [];
    this.elapsedTime = 0;

    this.isDown = false; // キーの押下状態を保持するフラグ

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener('keydown', (keyEvent) => {
      switch (keyEvent.key) {
        case ' ':
          this.isDown = true;
          break;
        default:
      }
    }, false);
    window.addEventListener('keyup', (keyEvent) => {
      this.isDown = false;
    }, false);

    // リサイズイベント
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(new THREE.Color(App3.RENDERER_PARAM.clearColor));
    this.renderer.setSize(App3.RENDERER_PARAM.width, App3.RENDERER_PARAM.height);
    const wrapper = document.querySelector('#webgl');
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      App3.CAMERA_PARAM.fovy,
      App3.CAMERA_PARAM.aspect,
      App3.CAMERA_PARAM.near,
      App3.CAMERA_PARAM.far,
    );
    this.camera.position.set(
      App3.CAMERA_PARAM.x,
      App3.CAMERA_PARAM.y,
      App3.CAMERA_PARAM.z,
      
    );
    this.camera.lookAt(App3.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      App3.DIRECTIONAL_LIGHT_PARAM.color,
      App3.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.set(
      App3.DIRECTIONAL_LIGHT_PARAM.x,
      App3.DIRECTIONAL_LIGHT_PARAM.y,
      App3.DIRECTIONAL_LIGHT_PARAM.z,
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      App3.AMBIENT_LIGHT_PARAM.color,
      App3.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM);

    // 共通のジオメトリ、マテリアルから、複数のメッシュインスタンスを作成する @@@
    const startColor = new THREE.Color();
    const endColor = new THREE.Color();
    this.boxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    
    startColor.setRGB(0.2, 0.3, 0.1);
    endColor.setRGB(0.2, 0.1, 0.3);

    for (let i = 0; i < this.boxGridSize; i++) {
      for (let j = 0; j < this.boxGridSize; j++) {
        const color = startColor.clone().lerpHSL(endColor, j-i);

        const material = new THREE.MeshPhongMaterial({color: color.getHex()});
        const box = new THREE.Mesh(this.boxGeometry, material);
        box.position.set(i * this.boxSpacing, 0.0, j * this.boxSpacing);
        this.scene.add(box);
        this.boxes.push(box);
      }
    }

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    //const axesBarLength = 5.0;
    //this.axesHelper = new THREE.AxesHelper(axesBarLength);
    //this.scene.add(this.axesHelper);
  }

  /**
   * 描画処理
   */
  render() {
    function fract(value) {
    return value - Math.floor(value);
    }
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();
    
    if (this.isDown === true) {
      this.torusArray.forEach((torus) => {
        torus.rotation.y += 0.05;
      });
    }

    this.boxes.forEach((box, index) => {
    box.rotation.y += 0.01;
    box.rotation.x += 0.02;

    const hsl = box.material.color.getHSL(new THREE.Color());
    box.material.color.setHSL((hsl.h + fract(this.elapsedTime)*-fract(this.elapsedTime)/20), hsl.s, hsl.l);

    const offset = (this.boxGridSize * this.boxSpacing) / 2.0;
    const z = box.position.z - offset;
      
    const row = Math.floor(index / this.boxGridSize);
    if (row % 2 === 0) {
        box.position.y = Math.sin(this.elapsedTime + z * 0.25) * 5.0;
    } else {
        box.position.y = -Math.sin(this.elapsedTime + z * 0.25) * 5.0;
    }

    });

    this.elapsedTime += 0.01;

    this.renderer.render(this.scene, this.camera);
  }
}

