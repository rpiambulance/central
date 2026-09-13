/** The shapes the board and its controls share. */

export type Person = {
  id: number;
  firstName: string;
  preferredFirstName?: string | null;
  lastName: string;
};

export type Personnel = {
  id: number;
  role: 'EES_IC' | 'EES' | 'CREW' | 'SUPPORT';
  fromSignup: boolean;
  removedAt: string | null;
  member: Person;
  assignments: Array<{ id: number; unitId: number; position: string | null; removedAt: string | null }>;
};

export type Unit = {
  id: number;
  name: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'AT_PATIENT' | 'TRANSPORTING' | 'OUT_OF_SERVICE';
  retiredAt: string | null;
  currentLocation: { id: number; name: string } | null;
  currentLocationText: string | null;
  stagingLocation: { id: number; name: string } | null;
  stagingLocationText: string | null;
  assignments: Array<{
    id: number;
    position: string | null;
    removedAt: string | null;
    personnel: { id: number; member: Person };
  }>;
};

export type Encounter = {
  id: number;
  sequence: number;
  openedAt: string;
  closedAt: string | null;
  patientInitials: string | null;
  patientAge: number | null;
  patientAgeUnit: string | null;
  category: 'MINOR_INJURY' | 'MAJOR_INJURY' | 'MINOR_ILLNESS' | 'MAJOR_ILLNESS';
  died: boolean;
  intoxicationSigns: boolean;
  chiefComplaint: string | null;
  treatment: string | null;
  narrative: string | null;
  disposition:
    | 'RMA'
    | 'TRANSPORTED'
    | 'TURNOVER'
    | 'TREATED_RELEASED'
    | 'NO_PATIENT_FOUND'
    | 'DECEASED';
  hospitalId: number | null;
  turnoverAgency: string | null;
  firstAidOnly: boolean;
  runNumberId: number | null;
  runNumber: { id: number; number: string } | null;
  countyRunNumber: string | null;
  prid: string | null;
  locationId: number | null;
  locationText: string | null;
  unit: { id: number; name: string } | null;
  createdBy: Person | null;
};

export type Standby = {
  id: number;
  closedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalAttendance: number | null;
  totalEstimated: boolean;
  peakAttendance: number | null;
  peakEstimated: boolean;
  unusualOccurrences: string | null;
  event: { id: number; title: string; startsAt: string; endsAt: string };
  venue: { id: number; name: string; locations: Array<{ id: number; name: string }> } | null;
  personnel: Personnel[];
  units: Unit[];
  encounters: Encounter[];
  counts: {
    minorInjury: number;
    majorInjury: number;
    minorIllness: number;
    majorIllness: number;
    deaths: number;
    totalTreated: number;
    intoxication: number;
    transports: number;
  };
  viewer: {
    memberId: number | null;
    personnelId: number | null;
    role: string | null;
    mayReadAll: boolean;
    mayManage: boolean;
    /** Throwing the standby away is its own permission. */
    mayDelete: boolean;
  };
};

export type Config = {
  venues: Array<{ id: number; name: string; locations: Array<{ id: number; name: string }> }>;
  designators: Array<{ id: number; name: string }>;
  hospitals: Array<{ id: number; name: string }>;
};

export const ROLE_LABEL: Record<Personnel['role'], string> = {
  EES_IC: 'EES in charge',
  EES: 'Supervisor',
  CREW: 'Crew',
  SUPPORT: 'Support',
};

export const STATUS_LABEL: Record<Unit['status'], string> = {
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
  AT_PATIENT: 'At patient',
  TRANSPORTING: 'Transporting',
  OUT_OF_SERVICE: 'Out of service',
};

export const CATEGORY_LABEL: Record<Encounter['category'], string> = {
  MINOR_INJURY: 'Minor injury',
  MAJOR_INJURY: 'Major injury',
  MINOR_ILLNESS: 'Minor illness',
  MAJOR_ILLNESS: 'Major illness',
};

export const DISPOSITION_LABEL: Record<Encounter['disposition'], string> = {
  RMA: 'RMA',
  TRANSPORTED: 'Transported',
  TURNOVER: 'Turnover',
  TREATED_RELEASED: 'Treated & released',
  NO_PATIENT_FOUND: 'No patient found',
  DECEASED: 'Deceased',
};

/**
 * One line in the record of what happened.
 *
 * `text` is written by the API so the board and the event report cannot
 * describe the same thing two different ways.
 */
export type TimelineEntry = {
  id: string;
  at: string;
  kind: string;
  text: string;
  actor: Person | null;
};
