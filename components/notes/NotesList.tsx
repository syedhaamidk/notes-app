"use client";
import { Note } from "@/types";
import { format } from "date-fns";
import { Pin, Trash2, RotateCcw } from "lucide-react";
import { useState } from "react";

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
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'),
    '<mark style="background:rgba(128,128,128,0.25);border-radius:2px;padding:0 1px">$1</mark>');
}

export function NotesList({ notes, loading, selectedNote, filter, search = "", onSelect, onPin, onTrash, onDelete, onRestore }: Props) {
  const pinned = notes.filter(n => n.isPinned);
  const others = notes.filter(n => !n.isPinned);

  if (loading) return (
    <div className="flex-1 p-3 space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl animate-pulse"
          style={{ background: "var(--surface-hover)", height: "72px", animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );

  if (notes.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8">
      <span style={{ fontSize: "28px", opacity: 0.15 }}>◈</span>
      <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>
        {search ? `No results for "${search}"` :
         filter === "trash" ? "Trash is empty" :
         filter === "archive" ? "Nothing archived" :
         filter === "pinned" ? "No pinned notes" : "No notes yet"}
      </p>
    </div>
  );

  const NoteCard = ({ note }: { note: Note }) => {
    const [hovered, setHovered] = useState(false);
    const isSelected = selectedNote?.id === note.id;
    const bg = note.color ? (NOTE_COLORS[note.color] || "var(--surface)") : "var(--surface)";
    const rawPreview = note.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 80);

    const handlePin = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onPin(note.id);
    };

    const handleTrash = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onTrash(note.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(note.id);
    };

    const handleRestore = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRestore(note.id);
    };

    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onSelect(note)}
        className="relative rounded-xl cursor-pointer transition-all"
        style={{
          background: isSelected ? "var(--surface-hover)" : bg,
          border: `1px solid ${isSelected ? "var(--text)" : "var(--border-light)"}`,
          outline: isSelected ? "1.5px solid var(--text)" : "none",
          outlineOffset: "-1px",
          userSelect: "none",
        }}>

        <div className="p-3" style={{ paddingRight: hovered ? "72px" : "12px", transition: "padding-right 0.15s ease" }}>
          <div className="flex items-start gap-2">
            {note.emoji && (
              <span style={{ fontSize: "14px", lineHeight: "1.5", flexShrink: 0 }}>{note.emoji}</span>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {note.isPinned && (
                  <Pin size={9} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                )}
                <p className="font-medium truncate"
                  style={{ fontFamily: "var(--font-display)", fontSize: "13.5px", color: "var(--text)" }}
                  dangerouslySetInnerHTML={{ __html: highlight(note.title || "Untitled", search) }} />
              </div>
              {rawPreview && (
                <p className="line-clamp-2"
                  style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: "1.5" }}
                  dangerouslySetInnerHTML={{ __html: highlight(rawPreview, search) }} />
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
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto" }}>
                    {note.wordCount}w
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hover action buttons */}
        {hovered && (
          <div
            className="absolute flex items-center gap-1"
            style={{ top: "50%", right: "8px", transform: "translateY(-50%)" }}
            onMouseEnter={() => setHovered(true)}>

            {filter === "trash" ? (
              <>
                <button
                  onMouseDown={handleRestore}
                  className="flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                  style={{ width: "28px", height: "28px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  title="Restore">
                  <RotateCcw size={12} />
                </button>
                <button
                  onMouseDown={handleDelete}
                  className="flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                  style={{ width: "28px", height: "28px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--danger)" }}
                  title="Delete forever">
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <>
                <button
                  onMouseDown={handlePin}
                  className="flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                  style={{ width: "28px", height: "28px", background: "var(--surface)", border: "1px solid var(--border)", color: note.isPinned ? "var(--text)" : "var(--text-muted)" }}
                  title={note.isPinned ? "Unpin" : "Pin"}>
                  <Pin size={12} style={{ fill: note.isPinned ? "currentColor" : "none" }} />
                </button>
                <button
                  onMouseDown={handleTrash}
                  className="flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                  style={{ width: "28px", height: "28px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  title="Move to trash">
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Mobile long-press hint — ··· always visible on touch */}
        <div className="md:hidden absolute top-2 right-2" style={{ opacity: 0.3 }}>
          <span style={{ fontSize: "16px", color: "var(--text-muted)", letterSpacing: "1px" }}>···</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
      {pinned.length > 0 && (
        <>
          <p className="px-1 pt-1 pb-0.5"
            style={{ color: "var(--text-muted)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Pinned
          </p>
          {pinned.map(note => <NoteCard key={note.id} note={note} />)}
          {others.length > 0 && (
            <p className="px-1 pt-2.5 pb-0.5"
              style={{ color: "var(--text-muted)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Notes
            </p>
          )}
        </>
      )}
      {others.map(note => <NoteCard key={note.id} note={note} />)}
    </div>
  );
}
