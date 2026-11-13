import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import { CameraPresetId } from './scene/choreography';
import {
  SceneControlState,
  VillageSceneController,
} from './scene/VillageSceneController';

const INITIAL_STATE: SceneControlState = {
  preset: 'glide',
  speedMultiplier: 0.65,
  paused: false,
  goldenWarmth: 1.05,
  dofEnabled: true,
  soundEnabled: false,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<VillageSceneController | null>(null);

  const [sceneState, setSceneState] = useState<SceneControlState>(INITIAL_STATE);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const handlePresetAutoChange = useCallback((preset: CameraPresetId) => {
    setSceneState((prev) => (prev.preset === preset ? prev : { ...prev, preset }));
  }, []);

  const autoChangeRef = useRef(handlePresetAutoChange);
  autoChangeRef.current = handlePresetAutoChange;

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const controller = new VillageSceneController(
      mount,
      INITIAL_STATE,
      (lost) => setContextLost(lost),
      (preset) => autoChangeRef.current(preset),
    );
    controllerRef.current = controller;

    // Expose non-intrusive debug read for verification tests
    (window as unknown as { __villageDebug?: () => unknown }).__villageDebug = () =>
      controller.getDebugState();

    return () => {
      delete (window as unknown as { __villageDebug?: () => unknown }).__villageDebug;
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.updateState(sceneState);
  }, [sceneState]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setControlsCollapsed((c) => !c);
      } else if (e.key === ' ') {
        e.preventDefault();
        setSceneState((prev) => ({ ...prev, paused: !prev.paused }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleStatePatch = useCallback((patch: Partial<SceneControlState>) => {
    setSceneState((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#1b1510]"
      data-state={sceneState.paused ? 'paused' : 'playing'}
      data-preset={sceneState.preset}
    >
      {/* Isolated WebGL mount container */}
      <div
        ref={canvasMountRef}
        data-testid="village-canvas-mount"
        className="absolute inset-0 w-full h-full"
      />

      {/* Minimal Top-Left Storybook Title */}
      {!controlsCollapsed && (
        <header className="fixed top-5 left-6 z-10 pointer-events-none">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#fff6e8] drop-shadow-[0_2px_10px_rgba(24,14,8,0.65)]">
            Morgenstund
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#f7e2c4] drop-shadow-[0_1px_6px_rgba(24,14,8,0.75)]">
            Swiss Alpine Village · Early Morning Golden Hour
          </p>
        </header>
      )}

      {contextLost && (
        <div
          role="alert"
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#1b1510]/90 text-[#fff6e8] p-6"
        >
          <div className="max-w-md text-center">
            <h2 className="font-display text-xl font-semibold">
              Graphics Context Paused
            </h2>
            <p className="mt-2 text-sm text-[#decbb3]">
              The 3D WebGL viewport was temporarily suspended by the browser.
              Reload the page if rendering does not resume automatically.
            </p>
          </div>
        </div>
      )}

      <ControlDock
        state={sceneState}
        collapsed={controlsCollapsed}
        onToggleCollapsed={() => setControlsCollapsed((c) => !c)}
        onChange={handleStatePatch}
      />
    </main>
  );
}
