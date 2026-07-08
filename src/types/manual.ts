export interface InboxItem {
  id: string;
  text: string;
  created: string;
  project: string | null;
  done: boolean;
}

export interface ManualData {
  overrides: Record<string, Record<string, string | null>>;
  due_dates: Record<string, string>;
  inbox: InboxItem[];
}
