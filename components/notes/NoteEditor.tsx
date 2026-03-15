"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Note, Tag, NoteVersion } from "@/types";
import { format } from "date-fns";
import {
  Pin, Trash2, Archive, MoreHorizontal, ArrowLeft,
  Tag as TagIcon, Smile, Palette, Download, Copy,
  Share2, History, Bold, Italic, Underline, List,
  ListOrdered, Heading1, Heading2, Quote, Code, Minus,
  Link, Image as ImageIcon, AlignLeft, Type, Check, X,
  RotateCcw, ChevronDown, Eye, EyeOff
} from "lucide-react";
import { ExportModal } from "../export/ExportModal";
import toast from "react-hot-toast";

interface Props {
  note: Note;
  tags: Tag[];
  onUpdate: (id: string, data: any) => Promise<Note>;
  onTrash: () => void;
  onDelete: () => void;
  onBack: () => void;
  onTagsChange: () => void;
  onDuplicate: () => void;
}

const EMOJIS = ["📝","💡","⭐","🔥","💭","🎯","📚","🌿","✨","🎨","🧠","💪","🌙","☀️","🎵","🌊","🏔️","🎪","🦋","🌸","⚡","🎯","🔮","🌈"];
const NOTE_COLOR_MAP: Record<string, string> = {
  cream: "#fdf8f0", sage: "#f0f4f0", rose: "#fdf0f3",
  sky: "#f0f4fd", lavender: "#f3f0fd", yellow: "#fdf9e3",
};
const COLOR_OPTIONS = [
  { id: null, label: "Default", bg: "var(--surface)" },
  { id: "cream", label: "Cream", bg: "#fdf8f0" },
  { id: "sage", label: "Sage", bg: "#f0f4f0" },
  { id: "rose", label: "Rose", bg: "#fdf0f3" },
  { id: "sky", label: "Sky", bg: "#f0f4fd" },
  { id: "lavender", label: "Lavender", bg: "#f3f0fd" },
  { id: "yellow", label: "Yellow", bg: "#fdf9e3" },
];

export function NoteEditor({ note, tags, onUpdate, onTrash, onDelete, onBack, onTagsChange, onDuplicate }: Props) {
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(note.tags.map(nt => nt.tagId));
  const [wordCount, setWordCount] = useState(note.wordCount || 0);
  const [readingTime, setReadingTime] = useState(0);
  const [isShared, setIsShared] = useState(note.isShared);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<NodeJS.Timeout>();
  const versionTimeout = useRef<NodeJS.Timeout>();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== note.content) {
      editorRef.current.innerHTML = note.content || "";
    }
  }, [note.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        switch (e.key) {
          case "b": e.preventDefault(); execFormat("bold"); break;
          case "i": e.preventDefault(); execFormat("italic"); break;
          case "u": e.preventDefault(); execFormat("underline"); break;
          case "k": e.preventDefault(); insertLink(); break;
          case "d": e.preventDefault(); onDuplicate(); break;
          case "p": e.preventDefault(); save({ isPinned: !note.isPinned }); break;
        }
        if (e.shiftKey) {
          switch (e.key) {
            case "7": e.preventDefault(); execFormat("insertOrderedList"); break;
            case "8": e.preventDefault(); execFormat("insertUnorderedList"); break;
          }
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [note.isPinned]);

  const execFormat = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) execFormat("createLink", url);
  };

  const save = useCallback(async (data: Record<string, unknown>) => {
    setSaving(true);
    await onUpdate(note.id, data);
    setSaving(false);
  }, [note.id, onUpdate]);

  const handleContentChange = useCallback(() => {
    const content = editorRef.current?.innerHTML || "";
    const text = editorRef.current?.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setReadingTime(Math.ceil(words / 200));

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save({ title, content }), 800);

    if (versionTimeout.current) clearTimeout(versionTimeout.current);
    versionTimeout.current = setTimeout(() => save({ title, content, saveVersion: true }), 30000);
  }, [title, save]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const content = editorRef.current?.innerHTML || "";
      save({ title: e.target.value, content });
    }, 800);
  };

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

  const handleShare = async (share: boolean) => {
    setIsShared(share);
    await fetch(`/api/notes/${note.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isShared: share }),
    });
    if (share) toast.success("Note is now public");
    else toast.success("Sharing disabled");
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/shared/${note.shareId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const restoreVersion = async (version: NoteVersion) => {
    if (editorRef.current) editorRef.current.innerHTML = version.content;
    setTitle(version.title);
    await save({ title: version.title, content: version.content });
    setShowHistory(false);
    toast.success("Version restored");
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        execFormat("insertHTML", `<img src="${ev.target?.result}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const editorBg = note.color ? (NOTE_COLOR_MAP[note.color] || "var(--surface)") : "var(--surface)";

  return (
    <div className="flex flex-col h-full" style={{ background: editorBg }}>
      {/* Top toolbar */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: editorBg }}>
        <button onClick={onBack} className="md:hidden p-1.5 rounded-lg hover:bg-black/5 mr-1">
          <ArrowLeft size={15} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {saving ? "Saving…" : `Saved ${format(new Date(note.updatedAt), "h:mm a")}`}
          </span>
          {wordCount > 0 && (
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              · {wordCount} words · {readingTime || 1} min read
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <TBtn onClick={() => save({ isPinned: !note.isPinned })} title={note.isPinned ? "Unpin (⌘P)" : "Pin (⌘P)"} active={note.isPinned}>
            <Pin size={14} />
          </TBtn>

          <Dropdown
            trigger={<TBtn onClick={() => {}}><Smile size={14} /></TBtn>}
            show={showEmojiPicker}
            setShow={setShowEmojiPicker}
            others={[setShowColorPicker, setShowTagPicker, setShowMenu]}>
            <div className="p-2 grid grid-cols-8 gap-1" style={{ width: "224px" }}>
              <button onClick={() => handleEmoji("")}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all hover:bg-gray-100"
                style={{ color: "var(--text-muted)" }}>✕</button>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => handleEmoji(e)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all text-sm"
                  style={{ outline: note.emoji === e ? "2px solid var(--accent)" : "none", outlineOffset: "1px" }}>
                  {e}
                </button>
              ))}
            </div>
          </Dropdown>

          <Dropdown
            trigger={<TBtn onClick={() => {}}><Palette size={14} /></TBtn>}
            show={showColorPicker}
            setShow={setShowColorPicker}
            others={[setShowEmojiPicker, setShowTagPicker, setShowMenu]}>
            <div className="p-3" style={{ minWidth: "200px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Note color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.id ?? "default"} onClick={() => handleColor(c.id)}
                    className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        background: c.bg,
                        borderColor: note.color === c.id ? "var(--text)" : "var(--border)",
                      }} />
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Dropdown>

          <Dropdown
            trigger={<TBtn onClick={() => {}}><TagIcon size={14} /></TBtn>}
            show={showTagPicker}
            setShow={setShowTagPicker}
            others={[setShowEmojiPicker, setShowColorPicker, setShowMenu]}>
            <div className="py-1" style={{ minWidth: "160px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", padding: "6px 12px 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tags</p>
              {tags.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 12px" }}>Create tags in the sidebar</p>
              ) : tags.map(tag => (
                <button key={tag.id} onClick={() => handleTagToggle(tag.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 transition-all hover:bg-gray-50">
                  <div className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all"
                    style={{
                      background: selectedTagIds.includes(tag.id) ? tag.color : "transparent",
                      borderColor: tag.color,
                    }}>
                    {selectedTagIds.includes(tag.id) && <Check size={8} style={{ color: "white" }} />}
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--text)" }}>{tag.name}</span>
                </button>
              ))}
            </div>
          </Dropdown>

          <TBtn onClick={() => setShowHistory(true)} title="Version history">
            <History size={14} />
          </TBtn>

          <TBtn onClick={() => setShowShareModal(true)} title="Share" active={isShared}>
            <Share2 size={14} />
          </TBtn>

          <TBtn onClick={() => setShowExport(true)} title="Export">
            <Download size={14} />
          </TBtn>

          <Dropdown
            trigger={<TBtn onClick={() => {}}><MoreHorizontal size={14} /></TBtn>}
            show={showMenu}
            setShow={setShowMenu}
            others={[setShowEmojiPicker, setShowColorPicker, setShowTagPicker]}>
            <div className="py-1" style={{ minWidth: "170px" }}>
              <MItem onClick={() => { onDuplicate(); setShowMenu(false); }}><Copy size={13} /> Duplicate (⌘D)</MItem>
              <MItem onClick={() => { save({ isArchived: !note.isArchived }); setShowMenu(false); toast.success(note.isArchived ? "Unarchived" : "Archived"); }}>
                <Archive size={13} /> {note.isArchived ? "Unarchive" : "Archive"}
              </MItem>
              <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
              <MItem onClick={() => { setShowMenu(false); onTrash(); }} danger><Trash2 size={13} /> Move to trash</MItem>
            </div>
          </Dropdown>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="format-toolbar flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <FBtn cmd="bold" icon={<Bold size={13} />} title="Bold (⌘B)" />
        <FBtn cmd="italic" icon={<Italic size={13} />} title="Italic (⌘I)" />
        <FBtn cmd="underline" icon={<Underline size={13} />} title="Underline (⌘U)" />
        <FBtn cmd="strikeThrough" icon={<span style={{ textDecoration: "line-through", fontSize: "12px", fontWeight: 600 }}>S</span>} title="Strikethrough" />
        <div className="format-divider" />
        <button className="format-btn" title="Heading 1" onClick={() => execFormat("formatBlock", "h1")}><span style={{ fontWeight: 700, fontSize: "12px" }}>H1</span></button>
        <button className="format-btn" title="Heading 2" onClick={() => execFormat("formatBlock", "h2")}><span style={{ fontWeight: 700, fontSize: "11px" }}>H2</span></button>
        <button className="format-btn" title="Heading 3" onClick={() => execFormat("formatBlock", "h3")}><span style={{ fontWeight: 700, fontSize: "10px" }}>H3</span></button>
        <div className="format-divider" />
        <FBtn cmd="insertUnorderedList" icon={<List size={13} />} title="Bullet list (⌘⇧8)" />
        <FBtn cmd="insertOrderedList" icon={<ListOrdered size={13} />} title="Numbered list (⌘⇧7)" />
        <button className="format-btn" title="Blockquote" onClick={() => execFormat("formatBlock", "blockquote")}><Quote size={13} /></button>
        <div className="format-divider" />
        <button className="format-btn" title="Inline code" onClick={() => {
          const sel = window.getSelection()?.toString();
          if (sel) execFormat("insertHTML", `<code>${sel}</code>`);
        }}><Code size={13} /></button>
        <button className="format-btn" title="Insert link (⌘K)" onClick={insertLink}><Link size={13} /></button>
        <button className="format-btn" title="Insert image" onClick={handleImageUpload}><ImageIcon size={13} /></button>
        <div className="format-divider" />
        <button className="format-btn" title="Horizontal rule" onClick={() => execFormat("insertHorizontalRule")}><Minus size={13} /></button>
        <button className="format-btn" title="Remove formatting" onClick={() => execFormat("removeFormat")} style={{ marginLeft: "auto" }}>
          <span style={{ fontSize: "11px" }}>Clear</span>
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 md:px-10">
          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {note.tags.map(nt => (
                <span key={nt.tagId} className="px-2 py-0.5 rounded-full"
                  style={{ background: nt.tag.color + "20", color: nt.tag.color, fontSize: "11px" }}>
                  {nt.tag.name}
                </span>
              ))}
            </div>
          )}

          {note.emoji && <div className="mb-3"><span style={{ fontSize: "44px" }}>{note.emoji}</span></div>}

          <textarea
            ref={titleRef}
            value={title}
            onChange={handleTitleChange}
            placeholder="Title"
            rows={1}
            className="w-full resize-none bg-transparent border-none outline-none"
            style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 500, color: "var(--text)", lineHeight: "1.25", marginBottom: "8px" }}
            onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
          />

          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "24px" }}>
            {format(new Date(note.updatedAt), "EEEE, MMMM d, yyyy · h:mm a")}
          </p>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="rich-editor"
            data-placeholder="Start writing… (use toolbar or ⌘B, ⌘I, ⌘U)"
            onInput={handleContentChange}
            onPaste={e => { e.preventDefault(); const text = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain"); document.execCommand("insertHTML", false, text); }}
          />
        </div>
      </div>

      {/* Modals */}
      {showExport && <ExportModal note={note} onClose={() => setShowExport(false)} />}

      {showHistory && (
        <Modal title="Version History" onClose={() => setShowHistory(false)}>
          {!note.versions?.length ? (
            <p style={{ color: "var(--text-muted)", fontSize: "14px", padding: "16px 0" }}>No versions saved yet. Versions are saved every 30 seconds while editing.</p>
          ) : note.versions.map(v => (
            <div key={v.id} className="flex items-center gap-3 py-3 border-b"
              style={{ borderColor: "var(--border-light)" }}>
              <div className="flex-1">
                <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>{v.title || "Untitled"}</p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{format(new Date(v.createdAt), "MMM d, yyyy · h:mm a")}</p>
              </div>
              <button onClick={() => restoreVersion(v)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)" }}>
                Restore
              </button>
            </div>
          ))}
        </Modal>
      )}

      {showShareModal && (
        <Modal title="Share Note" onClose={() => setShowShareModal(false)}>
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--surface-hover)" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>Public link</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Anyone with the link can view</p>
              </div>
              <button onClick={() => handleShare(!isShared)}
                className="relative w-11 h-6 rounded-full transition-all"
                style={{ background: isShared ? "var(--text)" : "var(--border)" }}>
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: isShared ? "calc(100% - 20px)" : "4px" }} />
              </button>
            </div>
            {isShared && (
              <div className="flex gap-2 animate-fade">
                <input readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/shared/${note.shareId}`}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", outline: "none" }}
                />
                <button onClick={copyShareLink}
                  className="px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
                  style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)" }}>
                  Copy
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {(showMenu || showTagPicker || showEmojiPicker || showColorPicker) && (
        <div className="fixed inset-0 z-40" onClick={() => {
          setShowMenu(false); setShowTagPicker(false);
          setShowEmojiPicker(false); setShowColorPicker(false);
        }} />
      )}
    </div>
  );
}

// Toolbar button
function TBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-lg transition-all hover:bg-black/5 relative z-50"
      style={{ color: active ? "var(--text)" : "var(--text-muted)", background: active ? "var(--accent-light)" : "transparent" }}>
      {children}
    </button>
  );
}

// Format button that tracks active state
function FBtn({ cmd, icon, title }: { cmd: string; icon: React.ReactNode; title?: string }) {
  return (
    <button className="format-btn" title={title}
      onMouseDown={e => { e.preventDefault(); document.execCommand(cmd, false); }}>
      {icon}
    </button>
  );
}

// Menu item
function MItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
      style={{ fontSize: "13px", color: danger ? "var(--danger)" : "var(--text)", fontFamily: "var(--font-body)" }}>
      {children}
    </button>
  );
}

// Dropdown wrapper
function Dropdown({ trigger, show, setShow, others, children }: {
  trigger: React.ReactNode; show: boolean;
  setShow: (v: boolean) => void; others: Array<(v: boolean) => void>;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div onClick={() => { setShow(!show); others.forEach(f => f(false)); }}>{trigger}</div>
      {show && (
        <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 animate-scale overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Modal wrapper
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--text)" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
            <X size={15} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-96 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
