import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { createAtmosphere } from './atmosphere';
import { VillageAudioEngine } from './audio';
import { createChalets } from './chalets';
import { createCharacters } from './characters';
import {
  CameraPresetId,
  didBellClang,
  evaluateBakerShutterState,
  evaluateCameraFrame,
  evaluateFarmerCowState,
  evaluateHoopChaseState,
} from './choreography';
import { createVillageTextures } from './textures';
import { createVillageEnvironment } from './villageEnvironment';

export interface SceneControlState {
  preset: CameraPresetId;
  speedMultiplier: number;
  paused: boolean;
  goldenWarmth: number; // 0.6..1.35
  dofEnabled: boolean;
  soundEnabled: boolean;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class VillageSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer | null = null;
  private bokehPass: BokehPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private isSoftwareGl: boolean;
  private audio = new VillageAudioEngine();

  private frameId = 0;
  private disposed = false;
  private lastWallMs = performance.now();
  private simTime = 0;
  private prevBellPhase = 0;

  private state: SceneControlState;
  private onContextLostCb: (lost: boolean) => void;
  private onPresetAutoChangeCb?: (preset: CameraPresetId) => void;
  private presetTransitionTimer = 0;

  // Pre-allocated scratch math objects (zero GC in render loop)
  private readonly _desiredCamPos = new THREE.Vector3();
  private readonly _desiredTarget = new THREE.Vector3();
  private readonly _lookTarget = new THREE.Vector3();
  private readonly _sunDir = new THREE.Vector3(0.55, 0.34, 0.76).normalize();

  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private fillLight!: THREE.DirectionalLight;
  private atmosphere!: ReturnType<typeof createAtmosphere>;
  private environment!: ReturnType<typeof createVillageEnvironment>;
  private chalets!: ReturnType<typeof createChalets>;
  private characters!: ReturnType<typeof createCharacters>;
  private textures!: ReturnType<typeof createVillageTextures>;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;

  constructor(
    container: HTMLElement,
    initialState: SceneControlState,
    onContextLost: (lost: boolean) => void,
    onPresetAutoChange?: (preset: CameraPresetId) => void,
  ) {
    this.container = container;
    this.state = { ...initialState };
    this.onContextLostCb = onContextLost;
    this.onPresetAutoChangeCb = onPresetAutoChange;

    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4be88);
    this.scene.fog = new THREE.FogExp2(0xf0bd8a, 0.0082);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 340);
    const startFrame = evaluateCameraFrame(this.state.preset, 0);
    this.camera.position.set(
      startFrame.position.x,
      startFrame.position.y,
      startFrame.position.z,
    );
    this._lookTarget.set(
      startFrame.target.x,
      startFrame.target.y,
      startFrame.target.z,
    );
    this.camera.lookAt(this._lookTarget);

    // OrbitControls for Free Orbit exploration (and instant handoff if user drags)
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 44;
    this.controls.target.copy(this._lookTarget);
    this.controls.enabled = this.state.preset === 'orbit';
    this.controls.addEventListener('start', this.handleUserOrbitStart);

    // Mandatory studio/outdoor environment map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = 0.52;
    pmremGenerator.dispose();

    this.setupLighting();
    this.textures = createVillageTextures(this.renderer);
    this.atmosphere = createAtmosphere(
      this.scene,
      this.textures.dustSpriteMap,
      this._sunDir,
    );
    this.environment = createVillageEnvironment(this.scene, this.textures);
    this.chalets = createChalets(this.scene, this.textures);
    this.characters = createCharacters(this.scene, this.textures);

    // Initial pose at t=0 before first paint
    this.applySceneSimulation(0);

    // Post-processing on GPU (soft golden bloom + shallow DOF + gentle vignette)
    if (!this.isSoftwareGl) {
      this.setupPostProcessing(width, height);
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.tick();
  }

  private setupLighting(): void {
    // Warm golden morning key sun slanting through the chalets
    this.keyLight = new THREE.DirectionalLight(0xffc37a, 2.75);
    this.keyLight.position.copy(this._sunDir).multiplyScalar(42);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 4;
    this.keyLight.shadow.camera.far = 96;
    const d = 26;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.025;
    this.scene.add(this.keyLight);

    // Cool Alpine sky / warm earthy bounce HemisphereLight
    this.hemiLight = new THREE.HemisphereLight(0x9dc7f0, 0x8d633d, 0.92);
    this.scene.add(this.hemiLight);

    // Soft cool-blue opposite rim/fill so shadows remain luminous storybook color
    this.fillLight = new THREE.DirectionalLight(0xb5d3f5, 0.55);
    this.fillLight.position.set(-22, 14, -18);
    this.scene.add(this.fillLight);
  }

  private setupPostProcessing(width: number, height: number): void {
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.26,
      0.65,
      0.84,
    );
    composer.addPass(bloom);
    this.bloomPass = bloom;

    const bokeh = new BokehPass(this.scene, this.camera, {
      focus: 9.5,
      aperture: 0.00018,
      maxblur: 0.0065,
    });
    bokeh.enabled = this.state.dofEnabled;
    composer.addPass(bokeh);
    this.bokehPass = bokeh;

    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms['offset'].value = 0.92;
    vignette.uniforms['darkness'].value = 0.85;
    composer.addPass(vignette);

    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.onContextLostCb(true);
  };

  private handleContextRestored = () => {
    this.onContextLostCb(false);
  };

  private handleUserOrbitStart = () => {
    if (this.state.preset !== 'orbit') {
      this.state.preset = 'orbit';
      this.onPresetAutoChangeCb?.('orbit');
    }
  };

  public updateState(next: SceneControlState): void {
    const prevPreset = this.state.preset;
    this.state = { ...next };

    this.controls.enabled = next.preset === 'orbit';
    if (next.preset !== prevPreset) {
      this.presetTransitionTimer = 0.9;
      if (next.preset !== 'orbit') {
        if (prevPreset === 'orbit') {
          this._lookTarget.copy(this.controls.target);
        }
        const targetFrame = evaluateCameraFrame(next.preset, this.simTime);
        this._desiredCamPos.set(
          targetFrame.position.x,
          targetFrame.position.y,
          targetFrame.position.z,
        );
        this._desiredTarget.set(
          targetFrame.target.x,
          targetFrame.target.y,
          targetFrame.target.z,
        );
        if (this.camera.position.distanceTo(this._desiredCamPos) > 10) {
          this.camera.position.lerp(this._desiredCamPos, 0.72);
          this._lookTarget.lerp(this._desiredTarget, 0.72);
          this.camera.lookAt(this._lookTarget);
          this.controls.target.copy(this._lookTarget);
        }
      }
    }
    if (this.bokehPass) {
      this.bokehPass.enabled = next.dofEnabled;
    }
    this.audio.setEnabled(next.soundEnabled);
  }

  private applySceneSimulation(dt: number): void {
    const bakerState = evaluateBakerShutterState(this.simTime);
    this.chalets.updateBaker(bakerState);

    const farmerCowState = evaluateFarmerCowState(this.simTime);
    this.characters.updateFarmerAndCow(farmerCowState);
    if (dt > 0 && didBellClang(this.prevBellPhase, farmerCowState.bellPhase)) {
      const dist = this.camera.position.distanceTo(
        this._desiredTarget.set(
          farmerCowState.cowPos.x,
          farmerCowState.cowPos.y + 1,
          farmerCowState.cowPos.z,
        ),
      );
      this.audio.triggerCowbell(Math.max(0.15, 1 - dist / 35));
    }
    this.prevBellPhase = farmerCowState.bellPhase;

    const hoopState = evaluateHoopChaseState(this.simTime);
    this.characters.updateHoopChase(hoopState);

    this.environment.update(this.simTime);
    this.atmosphere.update(this.simTime, this.state.goldenWarmth);

    // Golden-hour light warmth modulation
    this.keyLight.intensity = 2.65 * this.state.goldenWarmth;
    this.renderer.toneMappingExposure = 0.98 + 0.14 * this.state.goldenWarmth;

    if (this.presetTransitionTimer > 0) {
      this.presetTransitionTimer = Math.max(0, this.presetTransitionTimer - dt);
    }

    // Camera choreography with smooth exponential damping
    if (this.state.preset !== 'orbit') {
      const frame = evaluateCameraFrame(this.state.preset, this.simTime);
      this._desiredCamPos.set(frame.position.x, frame.position.y, frame.position.z);
      this._desiredTarget.set(frame.target.x, frame.target.y, frame.target.z);

      const baseLambda = this.state.preset === 'glide' ? 2.6 : 4.2;
      const dampLambda = this.presetTransitionTimer > 0 ? 12.5 : baseLambda;
      const step = Math.max(0.016, dt);
      this.camera.position.x = THREE.MathUtils.damp(
        this.camera.position.x,
        this._desiredCamPos.x,
        dampLambda,
        step,
      );
      this.camera.position.y = THREE.MathUtils.damp(
        this.camera.position.y,
        this._desiredCamPos.y,
        dampLambda,
        step,
      );
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        this._desiredCamPos.z,
        dampLambda,
        step,
      );

      this._lookTarget.x = THREE.MathUtils.damp(
        this._lookTarget.x,
        this._desiredTarget.x,
        dampLambda + 1.0,
        step,
      );
      this._lookTarget.y = THREE.MathUtils.damp(
        this._lookTarget.y,
        this._desiredTarget.y,
        dampLambda + 1.0,
        step,
      );
      this._lookTarget.z = THREE.MathUtils.damp(
        this._lookTarget.z,
        this._desiredTarget.z,
        dampLambda + 1.0,
        step,
      );
      this.camera.lookAt(this._lookTarget);
      this.controls.target.copy(this._lookTarget);

      if (this.bokehPass && this.bokehPass.enabled) {
        const focusDist = this.camera.position.distanceTo(this._lookTarget);
        const uniforms = this.bokehPass.uniforms as Record<string, THREE.IUniform>;
        if (uniforms.focus) {
          uniforms.focus.value = THREE.MathUtils.clamp(focusDist, 3.0, 24.0);
        }
      }
    } else {
      this.controls.update();
      if (this.bokehPass && this.bokehPass.enabled) {
        const uniforms = this.bokehPass.uniforms as Record<string, THREE.IUniform>;
        if (uniforms.focus) {
          uniforms.focus.value = THREE.MathUtils.clamp(
            this.camera.position.distanceTo(this.controls.target),
            3.0,
            28.0,
          );
        }
      }
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const nowMs = performance.now();
    const rawDt = Math.min(0.1, Math.max(0.001, (nowMs - this.lastWallMs) / 1000));
    this.lastWallMs = nowMs;

    const speed = this.state.paused ? 0 : this.state.speedMultiplier;
    this.simTime += rawDt * speed;
    this.audio.update(speed);

    this.applySceneSimulation(rawDt);

    if (this.isSoftwareGl || !this.composer) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer?.setSize(width, height);
    this.bloomPass?.resolution.set(width, height);
  };

  public getDebugState(): { simTime: number; cameraZ: number; preset: CameraPresetId } {
    return {
      simTime: Number(this.simTime.toFixed(2)),
      cameraZ: Number(this.camera.position.z.toFixed(2)),
      preset: this.state.preset,
    };
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.controls.removeEventListener('start', this.handleUserOrbitStart);
    this.controls.dispose();
    this.audio.dispose();

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.textures.dispose();
    this.envRenderTarget?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
