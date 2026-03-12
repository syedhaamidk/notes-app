export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: string;
  _count?: { notes: number };
}

export interface NoteTag {
  noteId: string;
  tagId: string;
  tag: Tag;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  emoji?: string | null;
  color?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  userId: string;
  tags: NoteTag[];
  createdAt: string;
  updatedAt: string;
}

export type ExportTemplate = "minimal" | "journal" | "dark" | "pastel" | "elegant";

export interface ExportOptions {
  template: ExportTemplate;
  format: "pdf" | "png" | "txt" | "md";
  note: Note;
}
