import {
  ChevronDown,
  ChevronUp,
  Eye,
  Pause,
  Play,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CAMERA_PRESETS, CameraPresetId } from '../scene/choreography';
import { SceneControlState } from '../scene/VillageSceneController';

interface ControlDockProps {
  state: SceneControlState;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onChange: (patch: Partial<SceneControlState>) => void;
}

const SPEED_OPTIONS = [
  { label: '0.35x', value: 0.35, title: 'Dreamy slow-motion' },
  { label: '0.65x', value: 0.65, title: 'Gentle storybook pace' },
  { label: '1.0x', value: 1.0, title: 'Natural morning pace' },
];

export function ControlDock({
  state,
  collapsed,
  onToggleCollapsed,
  onChange,
}: ControlDockProps) {
  const activePreset = CAMERA_PRESETS.find((p) => p.id === state.preset);

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none max-w-[94vw]"
      aria-label="Cinema controls"
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show Controls' : 'Hide Controls'}
        className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1d150f]/90 border border-[#f5d5a7]/20 text-xs font-medium text-[#f8ebd6] hover:bg-[#2a1f16] hover:border-[#f5d5a7]/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5b963] whitespace-nowrap shrink-0 cursor-pointer"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Show Controls</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Hide Controls</span>
          </>
        )}
      </button>

      {!collapsed && (
        <div className="pointer-events-auto w-full rounded-xl bg-[#1b140f]/92 border border-[#f5d5a7]/18 shadow-2xl px-4 py-3 text-[#fbf1e2]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Camera Vignette Switcher */}
            <div
              className="flex flex-wrap items-center gap-1 bg-[#120d09]/70 p-1 rounded-lg border border-[#f5d5a7]/10"
              role="group"
              aria-label="Camera vignettes"
            >
              {CAMERA_PRESETS.map((preset) => {
                const isActive = state.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onChange({ preset: preset.id })}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f5b963] ${
                      isActive
                        ? 'bg-[#e6a653] text-[#1c130c]'
                        : 'text-[#e9dac6] hover:text-white hover:bg-white/8'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Playback & Speed Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ paused: !state.paused })}
                aria-label={state.paused ? 'Play animation' : 'Pause animation'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a1f16] border border-[#f5d5a7]/20 text-xs font-medium text-[#fbf1e2] hover:bg-[#38291d] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f5b963]"
              >
                {state.paused ? (
                  <>
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Play</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <div
                className="flex items-center gap-0.5 bg-[#120d09]/70 p-1 rounded-lg border border-[#f5d5a7]/10"
                role="group"
                aria-label="Motion speed"
              >
                {SPEED_OPTIONS.map((opt) => {
                  const active = Math.abs(state.speedMultiplier - opt.value) < 0.05;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      title={opt.title}
                      aria-pressed={active}
                      onClick={() =>
                        onChange({ speedMultiplier: opt.value, paused: false })
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f5b963] ${
                        active
                          ? 'bg-[#f5d5a7]/22 text-[#ffe5bd]'
                          : 'text-[#cbb9a3] hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Atmosphere & Audio Toggles */}
            <div className="flex items-center gap-2.5">
              <label className="inline-flex items-center gap-2 text-xs text-[#e5d5bf] whitespace-nowrap shrink-0">
                <Sun className="w-3.5 h-3.5 text-[#f4b860]" aria-hidden="true" />
                <span>Sun</span>
                <input
                  type="range"
                  min={0.7}
                  max={1.35}
                  step={0.05}
                  value={state.goldenWarmth}
                  aria-label="Golden hour light warmth"
                  onChange={(e) =>
                    onChange({ goldenWarmth: Number(e.target.value) })
                  }
                  className="w-16 accent-[#e6a653] cursor-pointer"
                />
              </label>

              <button
                type="button"
                aria-pressed={state.dofEnabled}
                onClick={() => onChange({ dofEnabled: !state.dofEnabled })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f5b963] ${
                  state.dofEnabled
                    ? 'bg-[#f5d5a7]/16 border-[#f5d5a7]/35 text-[#ffe7c2]'
                    : 'bg-transparent border-[#f5d5a7]/15 text-[#cbb9a3] hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Depth of Field</span>
              </button>

              <button
                type="button"
                aria-pressed={state.soundEnabled}
                aria-label={state.soundEnabled ? 'Mute village audio' : 'Enable village audio'}
                onClick={() => onChange({ soundEnabled: !state.soundEnabled })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f5b963] ${
                  state.soundEnabled
                    ? 'bg-[#e6a653] border-[#e6a653] text-[#1c130c]'
                    : 'bg-transparent border-[#f5d5a7]/15 text-[#cbb9a3] hover:text-white'
                }`}
              >
                {state.soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{state.soundEnabled ? 'Sound On' : 'Sound'}</span>
              </button>
            </div>
          </div>

          {/* Quiet Caption Line */}
          {activePreset && (
            <div className="mt-2 pt-2 border-t border-[#f5d5a7]/10 flex items-center justify-between gap-4 text-xs text-[#cbb9a3]">
              <span className="truncate">{activePreset.caption}</span>
              <span className="hidden sm:inline whitespace-nowrap shrink-0 text-[#a59480]">
                Press H to hide controls · Drag to orbit
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
