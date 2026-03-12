"use client";
import { Note } from "@/types";
import { format } from "date-fns";
import { Pin, Trash2, ArchiveRestore, RotateCcw } from "lucide-react";

interface Props {
  notes: Note[];
  loading: boolean;
  selectedNote: Note | null;
  filter: string;
  onSelect: (note: Note) => void;
  onPin: (id: string) => void;
  onTrash: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

const NOTE_COLORS: Record<string, string> = {
  cream: "#fdf8f0", sage: "#f0f4f0", rose: "#fdf0f3",
  sky: "#f0f4fd", lavender: "#f3f0fd", yellow: "#fdf9e3",
};

export function NotesList({ notes, loading, selectedNote, filter, onSelect, onPin, onTrash, onDelete, onRestore }: Props) {
  const pinned = notes.filter(n => n.isPinned);
  const others = notes.filter(n => !n.isPinned);

  if (loading) return (
    <div className="flex-1 p-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "var(--surface-hover)", height: "80px" }} />
      ))}
    </div>
  );

  if (notes.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8">
      <span style={{ fontSize: "32px", opacity: 0.3 }}>◈</span>
      <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
        {filter === "trash" ? "Trash is empty" : filter === "archive" ? "Nothing archived" : "No notes yet"}
      </p>
    </div>
  );

  const NoteCard = ({ note }: { note: Note }) => {
    const isSelected = selectedNote?.id === note.id;
    const bg = note.color ? (NOTE_COLORS[note.color] || "#ffffff") : "var(--surface)";
    const preview = note.content.replace(/#{1,6}\s/g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/\n/g, " ").slice(0, 80);

    return (
      <div
        onClick={() => onSelect(note)}
        className="group relative rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-sm"
        style={{
          background: isSelected ? (note.color ? bg : "var(--accent-light)") : bg,
          border: `1px solid ${isSelected ? "var(--accent)" : "var(--border-light)"}`,
          outline: isSelected ? "1.5px solid var(--accent)" : "none",
          outlineOffset: "-1px",
        }}>
        <div className="flex items-start gap-2">
          {note.emoji && <span style={{ fontSize: "16px", lineHeight: "1.4" }}>{note.emoji}</span>}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" style={{
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              color: "var(--text)",
            }}>
              {note.title || "Untitled"}
            </p>
            {preview && (
              <p className="mt-0.5 text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                {preview}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {format(new Date(note.updatedAt), "MMM d")}
              </span>
              {note.tags.slice(0, 2).map(nt => (
                <span key={nt.tagId} className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: nt.tag.color + "22", color: nt.tag.color, fontSize: "10px" }}>
                  {nt.tag.name}
                </span>
              ))}
            </div>
          </div>
          {note.isPinned && (
            <Pin size={10} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "4px" }} />
          )}
        </div>

        {/* Hover actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {filter !== "trash" && !note.isTrashed && (
            <button onClick={(e) => { e.stopPropagation(); onPin(note.id); }}
              className="p-1 rounded-md hover:bg-white/60 transition-all"
              title={note.isPinned ? "Unpin" : "Pin"}>
              <Pin size={11} style={{ color: note.isPinned ? "var(--accent)" : "var(--text-muted)" }} />
            </button>
          )}
          {filter === "trash" ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); onRestore(note.id); }}
                className="p-1 rounded-md hover:bg-white/60 transition-all" title="Restore">
                <RotateCcw size={11} style={{ color: "var(--text-muted)" }} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                className="p-1 rounded-md hover:bg-white/60 transition-all" title="Delete forever">
                <Trash2 size={11} style={{ color: "var(--danger)" }} />
              </button>
            </>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onTrash(note.id); }}
              className="p-1 rounded-md hover:bg-white/60 transition-all" title="Move to trash">
              <Trash2 size={11} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-1">
      {pinned.length > 0 && (
        <>
          <p className="px-1 pb-1 text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Pinned</p>
          {pinned.map(note => <NoteCard key={note.id} note={note} />)}
          {others.length > 0 && <p className="px-1 pt-2 pb-1 text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Others</p>}
        </>
      )}
      {others.map(note => <NoteCard key={note.id} note={note} />)}
    </div>
  );
}
