"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Note, Tag } from "@/types";
import { format } from "date-fns";
import {
  Pin, Trash2, Archive, MoreHorizontal, ArrowLeft,
  Tag as TagIcon, Smile, Palette, Download, RotateCcw
} from "lucide-react";
import { ExportModal } from "../export/ExportModal";
import toast from "react-hot-toast";

interface Props {
  note: Note;
  tags: Tag[];
  onUpdate: (id: string, data: Partial<Note> & { tagIds?: string[] }) => Promise<Note>;
  onTrash: () => void;
  onDelete: () => void;
  onBack: () => void;
  onTagsChange: () => void;
}

const EMOJIS = ["📝","💡","⭐","🔥","💭","🎯","📚","🌿","✨","🎨","🧠","💪","🌙","☀️","🎵","🌊"];
const COLOR_OPTIONS = [
  { id: null, label: "Default", bg: "#ffffff" },
  { id: "cream", label: "Cream", bg: "#fdf8f0" },
  { id: "sage", label: "Sage", bg: "#f0f4f0" },
  { id: "rose", label: "Rose", bg: "#fdf0f3" },
  { id: "sky", label: "Sky", bg: "#f0f4fd" },
  { id: "lavender", label: "Lavender", bg: "#f3f0fd" },
  { id: "yellow", label: "Yellow", bg: "#fdf9e3" },
];

export function NoteEditor({ note, tags, onUpdate, onTrash, onDelete, onBack, onTagsChange }: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(note.tags.map(nt => nt.tagId));
  const saveTimeout = useRef<NodeJS.Timeout>();

  const save = useCallback(async (data: Record<string, unknown>) => {
    setSaving(true);
    await onUpdate(note.id, data as Partial<Note> & { tagIds?: string[] });
    setSaving(false);
  }, [note.id, onUpdate]);

  const debouncedSave = useCallback((data: Record<string, unknown>) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(data), 800);
  }, [save]);

  useEffect(() => {
    debouncedSave({ title, content });
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [title, content]);

  const handleTagToggle = async (tagId: string) => {
    const newIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(newIds);
    await save({ tagIds: newIds });
  };

  const handleEmoji = async (emoji: string) => {
    await save({ emoji: note.emoji === emoji ? null : emoji });
    setShowEmojiPicker(false);
  };

  const handleColor = async (colorId: string | null) => {
    await save({ color: colorId });
    setShowColorPicker(false);
  };

  const handlePin = async () => {
    await save({ isPinned: !note.isPinned });
  };

  const handleArchive = async () => {
    await save({ isArchived: !note.isArchived });
    toast.success(note.isArchived ? "Unarchived" : "Archived");
  };

  const NOTE_COLORS: Record<string, string> = {
    cream: "#fdf8f0", sage: "#f0f4f0", rose: "#fdf0f3",
    sky: "#f0f4fd", lavender: "#f3f0fd", yellow: "#fdf9e3",
  };
  const editorBg = note.color ? (NOTE_COLORS[note.color] || "var(--surface)") : "var(--surface)";

  return (
    <div className="flex flex-col h-full" style={{ background: editorBg }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: editorBg }}>
        <button onClick={onBack} className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-all">
          <ArrowLeft size={16} style={{ color: "var(--text-secondary)" }} />
        </button>

        <div className="flex-1" />

        {/* Saving indicator */}
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {saving ? "Saving..." : `Saved ${format(new Date(note.updatedAt), "h:mm a")}`}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          <ToolbarBtn onClick={handlePin} title={note.isPinned ? "Unpin" : "Pin"} active={note.isPinned}>
            <Pin size={15} />
          </ToolbarBtn>

          <div className="relative">
            <ToolbarBtn onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowColorPicker(false); setShowTagPicker(false); }} title="Emoji">
              <Smile size={15} />
            </ToolbarBtn>
            {showEmojiPicker && (
              <div className="absolute right-0 top-full mt-1 p-2 rounded-xl shadow-lg z-50 grid grid-cols-8 gap-1 animate-scale"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", width: "220px" }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => handleEmoji(e)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all text-sm"
                    style={{ outline: note.emoji === e ? "2px solid var(--accent)" : "none" }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <ToolbarBtn onClick={() => { setShowColorPicker(!showColorPicker); setShowEmojiPicker(false); setShowTagPicker(false); }} title="Color">
              <Palette size={15} />
            </ToolbarBtn>
            {showColorPicker && (
              <div className="absolute right-0 top-full mt-1 p-3 rounded-xl shadow-lg z-50 animate-scale"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: "180px" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>Note color</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.id ?? "default"} onClick={() => handleColor(c.id)}
                      className="flex flex-col items-center gap-1 group">
                      <div className="w-7 h-7 rounded-full border transition-transform group-hover:scale-110"
                        style={{
                          background: c.bg,
                          border: note.color === c.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                        }} />
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <ToolbarBtn onClick={() => { setShowTagPicker(!showTagPicker); setShowEmojiPicker(false); setShowColorPicker(false); }} title="Tags">
              <TagIcon size={15} />
            </ToolbarBtn>
            {showTagPicker && (
              <div className="absolute right-0 top-full mt-1 p-2 rounded-xl shadow-lg z-50 animate-scale"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: "160px" }}>
                {tags.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "8px" }}>No tags. Create some in the sidebar.</p>
                ) : tags.map(tag => (
                  <button key={tag.id} onClick={() => handleTagToggle(tag.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-all">
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${selectedTagIds.includes(tag.id) ? "border-0" : ""}`}
                      style={{ background: selectedTagIds.includes(tag.id) ? tag.color : "transparent", borderColor: tag.color }}>
                      {selectedTagIds.includes(tag.id) && <span style={{ color: "white", fontSize: "9px" }}>✓</span>}
                    </div>
                    <span style={{ fontSize: "13px", color: "var(--text)" }}>{tag.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <ToolbarBtn onClick={() => setShowExport(true)} title="Export">
            <Download size={15} />
          </ToolbarBtn>

          <div className="relative">
            <ToolbarBtn onClick={() => setShowMenu(!showMenu)} title="More">
              <MoreHorizontal size={15} />
            </ToolbarBtn>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 py-1 animate-scale"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: "160px" }}>
                <MenuBtn onClick={handleArchive}>
                  <Archive size={14} /> {note.isArchived ? "Unarchive" : "Archive"}
                </MenuBtn>
                <MenuBtn onClick={() => { setShowMenu(false); onTrash(); }} danger>
                  <Trash2 size={14} /> Move to trash
                </MenuBtn>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 md:px-12 md:py-10">
          {/* Tags */}
          {selectedTagIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {note.tags.map(nt => (
                <span key={nt.tagId} className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: nt.tag.color + "20", color: nt.tag.color, fontSize: "11px" }}>
                  {nt.tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Emoji */}
          {note.emoji && (
            <div className="mb-3">
              <span style={{ fontSize: "40px" }}>{note.emoji}</span>
            </div>
          )}

          {/* Title */}
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            rows={1}
            className="w-full resize-none bg-transparent border-none outline-none"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              fontWeight: 500,
              color: "var(--text)",
              lineHeight: "1.3",
              marginBottom: "16px",
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }}
          />

          {/* Date */}
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px" }}>
            {format(new Date(note.updatedAt), "EEEE, MMMM d, yyyy · h:mm a")}
          </p>

          {/* Content */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Start writing..."
            className="note-editor"
          />
        </div>
      </div>

      {/* Export modal */}
      {showExport && (
        <ExportModal note={note} onClose={() => setShowExport(false)} />
      )}

      {/* Close dropdowns on outside click */}
      {(showMenu || showTagPicker || showEmojiPicker || showColorPicker) && (
        <div className="fixed inset-0 z-40" onClick={() => {
          setShowMenu(false); setShowTagPicker(false);
          setShowEmojiPicker(false); setShowColorPicker(false);
        }} />
      )}
    </div>
  );
}

function ToolbarBtn({ children, onClick, title, active }: {
  children: React.ReactNode; onClick: () => void; title?: string; active?: boolean;
}) {
  return (
    <button onClick={onClick} title={title}
      className="p-2 rounded-lg transition-all hover:bg-black/5 relative z-50"
      style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}>
      {children}
    </button>
  );
}

function MenuBtn({ children, onClick, danger }: {
  children: React.ReactNode; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all hover:bg-gray-50"
      style={{ fontSize: "13px", color: danger ? "var(--danger)" : "var(--text)", fontFamily: "var(--font-body)" }}>
      {children}
    </button>
  );
}
