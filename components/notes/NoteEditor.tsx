"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Note, Tag } from "@/types";
import { format } from "date-fns";
import {
  Pin, Trash2, Archive, MoreHorizontal, ArrowLeft,
  Tag as TagIcon, Smile, Palette, Download, Copy,
  Share2, History, Bold, Italic, Underline, List,
  ListOrdered, Quote, Code, Minus, Link,
  Image as ImageIcon, Check, X, Table, Sparkles,
  ChevronDown
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

const EMOJIS = ["📝","💡","⭐","🔥","💭","🎯","📚","🌿","✨","🎨","🧠","💪","🌙","☀️","🎵","🌊","🏔️","🎪","🦋","🌸","⚡","🔮","🌈","🍀"];
const NOTE_COLOR_MAP: Record<string, string> = {
  cream:"#fdf8f0",sage:"#f0f4f0",rose:"#fdf0f3",sky:"#f0f4fd",lavender:"#f3f0fd",yellow:"#fdf9e3",
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

const AI_ACTIONS = [
  { id: "summarize", label: "Summarize", prompt: "Summarize this note concisely in 2-3 sentences:" },
  { id: "expand", label: "Expand", prompt: "Expand and elaborate on this content with more detail:" },
  { id: "rewrite", label: "Rewrite", prompt: "Rewrite this more clearly and professionally:" },
  { id: "bullets", label: "Make bullets", prompt: "Convert this into a clear bullet-point list:" },
  { id: "continue", label: "Continue writing", prompt: "Continue writing from where this left off:" },
  { id: "fix", label: "Fix grammar", prompt: "Fix any grammar and spelling issues in this text:" },
];

export function NoteEditor({ note, tags, onUpdate, onTrash, onDelete, onBack, onTagsChange, onDuplicate }: Props) {
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(note.tags.map(nt => nt.tagId));
  const [wordCount, setWordCount] = useState(note.wordCount || 0);
  const [readingTime, setReadingTime] = useState(0);
  const [isShared] = useState(note.isShared || false);
  const [showCoverInput, setShowCoverInput] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== note.content) {
      editorRef.current.innerHTML = note.content || "";
    }
    const text = editorRef.current?.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setReadingTime(Math.ceil(words / 200));
  }, [note.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        switch (e.key) {
          case "b": if (document.activeElement === editorRef.current) { e.preventDefault(); execFormat("bold"); } break;
          case "i": if (document.activeElement === editorRef.current) { e.preventDefault(); execFormat("italic"); } break;
          case "u": if (document.activeElement === editorRef.current) { e.preventDefault(); execFormat("underline"); } break;
          case "k": e.preventDefault(); insertLink(); break;
          case "d": e.preventDefault(); onDuplicate(); break;
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

  const insertTable = () => {
    const rows = 3, cols = 3;
    let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0;">';
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        const tag = r === 0 ? "th" : "td";
        html += `<${tag} style="border:1px solid var(--border);padding:8px 12px;text-align:left;${r===0?"background:var(--surface-hover);font-weight:600;":""}"> </${tag}>`;
      }
      html += "</tr>";
    }
    html += "</table><p><br></p>";
    execFormat("insertHTML", html);
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
    saveTimeout.current = setTimeout(() => save({ title, content, wordCount: words }), 800);
  }, [title, save]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      save({ title: e.target.value, content: editorRef.current?.innerHTML || "" });
    }, 800);
  };

  const handleTagToggle = async (tagId: string) => {
    const newIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(newIds);
    await save({ tagIds: newIds });
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
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

  const handleCoverUpload = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        await save({ coverImage: ev.target?.result as string });
        toast.success("Cover image set");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAI = async (action: typeof AI_ACTIONS[0]) => {
    const content = editorRef.current?.innerText || "";
    if (!content.trim()) { toast.error("Write something first"); return; }
    setAiLoading(true);
    setAiResult("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `${action.prompt}\n\n${content}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "No response";
      setAiResult(text);
    } catch {
      toast.error("AI unavailable");
    }
    setAiLoading(false);
  };

  const applyAIResult = () => {
    if (!aiResult) return;
    if (editorRef.current) {
      editorRef.current.innerHTML += `<hr style="margin:16px 0;border-color:var(--border)"><p><em style="color:var(--text-muted);font-size:11px">AI suggestion:</em></p><p>${aiResult.replace(/\n/g, "<br>")}</p>`;
      handleContentChange();
    }
    setAiResult("");
    setShowAI(false);
    toast.success("Added to note");
  };

  const editorBg = note.color ? (NOTE_COLOR_MAP[note.color] || "var(--surface)") : "var(--surface)";

  return (
    <div className="flex flex-col h-full" style={{ background: editorBg }}>
      {/* Top toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: editorBg }}>
        <button onClick={onBack} className="md:hidden p-1.5 rounded-lg hover:bg-black/5 mr-1">
          <ArrowLeft size={14} style={{ color: "var(--text-secondary)" }} />
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {saving ? "Saving…" : `Saved ${format(new Date(note.updatedAt), "h:mm a")}`}
          </span>
          {wordCount > 0 && (
            <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              · {wordCount}w · {readingTime || 1}min
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <TBtn onClick={() => save({ isPinned: !note.isPinned })} title="Pin" active={note.isPinned}><Pin size={13} /></TBtn>

          <Dropdown trigger={<TBtn onClick={() => {}}><Smile size={13} /></TBtn>} show={showEmojiPicker} setShow={setShowEmojiPicker} others={[setShowColorPicker,setShowTagPicker,setShowMenu,setShowAI]}>
            <div className="p-2 grid grid-cols-8 gap-1" style={{ width: "220px" }}>
              <button onClick={() => { save({ emoji: null }); setShowEmojiPicker(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-xs" style={{ color: "var(--text-muted)" }}>✕</button>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { save({ emoji: e }); setShowEmojiPicker(false); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-sm"
                  style={{ outline: note.emoji === e ? "2px solid var(--text)" : "none", outlineOffset: "1px" }}>{e}</button>
              ))}
            </div>
          </Dropdown>

          <Dropdown trigger={<TBtn onClick={() => {}}><Palette size={13} /></TBtn>} show={showColorPicker} setShow={setShowColorPicker} others={[setShowEmojiPicker,setShowTagPicker,setShowMenu,setShowAI]}>
            <div className="p-3" style={{ minWidth: "200px" }}>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Note color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.id ?? "default"} onClick={() => { save({ color: c.id }); setShowColorPicker(false); }}
                    className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c.bg, borderColor: note.color === c.id ? "var(--text)" : "var(--border)" }} />
                    <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{c.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "10px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Cover image</p>
                <button onClick={handleCoverUpload}
                  className="w-full py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ background: "var(--surface-hover)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  {note.coverImage ? "Change cover" : "Add cover image"}
                </button>
                {note.coverImage && (
                  <button onClick={() => save({ coverImage: null })}
                    className="w-full py-1.5 rounded-lg text-xs mt-1 transition-all hover:opacity-80"
                    style={{ background: "transparent", color: "var(--danger)", fontFamily: "var(--font-body)" }}>
                    Remove cover
                  </button>
                )}
              </div>
            </div>
          </Dropdown>

          <Dropdown trigger={<TBtn onClick={() => {}}><TagIcon size={13} /></TBtn>} show={showTagPicker} setShow={setShowTagPicker} others={[setShowEmojiPicker,setShowColorPicker,setShowMenu,setShowAI]}>
            <div className="py-1" style={{ minWidth: "160px" }}>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", padding: "6px 12px 4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tags</p>
              {tags.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 12px" }}>Create tags in sidebar</p>
              ) : tags.map(tag => (
                <button key={tag.id} onClick={() => handleTagToggle(tag.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-all hover:bg-black/5">
                  <div className="w-3 h-3 rounded border-2 flex items-center justify-center transition-all"
                    style={{ background: selectedTagIds.includes(tag.id) ? tag.color : "transparent", borderColor: tag.color }}>
                    {selectedTagIds.includes(tag.id) && <Check size={7} style={{ color: "white" }} />}
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--text)" }}>{tag.name}</span>
                </button>
              ))}
            </div>
          </Dropdown>

          {/* AI Button */}
          <Dropdown trigger={<TBtn onClick={() => {}} title="AI assistant"><Sparkles size={13} /></TBtn>} show={showAI} setShow={setShowAI} others={[setShowEmojiPicker,setShowColorPicker,setShowTagPicker,setShowMenu]}>
            <div className="p-2" style={{ width: "200px" }}>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", padding: "4px 6px 6px", textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Assistant</p>
              {AI_ACTIONS.map(action => (
                <button key={action.id} onClick={() => handleAI(action)}
                  disabled={aiLoading}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all hover:bg-black/5 text-left"
                  style={{ fontSize: "13px", color: "var(--text)", fontFamily: "var(--font-body)" }}>
                  <Sparkles size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  {action.label}
                </button>
              ))}
              {aiLoading && (
                <div className="flex items-center gap-2 px-2 py-2">
                  <div className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--text)" }} />
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Thinking…</span>
                </div>
              )}
              {aiResult && (
                <div className="mt-2 p-2 rounded-lg" style={{ background: "var(--surface-hover)", borderTop: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "6px" }}>{aiResult.slice(0, 150)}…</p>
                  <button onClick={applyAIResult}
                    className="w-full py-1 rounded text-xs transition-all hover:opacity-80"
                    style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)" }}>
                    Add to note
                  </button>
                </div>
              )}
            </div>
          </Dropdown>

          <TBtn onClick={() => setShowExport(true)} title="Export"><Download size={13} /></TBtn>

          <Dropdown trigger={<TBtn onClick={() => {}}><MoreHorizontal size={13} /></TBtn>} show={showMenu} setShow={setShowMenu} others={[setShowEmojiPicker,setShowColorPicker,setShowTagPicker,setShowAI]}>
            <div className="py-1" style={{ minWidth: "170px" }}>
              <MItem onClick={() => { onDuplicate(); setShowMenu(false); }}><Copy size={12} /> Duplicate (⌘D)</MItem>
              <MItem onClick={() => { save({ isArchived: !note.isArchived }); setShowMenu(false); toast.success(note.isArchived ? "Unarchived" : "Archived"); }}>
                <Archive size={12} /> {note.isArchived ? "Unarchive" : "Archive"}
              </MItem>
              <div style={{ height: "1px", background: "var(--border)", margin: "3px 0" }} />
              <MItem onClick={() => { setShowMenu(false); onTrash(); }} danger><Trash2 size={12} /> Move to trash</MItem>
            </div>
          </Dropdown>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="format-toolbar flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <FBtn cmd="bold" icon={<Bold size={12} />} title="Bold (⌘B)" />
        <FBtn cmd="italic" icon={<Italic size={12} />} title="Italic (⌘I)" />
        <FBtn cmd="underline" icon={<Underline size={12} />} title="Underline (⌘U)" />
        <FBtn cmd="strikeThrough" icon={<span style={{ textDecoration: "line-through", fontSize: "11px", fontWeight: 600 }}>S</span>} title="Strikethrough" />
        <div className="format-divider" />
        <button className="format-btn" onClick={() => execFormat("formatBlock", "h1")} title="H1"><span style={{ fontWeight: 700, fontSize: "11px" }}>H1</span></button>
        <button className="format-btn" onClick={() => execFormat("formatBlock", "h2")} title="H2"><span style={{ fontWeight: 700, fontSize: "10px" }}>H2</span></button>
        <button className="format-btn" onClick={() => execFormat("formatBlock", "h3")} title="H3"><span style={{ fontWeight: 700, fontSize: "9px" }}>H3</span></button>
        <div className="format-divider" />
        <FBtn cmd="insertUnorderedList" icon={<List size={12} />} title="Bullet list" />
        <FBtn cmd="insertOrderedList" icon={<ListOrdered size={12} />} title="Numbered list" />
        <button className="format-btn" onClick={() => execFormat("formatBlock", "blockquote")} title="Blockquote"><Quote size={12} /></button>
        <div className="format-divider" />
        <button className="format-btn" onClick={() => { const sel = window.getSelection()?.toString(); if (sel) execFormat("insertHTML", `<code>${sel}</code>`); }} title="Code"><Code size={12} /></button>
        <button className="format-btn" onClick={insertLink} title="Link (⌘K)"><Link size={12} /></button>
        <button className="format-btn" onClick={handleImageUpload} title="Image"><ImageIcon size={12} /></button>
        <button className="format-btn" onClick={insertTable} title="Table"><Table size={12} /></button>
        <button className="format-btn" onClick={() => execFormat("insertHorizontalRule")} title="Divider"><Minus size={12} /></button>
        <button className="format-btn" onClick={() => execFormat("removeFormat")} style={{ marginLeft: "auto", fontSize: "10px" }} title="Clear formatting">Clear</button>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        {/* Cover image */}
        {note.coverImage && (
          <div style={{ width: "100%", height: "200px", overflow: "hidden", position: "relative" }}>
            <img src={note.coverImage} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, var(--surface) 100%)" }} />
          </div>
        )}

        <div className="max-w-2xl mx-auto px-6 py-6 md:px-10">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {note.tags.map(nt => (
                <span key={nt.tagId} className="px-2 py-0.5 rounded-full"
                  style={{ background: nt.tag.color + "20", color: nt.tag.color, fontSize: "11px" }}>
                  {nt.tag.name}
                </span>
              ))}
            </div>
          )}

          {note.emoji && <div className="mb-3"><span style={{ fontSize: "40px" }}>{note.emoji}</span></div>}

          <textarea
            value={title}
            onChange={handleTitleChange}
            placeholder="Title"
            rows={1}
            className="w-full resize-none bg-transparent border-none outline-none"
            style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 500, color: "var(--text)", lineHeight: "1.25", marginBottom: "6px" }}
            onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
          />

          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "20px" }}>
            {format(new Date(note.updatedAt), "EEEE, MMMM d, yyyy · h:mm a")}
          </p>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="rich-editor"
            data-placeholder="Start writing…"
            onInput={handleContentChange}
            onPaste={e => { e.preventDefault(); const text = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain"); document.execCommand("insertHTML", false, text); }}
          />
        </div>
      </div>

      {showExport && <ExportModal note={note} onClose={() => setShowExport(false)} />}

      {showShareModal && (
        <Modal title="Share Note" onClose={() => setShowShareModal(false)}>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", padding: "8px 0" }}>Sharing coming soon in next update.</p>
        </Modal>
      )}

      {(showMenu || showTagPicker || showEmojiPicker || showColorPicker || showAI) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setShowTagPicker(false); setShowEmojiPicker(false); setShowColorPicker(false); setShowAI(false); }} />
      )}
    </div>
  );
}

function TBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-lg transition-all hover:bg-black/5 relative z-50"
      style={{ color: active ? "var(--text)" : "var(--text-muted)", background: active ? "var(--accent-light)" : "transparent" }}>
      {children}
    </button>
  );
}

function FBtn({ cmd, icon, title }: { cmd: string; icon: React.ReactNode; title?: string }) {
  return (
    <button className="format-btn" title={title} onMouseDown={e => { e.preventDefault(); document.execCommand(cmd, false); }}>
      {icon}
    </button>
  );
}

function MItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all hover:bg-black/5"
      style={{ fontSize: "13px", color: danger ? "var(--danger)" : "var(--text)", fontFamily: "var(--font-body)" }}>
      {children}
    </button>
  );
}

function Dropdown({ trigger, show, setShow, others, children }: {
  trigger: React.ReactNode; show: boolean; setShow: (v: boolean) => void;
  others: Array<(v: boolean) => void>; children: React.ReactNode;
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--text)" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 transition-all">
            <X size={14} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
