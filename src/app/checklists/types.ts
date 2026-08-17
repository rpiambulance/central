export type Credential = { id: number; key: string; name: string };

export type Signoff = {
  id: number;
  signedAt: string;
  note: string | null;
  signedBy: { id: number; firstName: string; lastName: string };
};

export type ChecklistItem = {
  id: number;
  order: number;
  prompt: string;
  scoreType: string;
  signoff: Signoff | null;
  /** Who may sign this line — any one of them. Item override applied. */
  requires: Credential[];
};

export type ChecklistGroup = {
  id: number;
  order: number;
  heading: string;
  description: string | null;
  items: ChecklistItem[];
};

export type Progress = {
  template: {
    id: number;
    name: string;
    version: number;
    signoffCredentialTypes: Credential[];
  };
  member: { id: number; firstName: string; lastName: string };
  leadsTo: { id: number; key: string; name: string } | null;
  items: ChecklistItem[];
  groups: ChecklistGroup[];
  signed: number;
  total: number;
  complete: boolean;
};

export type ChecklistSummary = {
  id: number;
  name: string;
  version: number;
  signoffCredentialTypes: Credential[];
  leadsTo: Array<{ id: number; key: string; name: string }>;
};

/**
 * Who may sign, in prose. Any one of the named credentials is enough, and
 * anything above it on the ladder counts as holding it.
 */
export function signersLabel(credentials: Credential[]): string {
  const names = credentials.map((credential) => credential.name);
  if (!names.length) return '';
  if (names.length === 1) return `${names[0]} or above`;
  // The trailing comma matters with several: "A or B, or above" reads as one
  // of A or B, while "A or B or above" reads as a third alternative.
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}, or above`;
}
