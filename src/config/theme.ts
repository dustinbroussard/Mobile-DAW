import { InstrumentCategory } from '../types/daw';

export const DAW_THEME = {
  // Canvas & Surface Colors
  canvas: '#000000',
  surfacePrimary: '#121212',
  surfaceSecondary: '#161616',
  surfaceElevated: '#1E1E1E',
  border: '#222222',
  borderSubtle: '#1A1A1A',

  // Typography & UI State Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#555555',
  textMuted: '#333333',
  arrangementGold: '#D4AF37',
  recordDanger: '#FF3B30',
  actionCyan: '#00E5FF',

  // Semantic Track Accent Colors
  trackAccents: {
    'piano': '#00FF41',          // Green
    'drums': '#00FF41',          // Green
    'electric-piano': '#FFE600', // Yellow
    'lead-vocal': '#FFE600',     // Yellow
    'guitar': '#2B7FFF',         // Blue
    'clean-guitar': '#FF3B30',   // Red
    'bass': '#B026FF',           // Purple
    'strings': '#FF7A00',        // Orange
    'horns': '#00E5FF',          // Cyan
    'blues-organ': '#00E5FF',    // Cyan
  } as Record<InstrumentCategory, string>,

  // Inactive / Muted State
  mutedState: '#555555',
} as const;

/**
 * Derives the track accent color dynamically from the instrument category.
 * Decouples track data model from hardcoded color storage.
 */
export function getTrackColor(category: InstrumentCategory): string {
  return DAW_THEME.trackAccents[category] || '#00FF41';
}

/**
 * Utility helper to get the appropriate color for active/inactive/muted track states
 */
export function getTrackStateColor(
  category: InstrumentCategory,
  state: { isMuted?: boolean; isActive?: boolean; isSelected?: boolean }
): string {
  if (state.isMuted) {
    return DAW_THEME.mutedState;
  }
  const accent = getTrackColor(category);
  if (state.isActive === false) {
    return `${accent}66`; // 40% opacity hex
  }
  return accent;
}

/**
 * Get glow style for active LEDs and indicators
 */
export function getLEDGlowStyle(color: string, intensity: 'low' | 'high' = 'high') {
  if (color === DAW_THEME.mutedState) {
    return {};
  }
  const shadowSpread = intensity === 'high' ? '0 0 10px' : '0 0 4px';
  return {
    boxShadow: `${shadowSpread} ${color}A0`,
  };
}
