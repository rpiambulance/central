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
  /** The credential this line calls for, item override already applied. */
  requires: Credential | null;
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
    signoffCredentialType: Credential | null;
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
  signoffCredentialType: Credential | null;
  leadsTo: Array<{ id: number; key: string; name: string }>;
};
