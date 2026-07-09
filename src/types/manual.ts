export interface InboxItem {
  id: string;
  text: string;
  created: string;
  project: string | null;
  done: boolean;
}

export interface TokenLogEntry {
  id: string;
  projectId: string;
  tokens: number;
  note: string | null;
  created: string;
}

export interface ManualData {
  overrides: Record<string, Record<string, string | null>>;
  due_dates: Record<string, string>;
  inbox: InboxItem[];
  hidden_fields: Record<string, { due_date?: boolean; priority?: boolean }>;
  token_log: TokenLogEntry[];
}
