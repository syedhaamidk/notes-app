"use client";
import { Note } from "@/types";
import { format } from "date-fns";
import { Pin, Trash2, RotateCcw, MoreHorizontal } from "lucide-react";
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
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:rgba(0,0,0,0.12);border-radius:2px;padding:0 1px">$1</mark>');
}

export function NotesList({ notes, loading, selectedNote, filter, search = "", onSelect, onPin, onTrash, onDelete, onRestore }: Props) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const pinned = notes.filter(n => n.isPinned);
  const others = notes.filter(n => !n.isPinned);

  if (loading) return (
    <div className="flex-1 p-3 space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl p-4 animate-pulse"
          style={{ background: "var(--surface-hover)", height: "72px", animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );

  if (notes.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8">
      <span style={{ fontSize: "28px", opacity: 0.2 }}>◈</span>
      <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
        {search ? `No results for "${search}"` :
         filter === "trash" ? "Trash is empty" :
         filter === "archive" ? "Nothing archived" :
         filter === "pinned" ? "No pinned notes" : "No notes yet"}
      </p>
    </div>
  );

  const NoteCard = ({ note }: { note: Note }) => {
    const isSelected = selectedNote?.id === note.id;
    const isMenuOpen = activeMenu === note.id;
    const isHovered = hoveredId === note.id;
    const bg = note.color ? (NOTE_COLORS[note.color] || "var(--surface)") : "var(--surface)";
    const rawPreview = note.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 80);

    return (
      <div
        className="relative rounded-xl cursor-pointer transition-all"
        style={{
          background: isSelected ? "var(--surface-hover)" : bg,
          border: `1px solid ${isSelected ? "var(--text)" : "var(--border-light)"}`,
          outline: isSelected ? "1.5px solid var(--text)" : "none",
          outlineOffset: "-1px",
        }}
        onMouseEnter={() => setHoveredId(note.id)}
        onMouseLeave={() => { setHoveredId(null); }}
        onClick={() => { setActiveMenu(null); onSelect(note); }}>

        {/* Card content */}
        <div className="p-3" style={{ paddingRight: (isHovered || isMenuOpen) ? "68px" : "12px", transition: "padding 0.15s ease" }}>
          <div className="flex items-start gap-2">
            {note.emoji && <span style={{ fontSize: "14px", lineHeight: "1.5", flexShrink: 0 }}>{note.emoji}</span>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {note.isPinned && <Pin size={9} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                <p className="font-medium truncate"
                  style={{ fontFamily: "var(--font-display)", fontSize: "13.5px", color: "var(--text)" }}
                  dangerouslySetInnerHTML={{ __html: highlight(note.title || "Untitled", search) }} />
              </div>
              {rawPreview && (
                <p className="mt-0.5 line-clamp-2"
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

        {/* Hover action buttons — desktop */}
        <div
          className="md:flex hidden absolute top-1/2 -translate-y-1/2 right-2 items-center gap-0.5 transition-all"
          style={{ opacity: (isHovered || isMenuOpen) ? 1 : 0, pointerEvents: (isHovered || isMenuOpen) ? "auto" : "none" }}>

          {filter !== "trash" && (
            <button
              onClick={(e) => { e.stopPropagation(); onPin(note.id); }}
              className="p-1.5 rounded-lg transition-all hover:bg-black/10"
              title={note.isPinned ? "Unpin" : "Pin"}
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <Pin size={11} style={{ color: note.isPinned ? "var(--text)" : "var(--text-muted)" }} />
            </button>
          )}

          {filter === "trash" ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onRestore(note.id); }}
                className="p-1.5 rounded-lg transition-all hover:bg-black/10"
                title="Restore"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <RotateCcw size={11} style={{ color: "var(--text-muted)" }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                className="p-1.5 rounded-lg transition-all hover:bg-black/10"
                title="Delete forever"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <Trash2 size={11} style={{ color: "var(--danger)" }} />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onTrash(note.id); }}
              className="p-1.5 rounded-lg transition-all hover:bg-black/10"
              title="Move to trash"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <Trash2 size={11} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>

        {/* Mobile — ··· button always visible */}
        <button
          className="md:hidden absolute top-2 right-2 p-1.5 rounded-lg"
          onClick={(e) => { e.stopPropagation(); setActiveMenu(isMenuOpen ? null : note.id); }}
          style={{ background: isMenuOpen ? "var(--surface-hover)" : "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer" }}>
          <MoreHorizontal size={13} />
        </button>

        {/* Mobile dropdown */}
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-30 md:hidden" onClick={() => setActiveMenu(null)} />
            <div className="absolute right-1 top-8 rounded-xl shadow-lg z-40 py-1 animate-scale overflow-hidden md:hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: "150px" }}>
              {filter !== "trash" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPin(note.id); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-black/5 text-left"
                  style={{ fontSize: "13px", color: "var(--text)", fontFamily: "var(--font-body)", border: "none", background: "none", cursor: "pointer" }}>
                  <Pin size={12} />
                  {note.isPinned ? "Unpin" : "Pin"}
                </button>
              )}
              {filter === "trash" ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onRestore(note.id); setActiveMenu(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-black/5 text-left"
                    style={{ fontSize: "13px", color: "var(--text)", fontFamily: "var(--font-body)", border: "none", background: "none", cursor: "pointer" }}>
                    <RotateCcw size={12} /> Restore
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); setActiveMenu(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-black/5 text-left"
                    style={{ fontSize: "13px", color: "var(--danger)", fontFamily: "var(--font-body)", border: "none", background: "none", cursor: "pointer" }}>
                    <Trash2 size={12} /> Delete forever
                  </button>
                </>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); onTrash(note.id); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-black/5 text-left"
                  style={{ fontSize: "13px", color: "var(--danger)", fontFamily: "var(--font-body)", border: "none", background: "none", cursor: "pointer" }}>
                  <Trash2 size={12} /> Move to trash
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
      {pinned.length > 0 && (
        <>
          <p className="px-1 py-1" style={{ color: "var(--text-muted)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pinned</p>
          {pinned.map(note => <NoteCard key={note.id} note={note} />)}
          {others.length > 0 && <p className="px-1 pt-2 pb-1" style={{ color: "var(--text-muted)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Notes</p>}
        </>
      )}
      {others.map(note => <NoteCard key={note.id} note={note} />)}
    </div>
  );
}
