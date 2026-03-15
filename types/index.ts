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

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  emoji?: string | null;
  color?: string | null;
  coverImage?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  shareId?: string | null;
  isShared: boolean;
  wordCount: number;
  userId: string;
  tags: NoteTag[];
  versions?: NoteVersion[];
  createdAt: string;
  updatedAt: string;
}

export type ExportTemplate = "minimal" | "journal" | "dark" | "pastel" | "elegant";

export interface ExportOptions {
  template: ExportTemplate;
  format: "pdf" | "png" | "txt" | "md";
  note: Note;
}
