/**
 * Participant Identity Types
 *
 * Participants are identified by client-generated UUIDs.
 * No server-side participant model - purely client-side identity.
 */

/**
 * Participant Identity
 * Represents a participant's identity within a session
 */
export interface ParticipantIdentity {
  /** UUID v4 - client-generated participant identifier */
  participantId: string;
  /** Session code this participant is associated with */
  sessionCode: string;
}

/**
 * Participant Action
 * Base type for actions taken by a participant
 */
export interface ParticipantAction {
  /** UUID v4 - participant who performed the action */
  participantId: string;
  /** When the action was performed */
  timestamp: Date;
}

/**
 * Participant Metadata (optional - for localStorage tracking)
 * Additional client-side information about participant preferences
 */
export interface ParticipantMetadata {
  /** Participant's chosen display name (if any) */
  displayName?: string;
  /** Whether participant prefers anonymous submissions */
  preferAnonymous?: boolean;
  /** When participant first joined this session */
  joinedAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
}
