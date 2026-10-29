import React from 'react';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  projectName: string;
  actionTitle: string; // e.g. "Create New Project" or "Open Another Project"
  onSaveAndProceed: () => void;
  onDiscardAndProceed: () => void;
  onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  projectName,
  actionTitle,
  onSaveAndProceed,
  onDiscardAndProceed,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#121212] border border-[#FF3B30]/50 rounded-xl w-full max-w-md overflow-hidden shadow-[0_0_30px_rgba(255,59,48,0.3)]">
        {/* Header */}
        <div className="bg-[#181010] border-b border-[#222222] px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 text-[#FF9500]">
            <AlertTriangle className="w-4 h-4 text-[#FF9500]" />
            <span className="text-xs font-bold uppercase tracking-wider">UNSAVED CHANGES</span>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded bg-black hover:bg-[#222222] text-[#555555] hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-xs text-[#CCCCCC] leading-relaxed">
            You have unsaved changes in <span className="text-white font-bold">"{projectName}"</span>.
            Proceeding to <span className="text-[#00E5FF] font-bold">{actionTitle}</span> without saving will discard your latest edits.
          </p>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {/* Save & Continue */}
            <button
              onClick={onSaveAndProceed}
              className="w-full bg-[#00FF41]/10 hover:bg-[#00FF41]/20 border border-[#00FF41] text-[#00FF41] p-2.5 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_10px_rgba(0,255,65,0.15)]"
            >
              <Save className="w-4 h-4" /> SAVE PROJECT & CONTINUE
            </button>

            {/* Discard & Continue */}
            <button
              onClick={onDiscardAndProceed}
              className="w-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 border border-[#FF3B30]/50 hover:border-[#FF3B30] text-[#FF3B30] p-2.5 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> DISCARD UNSAVED CHANGES
            </button>

            {/* Cancel */}
            <button
              onClick={onCancel}
              className="w-full bg-black hover:bg-[#1A1A1A] border border-[#222222] text-[#888888] hover:text-white p-2 rounded text-xs transition-colors"
            >
              CANCEL (STAY IN CURRENT PROJECT)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
