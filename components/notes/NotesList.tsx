"use client";
import { Note } from "@/types";
import { format } from "date-fns";
import { Pin, Trash2, RotateCcw, GripVertical } from "lucide-react";
import { useState, useRef } from "react";

interface Props {
  notes: Note[];
  loading: boolean;
  selectedNote: Note | null;
  filter: string;
  search?: string;
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

function highlight(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? `<mark key=${i} style="background:var(--accent-light);color:var(--text);border-radius:2px;padding:0 1px;">${part}</mark>`
      : part
  ).join('');
}

export function NotesList({ notes, loading, selectedNote, filter, search = "", onSelect, onPin, onTrash, onDelete, onRestore }: Props) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragNote = useRef<string | null>(null);

  const pinned = notes.filter(n => n.isPinned);
  const others = notes.filter(n => !n.isPinned);

  const handleDragStart = (id: string) => { dragNote.current = id; };
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOver(id); };
  const handleDrop = () => { setDragOver(null); dragNote.current = null; };

  if (loading) return (
    <div className="flex-1 p-3 space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "var(--surface-hover)", height: "72px", animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );

  if (notes.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8">
      <span style={{ fontSize: "28px", opacity: 0.2 }}>◈</span>
      <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
        {search ? `No results for "${search}"` : filter === "trash" ? "Trash is empty" : filter === "archive" ? "Nothing archived" : "No notes yet"}
      </p>
    </div>
  );

  const NoteCard = ({ note }: { note: Note }) => {
    const isSelected = selectedNote?.id === note.id;
    const bg = note.color ? (NOTE_COLORS[note.color] || "var(--surface)") : "var(--surface)";
    const rawPreview = note.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 90);
    const highlightedTitle = highlight(note.title || "Untitled", search);
    const highlightedPreview = highlight(rawPreview, search);
    const isDragTarget = dragOver === note.id;

    return (
      <div
        draggable
        onDragStart={() => handleDragStart(note.id)}
        onDragOver={(e) => handleDragOver(e, note.id)}
        onDrop={handleDrop}
        onDragLeave={() => setDragOver(null)}
        onClick={() => onSelect(note)}
        className="group relative rounded-xl p-3 cursor-pointer transition-all"
        style={{
          background: isSelected ? "var(--surface-hover)" : bg,
          border: `1px solid ${isSelected ? "var(--text)" : isDragTarget ? "var(--text-muted)" : "var(--border-light)"}`,
          outline: isSelected ? "1.5px solid var(--text)" : "none",
          outlineOffset: "-1px",
          transform: isDragTarget ? "scale(1.01)" : "scale(1)",
          transition: "all 0.15s ease",
        }}>

        {/* Drag handle */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity cursor-grab">
          <GripVertical size={12} style={{ color: "var(--text-muted)" }} />
        </div>

        <div className="flex items-start gap-2 pl-1">
          {note.emoji && <span style={{ fontSize: "14px", lineHeight: "1.5", flexShrink: 0 }}>{note.emoji}</span>}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate"
              style={{ fontFamily: "var(--font-display)", fontSize: "13.5px", color: "var(--text)" }}
              dangerouslySetInnerHTML={{ __html: highlightedTitle }} />
            {rawPreview && (
              <p className="mt-0.5 text-xs line-clamp-2"
                style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: "1.5" }}
                dangerouslySetInnerHTML={{ __html: highlightedPreview }} />
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                {format(new Date(note.updatedAt), "MMM d")}
              </span>
              {note.tags.slice(0, 2).map(nt => (
                <span key={nt.tagId} className="px-1.5 py-0.5 rounded-full"
                  style={{ background: nt.tag.color + "22", color: nt.tag.color, fontSize: "10px" }}>
                  {nt.tag.name}
                </span>
              ))}
              {note.wordCount > 0 && (
                <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto" }}>{note.wordCount}w</span>
              )}
            </div>
          </div>
          {note.isPinned && <Pin size={9} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: "4px" }} />}
        </div>

        {/* Hover actions */}
        <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {filter !== "trash" && (
            <button onClick={(e) => { e.stopPropagation(); onPin(note.id); }}
              className="p-1 rounded-md hover:bg-black/10 transition-all"
              title={note.isPinned ? "Unpin" : "Pin"}>
              <Pin size={10} style={{ color: note.isPinned ? "var(--text)" : "var(--text-muted)" }} />
            </button>
          )}
          {filter === "trash" ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); onRestore(note.id); }}
                className="p-1 rounded-md hover:bg-black/10" title="Restore">
                <RotateCcw size={10} style={{ color: "var(--text-muted)" }} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                className="p-1 rounded-md hover:bg-black/10" title="Delete forever">
                <Trash2 size={10} style={{ color: "var(--danger)" }} />
              </button>
            </>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onTrash(note.id); }}
              className="p-1 rounded-md hover:bg-black/10" title="Trash">
              <Trash2 size={10} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
      {pinned.length > 0 && (
        <>
          <p className="px-1 py-1 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)", letterSpacing: "0.1em", fontSize: "10px" }}>Pinned</p>
          {pinned.map(note => <NoteCard key={note.id} note={note} />)}
          {others.length > 0 && <p className="px-1 pt-2 pb-1 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)", letterSpacing: "0.1em", fontSize: "10px" }}>Notes</p>}
        </>
      )}
      {others.map(note => <NoteCard key={note.id} note={note} />)}
    </div>
  );
}
