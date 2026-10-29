import { ProjectState } from './daw';

/**
 * Standard DAW Studio Project File Format Identifier
 */
export const DAW_PROJECT_FILE_FORMAT = 'DAW_STUDIO_PROJECT';

/**
 * Current Supported Project File Schema Version
 */
export const CURRENT_PROJECT_SCHEMA_VERSION = 1;

/**
 * Default file extension for DAW project files
 */
export const DAW_PROJECT_FILE_EXTENSION = '.dawproj';

/**
 * Project File Envelope (Version 1)
 */
export interface ProjectFileV1 {
  /** Magic format identifier for validation */
  format: typeof DAW_PROJECT_FILE_FORMAT;
  /** Integer schema version for backwards/forwards compatibility */
  schemaVersion: 1;
  /** Application software version that generated this file */
  appVersion: string;
  /** ISO 8601 string timestamp when the export occurred */
  exportedAt: string;
  /** Complete musical and arrangement project state */
  project: ProjectState;
}

/**
 * Union of all supported project file formats (extensible for future schema versions)
 */
export type DawProjectFile = ProjectFileV1;

/**
 * Validation and Migration Result
 */
export type ProjectValidationResult =
  | {
      success: true;
      project: ProjectState;
      schemaVersion: number;
      warnings?: string[];
    }
  | {
      success: false;
      error: string;
    };
