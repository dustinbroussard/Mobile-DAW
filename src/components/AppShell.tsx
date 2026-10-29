import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ViewMode,
  InstrumentCategory,
  TrackType,
  ProjectState,
  TrackData,
  MidiNote,
  TICKS_PER_BEAT,
} from '../types/daw';
import { INITIAL_PROJECT_STATE } from '../config/mockData';
import {
  downloadProjectFile,
  getProjectFingerprint,
  loadProjectFromLocalStorage,
  readProjectFromFile,
  saveProjectToLocalStorage,
  clearLocalStorageAutosave,
} from '../utils/projectPersistence';

import { TopBar } from './TopBar';
import { TransportControls } from './TransportControls';
import { TrackList } from './TrackList';
import { PianoRollView } from './PianoRollView';
import { MixerView } from './MixerView';
import { ProjectView } from './ProjectView';
import { BottomNavigation } from './BottomNavigation';
import { ProjectMenuModal } from './ProjectMenuModal';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { SaveAsModal } from './SaveAsModal';
import { FileErrorModal } from './FileErrorModal';
import { MidiImportModal } from './MidiImportModal';
import {
  analyzeMidiFile,
  convertMidiToProject,
  downloadMidiFile,
  MidiAnalysisResult,
  Midi,
} from '../utils/midiConverter';
import { Check, Info } from 'lucide-react';

export const AppShell: React.FC = () => {
  // Try to load last autosaved project from localStorage on initial render
  const [initialLoadedData] = useState(() => {
    const autosaved = loadProjectFromLocalStorage();
    if (autosaved?.project) {
      return {
        project: autosaved.project,
        isRestored: true,
        restoredTime: new Date(autosaved.timestamp).toLocaleTimeString(),
      };
    }
    return {
      project: INITIAL_PROJECT_STATE,
      isRestored: false,
      restoredTime: null,
    };
  });

  // Authoritative Single Musical Project State
  const [project, setProject] = useState<ProjectState>(initialLoadedData.project);

  // Persistence State
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState<string>(() =>
    getProjectFingerprint(initialLoadedData.project)
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Unsaved changes detection
  const currentFingerprint = useMemo(() => getProjectFingerprint(project), [project]);
  const hasUnsavedChanges = currentFingerprint !== lastSavedFingerprint;

  // Transient UI-only states (views, modals, notifications, orientation)
  const [viewMode, setViewMode] = useState<ViewMode>('tracks');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [isUnsavedWarningOpen, setIsUnsavedWarningOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'new' | 'open' | 'reset';
    file?: File;
  } | null>(null);
  const [fileErrorMessage, setFileErrorMessage] = useState<string | null>(null);

  // Standard MIDI Import & Export State
  const [midiAnalysis, setMidiAnalysis] = useState<MidiAnalysisResult | null>(null);
  const [parsedMidi, setParsedMidi] = useState<Midi | null>(null);
  const [isMidiImportOpen, setIsMidiImportOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(
    initialLoadedData.isRestored
      ? `Restored autosaved session (${initialLoadedData.restoredTime})`
      : null
  );
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  // Autosave to localStorage on project state changes (debounced by 800ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProjectToLocalStorage(project);
    }, 800);
    return () => clearTimeout(timer);
  }, [project]);

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
      const isSoloing = !target?.soloed;
      return {
        ...prev,
        updatedAt: Date.now(),
        tracks: prev.tracks.map((t) => {
          if (t.id === id) return { ...t, soloed: isSoloing };
          return isSoloing ? { ...t, soloed: false } : t;
        }),
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
    setProject((prev) => {
      const target = prev.tracks.find((t) => t.id === id);
      const firstRegionId = target?.regions[0]?.id || null;
      return {
        ...prev,
        selectedTrackId: id,
        selectedRegionId: firstRegionId,
      };
    });
  };

  const handleSelectRegion = (trackId: string, regionId: string) => {
    setProject((prev) => ({
      ...prev,
      selectedTrackId: trackId,
      selectedRegionId: regionId,
    }));
  };

  // Real MIDI Note Mutation Handler (Used by PianoRollView)
  const handleUpdateNotes = (trackId: string, regionId: string, notes: MidiNote[]) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      tracks: prev.tracks.map((track) => {
        if (track.id !== trackId) return track;
        return {
          ...track,
          regions: track.regions.map((region) => {
            if (region.id !== regionId) return region;
            return {
              ...region,
              notes,
            };
          }),
        };
      }),
    }));
  };

  // Track Creation, Reordering & Deletion
  const handleAddTrack = (category: InstrumentCategory, name: string, trackType: TrackType) => {
    const newTrackId = `tr-${Date.now()}`;
    const newRegionId = `rg-${newTrackId}-1`;

    const newTrack: TrackData = {
      id: newTrackId,
      trackNumber: project.tracks.length + 1,
      name,
      category,
      trackType,
      volume: 80,
      pan: 0,
      muted: false,
      soloed: false,
      armed: false,
      programNumber: 0,
      midiChannel: (project.tracks.length % 16) + 1,
      regions: [
        {
          id: newRegionId,
          name: `${name} Clip 1`,
          startBar: 1,
          lengthBars: 4,
          type: trackType,
          notes: [],
        },
      ],
    };

    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      tracks: [...prev.tracks, newTrack],
      selectedTrackId: newTrackId,
      selectedRegionId: newRegionId,
    }));
    showToast(`Added track "${name}"`);
  };

  const handleReorderTrack = (id: string, direction: 'up' | 'down') => {
    setProject((prev) => {
      const index = prev.tracks.findIndex((t) => t.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.tracks.length - 1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const newTracks = [...prev.tracks];
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
      const newRegionSelected =
        newTracks.find((t) => t.id === newSelected)?.regions[0]?.id || null;

      return {
        ...prev,
        updatedAt: Date.now(),
        tracks: newTracks,
        selectedTrackId: newSelected,
        selectedRegionId: newRegionSelected,
      };
    });
    showToast('Track deleted');
  };

  // ==========================================
  // PERSISTENCE ACTIONS (SAVE, SAVE AS, OPEN, NEW)
  // ==========================================

  // Save Project (Direct download of .dawproj and fingerprint sync)
  const handleSaveProject = () => {
    const filename = downloadProjectFile(project);
    const newFingerprint = getProjectFingerprint(project);
    setLastSavedFingerprint(newFingerprint);
    const timeStr = new Date().toLocaleTimeString();
    setLastSavedAt(timeStr);
    saveProjectToLocalStorage(project);
    showToast(`Saved project file "${filename}"`);
  };

  // Save As (Download with custom filename)
  const handleSaveAs = (customFilename: string) => {
    const filename = downloadProjectFile(project, customFilename);
    const newFingerprint = getProjectFingerprint(project);
    setLastSavedFingerprint(newFingerprint);
    const timeStr = new Date().toLocaleTimeString();
    setLastSavedAt(timeStr);
    saveProjectToLocalStorage(project);
    showToast(`Saved as "${filename}"`);
  };

  // Execute Open Project
  const executeOpenProject = async (file: File) => {
    const result = await readProjectFromFile(file);
    if (result.success === false) {
      setFileErrorMessage(result.error);
      return;
    }

    setProject(result.project);
    const newFingerprint = getProjectFingerprint(result.project);
    setLastSavedFingerprint(newFingerprint);
    const timeStr = new Date().toLocaleTimeString();
    setLastSavedAt(timeStr);
    saveProjectToLocalStorage(result.project);

    if (result.warnings && result.warnings.length > 0) {
      showToast(`Loaded "${result.project.name}" with minor adjustments`);
    } else {
      showToast(`Loaded project "${result.project.name}"`);
    }
  };

  // Execute New Project
  const executeNewProject = () => {
    const freshProject: ProjectState = {
      ...INITIAL_PROJECT_STATE,
      id: `proj-${Date.now()}`,
      name: 'Untitled Project',
      updatedAt: Date.now(),
    };
    setProject(freshProject);
    setLastSavedFingerprint(getProjectFingerprint(freshProject));
    setLastSavedAt(null);
    clearLocalStorageAutosave();
    saveProjectToLocalStorage(freshProject);
    showToast('Started new project session');
  };

  // Execute Reset Project
  const executeResetProject = () => {
    setProject(INITIAL_PROJECT_STATE);
    setLastSavedFingerprint(getProjectFingerprint(INITIAL_PROJECT_STATE));
    setLastSavedAt(null);
    saveProjectToLocalStorage(INITIAL_PROJECT_STATE);
    showToast('Reset project to default template');
  };

  // ==========================================
  // STANDARD MIDI I/O ACTIONS (.MID / .MIDI)
  // ==========================================

  // Open & analyze standard MIDI file
  const handleRequestOpenMidiFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const result = analyzeMidiFile(buffer, file.name);

      if (result.success === false) {
        setFileErrorMessage(result.error);
        return;
      }

      setMidiAnalysis(result.analysis);
      setParsedMidi(result.midi);
      setIsMidiImportOpen(true);
    } catch (err) {
      setFileErrorMessage(`Failed to read MIDI file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Confirm MIDI import into active workspace
  const handleConfirmMidiImport = () => {
    if (!parsedMidi) return;

    const { project: importedProject, warnings } = convertMidiToProject(parsedMidi, {
      fileName: midiAnalysis?.fileName,
    });

    setProject(importedProject);
    const newFingerprint = getProjectFingerprint(importedProject);
    setLastSavedFingerprint(newFingerprint);
    setLastSavedAt(null);
    saveProjectToLocalStorage(importedProject);

    setIsMidiImportOpen(false);
    setMidiAnalysis(null);
    setParsedMidi(null);

    const noteCount = midiAnalysis?.totalNotes || 0;
    const trackCount = importedProject.tracks.length;
    showToast(`Imported MIDI "${importedProject.name}" (${trackCount} tracks, ${noteCount} notes)`);

    if (warnings.length > 0) {
      setTimeout(() => {
        showToast(warnings[0]);
      }, 3600);
    }
  };

  // Export current live project as standard Type 1 MIDI file
  const handleExportMidi = () => {
    try {
      downloadMidiFile(project);
      const cleanName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      showToast(`Exported standard MIDI "${cleanName}.mid"`);
    } catch (err) {
      setFileErrorMessage(`Failed to export MIDI file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Guarded actions with unsaved work check
  const handleRequestOpenProjectFile = (file: File) => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'open', file });
      setIsUnsavedWarningOpen(true);
    } else {
      executeOpenProject(file);
    }
  };

  const handleRequestNewProject = () => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'new' });
      setIsUnsavedWarningOpen(true);
    } else {
      executeNewProject();
    }
  };

  const handleRequestResetProject = () => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'reset' });
      setIsUnsavedWarningOpen(true);
    } else {
      executeResetProject();
    }
  };

  // Unsaved changes confirmation handlers
  const handleSaveAndProceed = () => {
    handleSaveProject();
    setIsUnsavedWarningOpen(false);
    if (!pendingAction) return;

    if (pendingAction.type === 'open' && pendingAction.file) {
      executeOpenProject(pendingAction.file);
    } else if (pendingAction.type === 'new') {
      executeNewProject();
    } else if (pendingAction.type === 'reset') {
      executeResetProject();
    }
    setPendingAction(null);
  };

  const handleDiscardAndProceed = () => {
    setIsUnsavedWarningOpen(false);
    if (!pendingAction) return;

    if (pendingAction.type === 'open' && pendingAction.file) {
      executeOpenProject(pendingAction.file);
    } else if (pendingAction.type === 'new') {
      executeNewProject();
    } else if (pendingAction.type === 'reset') {
      executeResetProject();
    }
    setPendingAction(null);
  };

  const handleCancelPendingAction = () => {
    setIsUnsavedWarningOpen(false);
    setPendingAction(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#000000] text-white overflow-hidden select-none font-sans relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#121212] border border-[#00FF41] text-[#00FF41] px-4 py-2 rounded-lg text-xs font-mono shadow-[0_0_20px_rgba(0,255,65,0.3)] flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP BAR */}
      <TopBar
        project={project}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveProject={handleSaveProject}
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
            onSelectRegion={handleSelectRegion}
            onReorderTrack={handleReorderTrack}
            onDeleteTrack={handleDeleteTrack}
            onAddTrack={() => setIsMenuOpen(true)}
          />
        )}

        {viewMode === 'piano-roll' && (
          <PianoRollView
            tracks={project.tracks}
            selectedTrackId={project.selectedTrackId}
            selectedRegionId={project.selectedRegionId}
            onSelectTrack={handleSelectTrack}
            onSelectRegion={handleSelectRegion}
            onUpdateNotes={handleUpdateNotes}
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
            hasUnsavedChanges={hasUnsavedChanges}
            lastSavedAt={lastSavedAt}
            onUpdateProjectName={handleUpdateProjectName}
            onUpdateBpm={handleUpdateBpm}
            onUpdateKeySignature={handleUpdateKeySignature}
            onUpdateTimeSignature={handleUpdateTimeSignature}
            onResetProject={handleRequestResetProject}
            onSaveProject={handleSaveProject}
            onOpenSaveAs={() => setIsSaveAsOpen(true)}
            onOpenProjectFile={handleRequestOpenProjectFile}
            onNewProject={handleRequestNewProject}
            onOpenMidiFile={handleRequestOpenMidiFile}
            onExportMidi={handleExportMidi}
          />
        )}
      </main>

      {/* 4. BOTTOM TOUCH NAVIGATION */}
      <BottomNavigation
        currentView={viewMode}
        onSelectView={setViewMode}
      />

      {/* Project & File Manager Modal */}
      <ProjectMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        projectName={project.name}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt}
        onAddTrack={handleAddTrack}
        onNewProject={handleRequestNewProject}
        onOpenProjectFile={handleRequestOpenProjectFile}
        onSaveProject={handleSaveProject}
        onOpenSaveAs={() => setIsSaveAsOpen(true)}
        onResetProject={handleRequestResetProject}
        onOpenMidiFile={handleRequestOpenMidiFile}
        onExportMidi={handleExportMidi}
      />

      {/* Save As Modal */}
      <SaveAsModal
        isOpen={isSaveAsOpen}
        currentName={project.name}
        onSaveAs={handleSaveAs}
        onClose={() => setIsSaveAsOpen(false)}
      />

      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesModal
        isOpen={isUnsavedWarningOpen}
        projectName={project.name}
        actionTitle={
          pendingAction?.type === 'new'
            ? 'Start New Project'
            : pendingAction?.type === 'open'
            ? `Open "${pendingAction.file?.name || 'File'}"`
            : 'Reset Session to Default Tracks'
        }
        onSaveAndProceed={handleSaveAndProceed}
        onDiscardAndProceed={handleDiscardAndProceed}
        onCancel={handleCancelPendingAction}
      />

      {/* File Format & Validation Error Modal */}
      <FileErrorModal
        isOpen={Boolean(fileErrorMessage)}
        errorMessage={fileErrorMessage}
        onClose={() => setFileErrorMessage(null)}
      />

      {/* Standard MIDI File Import & Review Modal */}
      <MidiImportModal
        isOpen={isMidiImportOpen}
        onClose={() => {
          setIsMidiImportOpen(false);
          setMidiAnalysis(null);
          setParsedMidi(null);
        }}
        analysis={midiAnalysis}
        hasUnsavedChanges={hasUnsavedChanges}
        onConfirmImport={handleConfirmMidiImport}
      />
    </div>
  );
};
