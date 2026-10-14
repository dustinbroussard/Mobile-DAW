import React from 'react';
import { Play, Pause, Square, Circle, SkipBack, SkipForward, Repeat } from 'lucide-react';
import { TransportState } from '../types/daw';

interface TransportControlsProps {
  transport: TransportState;
  onTogglePlay: () => void;
  onToggleRecord: () => void;
  onStopTransport: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onToggleLoop: () => void;
  onAdjustBpm: (delta: number) => void;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  transport,
  onTogglePlay,
  onToggleRecord,
  onStopTransport,
  onRewind,
  onFastForward,
  onToggleLoop,
  onAdjustBpm,
}) => {
  return (
    <div className="bg-[#121212] border-b border-[#222222] px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto select-none">
      {/* Left: Loop & Grid Navigation */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onToggleLoop}
          className={`h-11 px-3 rounded-lg border font-mono text-xs flex items-center gap-1.5 transition-all ${
            transport.isLooping
              ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10 shadow-[0_0_10px_rgba(0,229,255,0.25)] font-bold'
              : 'border-[#222222] text-[#555555] bg-[#161616] hover:text-white'
          }`}
          title="Loop Playback (Bars 1-8)"
        >
          <Repeat className="w-4 h-4" />
          <span>LOOP</span>
        </button>

        <button
          onClick={onRewind}
          className="w-11 h-11 rounded-lg bg-[#161616] border border-[#222222] hover:border-[#555555] flex items-center justify-center text-[#FFFFFF] active:bg-[#222222] transition-colors"
          title="Rewind 4 Bars"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={onFastForward}
          className="w-11 h-11 rounded-lg bg-[#161616] border border-[#222222] hover:border-[#555555] flex items-center justify-center text-[#FFFFFF] active:bg-[#222222] transition-colors"
          title="Fast Forward 4 Bars"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Center: Main Transport Hardware Buttons (Min 44px touch targets) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* STOP */}
        <button
          onClick={onStopTransport}
          className="w-12 h-11 rounded-lg bg-[#161616] border border-[#222222] hover:border-[#555555] flex items-center justify-center text-white active:bg-[#222222] transition-all"
          title="Stop Playback"
        >
          <Square className="w-5 h-5 fill-current text-white" />
        </button>

        {/* PLAY */}
        <button
          onClick={onTogglePlay}
          className={`w-16 h-11 rounded-lg border flex items-center justify-center transition-all ${
            transport.isPlaying
              ? 'bg-[#00FF41] border-[#00FF41] text-black shadow-[0_0_16px_#00FF41]'
              : 'bg-[#161616] border-[#222222] hover:border-[#00FF41] text-[#00FF41]'
          }`}
          title={transport.isPlaying ? 'Pause' : 'Play'}
        >
          {transport.isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>

        {/* RECORD (#FF3B30) */}
        <button
          onClick={onToggleRecord}
          className={`w-14 h-11 rounded-lg border flex items-center justify-center transition-all ${
            transport.isRecording
              ? 'bg-[#FF3B30] border-[#FF3B30] text-white shadow-[0_0_16px_#FF3B30] animate-pulse'
              : 'bg-[#161616] border-[#222222] hover:border-[#FF3B30] text-[#FF3B30]'
          }`}
          title="Toggle Record"
        >
          <Circle className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* Right: Tempo Adjusters & Meter info */}
      <div className="flex items-center gap-1.5 shrink-0 bg-black border border-[#222222] rounded-lg p-1">
        <div className="flex flex-col items-center px-1">
          <span className="text-[9px] text-[#D4AF37] font-mono font-bold leading-none">TEMPO</span>
          <span className="text-sm font-mono font-bold text-white leading-none mt-0.5">{transport.bpm}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onAdjustBpm(1)}
            className="w-7 h-4 bg-[#161616] hover:bg-[#222222] text-xs font-mono text-white rounded flex items-center justify-center leading-none"
          >
            +
          </button>
          <button
            onClick={() => onAdjustBpm(-1)}
            className="w-7 h-4 bg-[#161616] hover:bg-[#222222] text-xs font-mono text-white rounded flex items-center justify-center leading-none"
          >
            -
          </button>
        </div>

        <div className="h-7 w-[1px] bg-[#222222] my-auto mx-1" />

        <div className="flex flex-col items-center px-1 font-mono">
          <span className="text-[9px] text-[#555555] font-bold leading-none">SIG</span>
          <span className="text-xs font-bold text-white leading-none mt-0.5">
            {transport.timeSignatureNumerator}/{transport.timeSignatureDenominator}
          </span>
        </div>
      </div>
    </div>
  );
};
