import React from 'react';
import { AlertOctagon, X } from 'lucide-react';

interface FileErrorModalProps {
  isOpen: boolean;
  errorMessage: string | null;
  onClose: () => void;
}

export const FileErrorModal: React.FC<FileErrorModalProps> = ({
  isOpen,
  errorMessage,
  onClose,
}) => {
  if (!isOpen || !errorMessage) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#121212] border border-[#FF3B30] rounded-xl w-full max-w-md overflow-hidden shadow-[0_0_30px_rgba(255,59,48,0.35)]">
        {/* Header */}
        <div className="bg-[#1F1212] border-b border-[#331818] px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 text-[#FF3B30]">
            <AlertOctagon className="w-5 h-5 text-[#FF3B30]" />
            <span className="text-xs font-bold uppercase tracking-wider">PROJECT LOAD ERROR</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded bg-black hover:bg-[#222222] text-[#555555] hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="bg-black/60 border border-[#222222] p-3 rounded text-xs text-[#FF8888] font-mono whitespace-pre-wrap leading-relaxed">
            {errorMessage}
          </div>

          <p className="text-[11px] text-[#888888]">
            Please ensure the file is a valid <span className="text-white font-bold">.dawproj</span> or <span className="text-white font-bold">.json</span> file created by this DAW workstation.
          </p>

          <button
            onClick={onClose}
            className="w-full bg-[#1A1A1A] hover:bg-[#222222] border border-[#333333] hover:border-white text-white p-2.5 rounded text-xs font-bold transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
