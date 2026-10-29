import React from 'react';
import { X, Music, AlertCircle, FileText, CheckCircle2, Sliders, Layers } from 'lucide-react';
import { MidiAnalysisResult } from '../utils/midiConverter';
import { getTrackColor } from '../config/theme';

interface MidiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: MidiAnalysisResult | null;
  hasUnsavedChanges: boolean;
  onConfirmImport: () => void;
}

export const MidiImportModal: React.FC<MidiImportModalProps> = ({
  isOpen,
  onClose,
  analysis,
  hasUnsavedChanges,
  onConfirmImport,
}) => {
  if (!isOpen || !analysis) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#121212] border border-[#222222] rounded-xl w-full max-w-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.9)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#161616] border-b border-[#222222] px-4 py-3 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
            <span className="text-xs font-bold text-[#00E5FF] tracking-wider uppercase">
              IMPORT MIDI FILE (.MID)
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded bg-black hover:bg-[#222222] text-[#555555] hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* File Overview Banner */}
          <div className="bg-black border border-[#222222] p-3 rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <FileText className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span className="text-xs font-bold text-white truncate">{analysis.fileName}</span>
              </div>
              <span className="text-[10px] bg-[#161616] border border-[#333333] px-2 py-0.5 rounded text-[#AAAAAA] shrink-0">
                {analysis.sourcePPQ} PPQ → 960 PPQ
              </span>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#1C1C1C] text-[10px]">
              <div className="bg-[#141414] p-1.5 rounded flex flex-col">
                <span className="text-[#555555]">TEMPO</span>
                <span className="font-bold text-white">{analysis.bpm} BPM</span>
              </div>
              <div className="bg-[#141414] p-1.5 rounded flex flex-col">
                <span className="text-[#555555]">METER</span>
                <span className="font-bold text-white">
                  {analysis.timeSignatureNumerator}/{analysis.timeSignatureDenominator}
                </span>
              </div>
              <div className="bg-[#141414] p-1.5 rounded flex flex-col">
                <span className="text-[#555555]">TRACKS</span>
                <span className="font-bold text-[#00E5FF]">{analysis.trackCount}</span>
              </div>
              <div className="bg-[#141414] p-1.5 rounded flex flex-col">
                <span className="text-[#555555]">NOTES</span>
                <span className="font-bold text-[#00FF41]">{analysis.totalNotes}</span>
              </div>
            </div>
          </div>

          {/* Warnings (if any) */}
          {analysis.warnings.length > 0 && (
            <div className="bg-[#2A1800]/60 border border-[#D4AF37]/50 p-2.5 rounded text-[11px] text-[#FFD700] space-y-1">
              {analysis.warnings.map((w, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Track Breakdown List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#555555] font-bold uppercase tracking-wider px-1">
              <span>DETECTED TRACKS ({analysis.tracks.length})</span>
              <span>CHANNEL • NOTES</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {analysis.tracks.map((track) => {
                const accent = getTrackColor(track.category);
                return (
                  <div
                    key={track.index}
                    className="bg-black/70 border border-[#222222] p-2 rounded flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white truncate text-[11px]">{track.name}</span>
                        <span className="text-[9px] text-[#555555] uppercase">
                          {track.category} • Prog #{track.programNumber}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px]">
                      <span className="bg-[#181818] border border-[#282828] px-1.5 py-0.5 rounded text-[#888888]">
                        CH {track.channel}
                      </span>
                      <span className="text-[#00FF41] font-bold min-w-10 text-right">
                        {track.noteCount} notes
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unsaved changes notice */}
          {hasUnsavedChanges && (
            <div className="bg-[#2A0E0E]/80 border border-[#FF3B30]/60 p-2.5 rounded text-[11px] text-[#FF9999] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0" />
              <span>
                Warning: You have unsaved changes in your current session. Importing this MIDI file will replace your active project.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#161616] border-t border-[#222222] p-3 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-black hover:bg-[#222222] border border-[#333333] text-white rounded text-xs font-bold transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirmImport}
            className="px-4 py-2 bg-[#00FF41] hover:bg-[#20FF55] text-black font-bold rounded text-xs flex items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(0,255,65,0.4)]"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> IMPORT TO WORKSPACE
          </button>
        </div>
      </div>
    </div>
  );
};
