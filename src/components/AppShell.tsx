import React, { useState, useEffect, useRef } from 'react';
import {
  ViewMode,
  InstrumentCategory,
  TrackType,
  ProjectState,
  TrackData,
  TICKS_PER_BEAT,
} from '../types/daw';
import { INITIAL_PROJECT_STATE } from '../config/mockData';

import { TopBar } from './TopBar';
import { TransportControls } from './TransportControls';
import { TrackList } from './TrackList';
import { PianoRollView } from './PianoRollView';
import { MixerView } from './MixerView';
import { ProjectView } from './ProjectView';
import { BottomNavigation } from './BottomNavigation';
import { ProjectMenuModal } from './ProjectMenuModal';

export const AppShell: React.FC = () => {
  // Authoritative Single Musical Project State
  const [project, setProject] = useState<ProjectState>(INITIAL_PROJECT_STATE);

  // Transient UI-only states (views, modal open state, orientation)
  const [viewMode, setViewMode] = useState<ViewMode>('tracks');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Track orientation changes for responsive adaptivity
  useEffect(() => {
    const checkOrientation = () => {
      if (window.innerWidth > window.innerHeight) {
        setOrientation('landscape');
      } else {
        setOrientation('portrait');
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Transport Animation Loop Ticker (Advances playhead when playing)
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!project.transport.isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    let animationFrameId: number;

    const tick = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const deltaMs = timestamp - lastTimeRef.current;
        // Calculate ticks per ms based on authoritative project BPM and TICKS_PER_BEAT (960 PPQ)
        const beatsPerMs = project.bpm / 60000;
        const ticksToAdd = deltaMs * beatsPerMs * TICKS_PER_BEAT;

        setProject((prev) => {
          let newTick = prev.transport.currentTick + ticksToAdd;
          let newBeat = prev.transport.currentBeat;
          let newBar = prev.transport.currentBar;

          if (newTick >= TICKS_PER_BEAT) {
            newBeat += Math.floor(newTick / TICKS_PER_BEAT);
            newTick = newTick % TICKS_PER_BEAT;
          }

          if (newBeat > prev.timeSignatureNumerator) {
            newBar += Math.floor((newBeat - 1) / prev.timeSignatureNumerator);
            newBeat = ((newBeat - 1) % prev.timeSignatureNumerator) + 1;
          }

          // Authoritative loop boundaries check
          if (prev.transport.isLooping) {
            if (newBar >= prev.loopEndBar) {
              newBar = prev.loopStartBar;
              newBeat = 1;
              newTick = 0;
            }
          } else {
            if (newBar > prev.totalBars) {
              newBar = 1;
              newBeat = 1;
              newTick = 0;
            }
          }

          return {
            ...prev,
            transport: {
              ...prev.transport,
              currentBar: newBar,
              currentBeat: newBeat,
              currentTick: Math.floor(newTick),
            },
          };
        });
      }

      lastTimeRef.current = timestamp;
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    project.transport.isPlaying,
    project.bpm,
    project.timeSignatureNumerator,
    project.transport.isLooping,
    project.loopStartBar,
    project.loopEndBar,
    project.totalBars,
  ]);

  // Project Musical Metadata Mutations
  const handleUpdateProjectName = (name: string) => {
    setProject((prev) => ({ ...prev, name, updatedAt: Date.now() }));
  };

  const handleUpdateBpm = (bpm: number) => {
    const clampedBpm = Math.min(240, Math.max(40, bpm));
    setProject((prev) => ({
      ...prev,
      bpm: clampedBpm,
      updatedAt: Date.now(),
    }));
  };

  const handleUpdateKeySignature = (keySignature: string) => {
    setProject((prev) => ({
      ...prev,
      keySignature,
      updatedAt: Date.now(),
    }));
  };

  const handleUpdateTimeSignature = (num: number, den: number) => {
    setProject((prev) => ({
      ...prev,
      timeSignatureNumerator: num,
      timeSignatureDenominator: den,
      updatedAt: Date.now(),
    }));
  };

  // Authoritative Transport Action Handlers
  const handleTogglePlay = () => {
    setProject((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        isPlaying: !prev.transport.isPlaying,
      },
    }));
  };

  const handleToggleRecord = () => {
    setProject((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        isRecording: !prev.transport.isRecording,
      },
    }));
  };

  const handleStopTransport = () => {
    setProject((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        isPlaying: false,
        isRecording: false,
        currentBar: 1,
        currentBeat: 1,
        currentTick: 0,
      },
    }));
  };

  const handleReturnToZero = () => {
    setProject((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        currentBar: 1,
        currentBeat: 1,
        currentTick: 0,
      },
    }));
  };

  const handleRewind = () => {
    setProject((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        currentBar: Math.max(1, prev.transport.currentBar - 4),
        currentBeat: 1,
        currentTick: 0,
      },
    }));
  };

  const handleFastForward = () => {
    setProject((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        currentBar: Math.min(prev.totalBars, prev.transport.currentBar + 4),
        currentBeat: 1,
        currentTick: 0,
      },
    }));
  };

  const handleToggleLoop = () => {
    setProject((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        isLooping: !prev.transport.isLooping,
      },
    }));
  };

  const handleToggleMetronome = () => {
    setProject((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        metronomeOn: !prev.transport.metronomeOn,
      },
    }));
  };

  const handleSetTransportPosition = (bar: number, beat: number, tick: number) => {
    setProject((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        currentBar: bar,
        currentBeat: beat,
        currentTick: tick,
      },
    }));
  };

  // Authoritative Track Action Handlers
  const handleToggleMute = (id: string) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      tracks: prev.tracks.map((t) => (t.id === id ? { ...t, muted: !t.muted } : t)),
    }));
  };

  const handleToggleSolo = (id: string) => {
    setProject((prev) => {
      const target = prev.tracks.find((t) => t.id === id);
      const newSoloState = !target?.soloed;
      return {
        ...prev,
        updatedAt: Date.now(),
        tracks: prev.tracks.map((t) =>
          t.id === id
            ? { ...t, soloed: newSoloState }
            : newSoloState
            ? { ...t, soloed: false } // solo target track exclusively
            : t
        ),
      };
    });
  };

  const handleToggleArm = (id: string) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      tracks: prev.tracks.map((t) => (t.id === id ? { ...t, armed: !t.armed } : t)),
    }));
  };

  const handleVolumeChange = (id: string, vol: number) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      tracks: prev.tracks.map((t) => (t.id === id ? { ...t, volume: vol } : t)),
    }));
  };

  const handlePanChange = (id: string, pan: number) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      tracks: prev.tracks.map((t) => (t.id === id ? { ...t, pan } : t)),
    }));
  };

  const handleSelectTrack = (id: string) => {
    setProject((prev) => ({
      ...prev,
      selectedTrackId: id,
    }));
  };

  const handleAddTrack = (category: InstrumentCategory, name: string, trackType: TrackType) => {
    setProject((prev) => {
      const nextNumber = prev.tracks.length + 1;
      const newTrack: TrackData = {
        id: `tr-${Date.now()}`,
        trackNumber: nextNumber,
        name,
        category,
        trackType,
        muted: false,
        soloed: false,
        armed: false,
        volume: 80,
        pan: 0,
        regions: [
          {
            id: `rg-${Date.now()}`,
            name: `${name} Clip`,
            startBar: 1,
            lengthBars: 4,
            type: trackType,
          },
        ],
      };

      return {
        ...prev,
        updatedAt: Date.now(),
        tracks: [...prev.tracks, newTrack],
        selectedTrackId: newTrack.id,
      };
    });
  };

  const handleReorderTrack = (id: string, direction: 'up' | 'down') => {
    setProject((prev) => {
      const index = prev.tracks.findIndex((t) => t.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.tracks.length - 1) return prev;

      const newTracks = [...prev.tracks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const [moved] = newTracks.splice(index, 1);
      newTracks.splice(targetIndex, 0, moved);

      return {
        ...prev,
        updatedAt: Date.now(),
        tracks: newTracks,
      };
    });
  };

  const handleDeleteTrack = (id: string) => {
    setProject((prev) => {
      if (prev.tracks.length <= 1) return prev; // Retain at least one track
      const newTracks = prev.tracks.filter((t) => t.id !== id);
      const newSelected =
        prev.selectedTrackId === id ? (newTracks[0]?.id || null) : prev.selectedTrackId;

      return {
        ...prev,
        updatedAt: Date.now(),
        tracks: newTracks,
        selectedTrackId: newSelected,
      };
    });
  };

  const handleResetProject = () => {
    setProject(INITIAL_PROJECT_STATE);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#000000] text-white overflow-hidden select-none font-sans">
      {/* 1. TOP BAR */}
      <TopBar
        project={project}
        onUpdateProjectName={handleUpdateProjectName}
        onTogglePlay={handleTogglePlay}
        onToggleRecord={handleToggleRecord}
        onStopTransport={handleStopTransport}
        onReturnToZero={handleReturnToZero}
        onToggleMetronome={handleToggleMetronome}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenProjectMenu={() => setIsMenuOpen(true)}
        orientation={orientation}
      />

      {/* 2. TRANSPORT CONTROLS BAR */}
      <TransportControls
        project={project}
        onTogglePlay={handleTogglePlay}
        onToggleRecord={handleToggleRecord}
        onStopTransport={handleStopTransport}
        onRewind={handleRewind}
        onFastForward={handleFastForward}
        onToggleLoop={handleToggleLoop}
        onAdjustBpm={(delta) => handleUpdateBpm(project.bpm + delta)}
      />

      {/* 3. MAIN WORKSPACE VIEW MODE SWITCHER */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-black">
        {viewMode === 'tracks' && (
          <TrackList
            project={project}
            onSetTransportPosition={handleSetTransportPosition}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onToggleArm={handleToggleArm}
            onVolumeChange={handleVolumeChange}
            onPanChange={handlePanChange}
            onSelectTrack={handleSelectTrack}
            onReorderTrack={handleReorderTrack}
            onDeleteTrack={handleDeleteTrack}
            onAddTrack={() => setIsMenuOpen(true)}
          />
        )}

        {viewMode === 'piano-roll' && (
          <PianoRollView
            tracks={project.tracks}
            selectedTrackId={project.selectedTrackId}
            onSelectTrack={handleSelectTrack}
          />
        )}

        {viewMode === 'mixer' && (
          <MixerView
            tracks={project.tracks}
            selectedTrackId={project.selectedTrackId}
            onSelectTrack={handleSelectTrack}
            onVolumeChange={handleVolumeChange}
            onPanChange={handlePanChange}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onToggleArm={handleToggleArm}
            isPlaying={project.transport.isPlaying}
          />
        )}

        {viewMode === 'project' && (
          <ProjectView
            project={project}
            onUpdateProjectName={handleUpdateProjectName}
            onUpdateBpm={handleUpdateBpm}
            onUpdateKeySignature={handleUpdateKeySignature}
            onUpdateTimeSignature={handleUpdateTimeSignature}
            onResetProject={handleResetProject}
          />
        )}
      </main>

      {/* 4. BOTTOM TOUCH NAVIGATION */}
      <BottomNavigation
        currentView={viewMode}
        onSelectView={setViewMode}
      />

      {/* Project & Track Manager Modal */}
      <ProjectMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onAddTrack={handleAddTrack}
        onResetProject={handleResetProject}
      />
    </div>
  );
};
