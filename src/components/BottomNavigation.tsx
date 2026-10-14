import React from 'react';
import { Layers, Music, Sliders, Settings } from 'lucide-react';
import { ViewMode } from '../types/daw';

interface BottomNavigationProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentView,
  onSelectView,
}) => {
  const navItems: { id: ViewMode; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'tracks', label: 'TRACKS', icon: <Layers className="w-5 h-5" />, color: '#00FF41' },
    { id: 'piano-roll', label: 'PIANO ROLL', icon: <Music className="w-5 h-5" />, color: '#00E5FF' },
    { id: 'mixer', label: 'MIXER', icon: <Sliders className="w-5 h-5" />, color: '#FFE600' },
    { id: 'project', label: 'PROJECT', icon: <Settings className="w-5 h-5" />, color: '#D4AF37' },
  ];

  return (
    <nav className="bg-[#121212] border-t border-[#222222] px-2 py-1 flex items-center justify-around select-none z-30 min-h-[52px]">
      {navItems.map((item) => {
        const isActive = currentView === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
              isActive
                ? 'bg-black text-white font-bold border border-[#222222]'
                : 'text-[#555555] hover:text-white'
            }`}
            style={{
              borderColor: isActive ? item.color : '#222222',
            }}
          >
            <div
              className="transition-transform duration-200"
              style={{
                color: isActive ? item.color : '#555555',
                filter: isActive ? `drop-shadow(0 0 6px ${item.color})` : 'none',
              }}
            >
              {item.icon}
            </div>
            <span
              className="text-[10px] font-mono tracking-wider mt-0.5"
              style={{ color: isActive ? item.color : '#555555' }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
