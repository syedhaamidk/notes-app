"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Note, Tag } from "@/types";
import { format } from "date-fns";
import {
  Pin, Trash2, Archive, MoreHorizontal, ArrowLeft,
  Tag as TagIcon, Smile, Palette, Download, Copy,
  Share2, Bold, Italic, Underline, List,
  ListOrdered, Quote, Code, Minus, Link,
  Image as ImageIcon, Check, X, Table, Sparkles, Mic
} from "lucide-react";
import { ExportModal } from "../export/ExportModal";
import { VoiceRecorder } from "./VoiceRecorder";
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
  cream:"#fdf8f0", sage:"#f0f4f0", rose:"#fdf0f3", sky:"#f0f4fd", lavender:"#f3f0fd", yellow:"#fdf9e3",
};
const COLOR_OPTIONS = [
  { id: null,        label: "Default",  bg: "var(--surface)" },
  { id: "cream",     label: "Cream",    bg: "#fdf8f0" },
  { id: "sage",      label: "Sage",     bg: "#f0f4f0" },
  { id: "rose",      label: "Rose",     bg: "#fdf0f3" },
  { id: "sky",       label: "Sky",      bg: "#f0f4fd" },
  { id: "lavender",  label: "Lavender", bg: "#f3f0fd" },
  { id: "yellow",    label: "Yellow",   bg: "#fdf9e3" },
];
const AI_ACTIONS = [
  { id: "summarize", label: "Summarize" },
  { id: "expand",    label: "Expand" },
  { id: "rewrite",   label: "Rewrite" },
  { id: "bullets",   label: "Make bullets" },
  { id: "continue",  label: "Continue writing" },
  { id: "fix",       label: "Fix grammar" },
];

export function NoteEditor({ note, tags, onUpdate, onTrash, onDelete, onBack, onTagsChange, onDuplicate }: Props) {
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiAction, setAiAction] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(note.tags.map(nt => nt.tagId));
  const [wordCount, setWordCount] = useState(note.wordCount || 0);
  const [readingTime, setReadingTime] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = note.content || "";
    const text = editorRef.current?.innerText || "";
    const w = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(w); setReadingTime(Math.ceil(w / 200));
  }, [note.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "d") { e.preventDefault(); onDuplicate(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const execFormat = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    handleContentChange();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) { editorRef.current?.focus(); execFormat("createLink", url); }
  };

  const insertTable = () => {
    let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0;">';
    for (let r = 0; r < 3; r++) {
      html += "<tr>";
      for (let c = 0; c < 3; c++) {
        const tag = r === 0 ? "th" : "td";
        html += `<${tag} style="border:1px solid var(--border);padding:8px 12px;${r===0?"background:var(--surface-hover);font-weight:600;":""}"> </${tag}>`;
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
    const w = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(w); setReadingTime(Math.ceil(w / 200));
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save({ title, content, wordCount: w }), 800);
  }, [title, save]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save({ title: e.target.value, content: editorRef.current?.innerHTML || "" }), 800);
  };

  const handleTagToggle = async (tagId: string) => {
    const newIds = selectedTagIds.includes(tagId) ? selectedTagIds.filter(id => id !== tagId) : [...selectedTagIds, tagId];
    setSelectedTagIds(newIds);
    await save({ tagIds: newIds });
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => execFormat("insertHTML", `<img src="${ev.target?.result}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleCoverUpload = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => { await save({ coverImage: ev.target?.result as string }); toast.success("Cover set"); };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAI = async (action: string) => {
    const content = editorRef.current?.innerText || "";
    if (!content.trim()) { toast.error("Write something first"); return; }
    setAiLoading(true); setAiAction(action); setAiResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content }),
      });
      const data = await res.json();
      if (data.result) setAiResult(data.result);
      else toast.error(data.error || "AI failed");
    } catch { toast.error("AI unavailable"); }
    setAiLoading(false);
  };

  const applyAIResult = () => {
    if (!editorRef.current || !aiResult) return;
    editorRef.current.innerHTML += `<hr style="margin:16px 0;border-color:var(--border)"><p><em style="color:var(--text-muted);font-size:11px">✦ AI ${aiAction}:</em></p><p>${aiResult.replace(/\n/g, "<br>")}</p>`;
    handleContentChange();
    setAiResult(""); setShowAI(false);
    toast.success("Added to note");
  };

  const handleVoiceInsert = (text: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const p = document.createElement("p");
    p.textContent = text;
    editorRef.current.appendChild(p);
    handleContentChange();
    toast.success("Voice added to note");
  };

  const closeAll = () => { setShowMenu(false); setShowTagPicker(false); setShowEmojiPicker(false); setShowColorPicker(false); setShowAI(false); };
  const editorBg = note.color ? (NOTE_COLOR_MAP[note.color] || "var(--surface)") : "var(--surface)";

  return (
    <div className="flex flex-col h-full" style={{ background: editorBg }}>
      {/* Top toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: editorBg }}>
        <button onClick={onBack} className="md:hidden p-1.5 rounded-lg hover:bg-black/5 mr-1">
          <ArrowLeft size={14} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {saving ? "Saving…" : `Saved ${format(new Date(note.updatedAt), "h:mm a")}`}
          </span>
          {wordCount > 0 && (
            <span className="hidden md:inline" style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              · {wordCount}w · {readingTime || 1}min
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <TBtn onClick={() => save({ isPinned: !note.isPinned })} active={note.isPinned} title="Pin"><Pin size={13} /></TBtn>

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
            <div className="p-3" style={{ minWidth: "210px" }}>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Note color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.id ?? "default"} onClick={() => { save({ color: c.id }); setShowColorPicker(false); }} className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110" style={{ background: c.bg, borderColor: note.color === c.id ? "var(--text)" : "var(--border)" }} />
                    <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{c.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                <button onClick={handleCoverUpload} className="w-full py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ background: "var(--surface-hover)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  {note.coverImage ? "Change cover" : "+ Add cover image"}
                </button>
                {note.coverImage && (
                  <button onClick={() => save({ coverImage: null })} className="w-full py-1.5 rounded-lg text-xs mt-1"
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
              {tags.length === 0 ? <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 12px" }}>Create tags in sidebar</p>
                : tags.map(tag => (
                  <button key={tag.id} onClick={() => handleTagToggle(tag.id)} className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-all hover:bg-black/5">
                    <div className="w-3 h-3 rounded border-2 flex items-center justify-center" style={{ background: selectedTagIds.includes(tag.id) ? tag.color : "transparent", borderColor: tag.color }}>
                      {selectedTagIds.includes(tag.id) && <Check size={7} style={{ color: "white" }} />}
                    </div>
                    <span style={{ fontSize: "13px", color: "var(--text)" }}>{tag.name}</span>
                  </button>
                ))}
            </div>
          </Dropdown>

          <TBtn onClick={() => setShowVoice(true)} title="Voice to text"><Mic size={13} /></TBtn>

          {/* AI Panel toggle */}
          <TBtn onClick={() => { setShowAI(!showAI); setShowMenu(false); setShowTagPicker(false); setShowEmojiPicker(false); setShowColorPicker(false); }} active={showAI} title="AI assistant">
            <Sparkles size={13} />
          </TBtn>

          <TBtn onClick={() => setShowExport(true)} title="Export"><Download size={13} /></TBtn>

          <Dropdown trigger={<TBtn onClick={() => {}}><MoreHorizontal size={13} /></TBtn>} show={showMenu} setShow={setShowMenu} others={[setShowEmojiPicker,setShowColorPicker,setShowTagPicker,setShowAI]}>
            <div className="py-1" style={{ minWidth: "170px" }}>
              <MItem onClick={() => { onDuplicate(); setShowMenu(false); }}><Copy size={12} /> Duplicate</MItem>
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
        <FBtn cmd="bold"          icon={<Bold size={12} />}          title="Bold (⌘B)" />
        <FBtn cmd="italic"        icon={<Italic size={12} />}        title="Italic (⌘I)" />
        <FBtn cmd="underline"     icon={<Underline size={12} />}     title="Underline (⌘U)" />
        <FBtn cmd="strikeThrough" icon={<span style={{ textDecoration: "line-through", fontSize: "11px", fontWeight: 600 }}>S</span>} title="Strikethrough" />
        <div className="format-divider" />
        <button className="format-btn" onClick={() => execFormat("formatBlock", "h1")}><span style={{ fontWeight: 700, fontSize: "11px" }}>H1</span></button>
        <button className="format-btn" onClick={() => execFormat("formatBlock", "h2")}><span style={{ fontWeight: 700, fontSize: "10px" }}>H2</span></button>
        <button className="format-btn" onClick={() => execFormat("formatBlock", "h3")}><span style={{ fontWeight: 700, fontSize: "9px" }}>H3</span></button>
        <div className="format-divider" />
        <FBtn cmd="insertUnorderedList" icon={<List size={12} />}        title="Bullet list" />
        <FBtn cmd="insertOrderedList"   icon={<ListOrdered size={12} />} title="Numbered list" />
        <button className="format-btn" onClick={() => execFormat("formatBlock", "blockquote")}><Quote size={12} /></button>
        <div className="format-divider" />
        <button className="format-btn" onClick={() => { const s = window.getSelection()?.toString(); if (s) execFormat("insertHTML", `<code>${s}</code>`); }} title="Code"><Code size={12} /></button>
        <button className="format-btn" onClick={insertLink}        title="Link"><Link size={12} /></button>
        <button className="format-btn" onClick={handleImageUpload} title="Image"><ImageIcon size={12} /></button>
        <button className="format-btn" onClick={insertTable}       title="Table"><Table size={12} /></button>
        <button className="format-btn" onClick={() => execFormat("insertHorizontalRule")} title="Divider"><Minus size={12} /></button>
        <button className="format-btn" onClick={() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = "";
            handleContentChange();
          }
        }} style={{ marginLeft: "auto", fontSize: "10px", color: "var(--text-muted)" }} title="Clear all content">Clear</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main editor area */}
        <div className="flex-1 overflow-y-auto">
          {note.coverImage && (
            <div style={{ width: "100%", height: "180px", overflow: "hidden", position: "relative" }}>
              <img src={note.coverImage} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, var(--surface))" }} />
            </div>
          )}
          <div className="max-w-2xl mx-auto px-6 py-6 md:px-10">
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {note.tags.map(nt => (
                  <span key={nt.tagId} className="px-2 py-0.5 rounded-full" style={{ background: nt.tag.color + "20", color: nt.tag.color, fontSize: "11px" }}>
                    {nt.tag.name}
                  </span>
                ))}
              </div>
            )}
            {note.emoji && <div className="mb-3"><span style={{ fontSize: "40px" }}>{note.emoji}</span></div>}
            <textarea value={title} onChange={handleTitleChange} placeholder="Title" rows={1}
              className="w-full resize-none bg-transparent border-none outline-none"
              style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 500, color: "var(--text)", lineHeight: "1.25", marginBottom: "6px" }}
              onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
            />
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "20px" }}>
              {format(new Date(note.updatedAt), "EEEE, MMMM d, yyyy · h:mm a")}
            </p>
            <div ref={editorRef} contentEditable suppressContentEditableWarning className="rich-editor"
              data-placeholder="Start writing…"
              onInput={handleContentChange}
              onPaste={e => { e.preventDefault(); const text = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain"); document.execCommand("insertHTML", false, text); }}
            />
          </div>
        </div>

        {/* AI sidebar — desktop only */}
        {showAI && (
          <div className="hidden md:flex flex-shrink-0 border-l overflow-y-auto animate-slide flex-col"
            style={{ width: "200px", borderColor: "var(--border)", background: "var(--surface)" }}>
            <AIPanel actions={AI_ACTIONS} aiLoading={aiLoading} aiAction={aiAction}
              aiResult={aiResult} onAction={handleAI} onApply={applyAIResult} onClose={() => setShowAI(false)} />
          </div>
        )}
      </div>

      {/* AI bottom sheet — mobile */}
      {showAI && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setShowAI(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden animate-up"
            style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", maxHeight: "65vh", paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "var(--border)" }} />
            </div>
            <AIPanel actions={AI_ACTIONS} aiLoading={aiLoading} aiAction={aiAction}
              aiResult={aiResult} onAction={handleAI} onApply={applyAIResult} onClose={() => setShowAI(false)} />
          </div>
        </div>
      )}

      {showExport && <ExportModal note={note} onClose={() => setShowExport(false)} />}
      {showVoice && <VoiceRecorder onTranscript={handleVoiceInsert} onClose={() => setShowVoice(false)} />}

      {(showMenu || showTagPicker || showEmojiPicker || showColorPicker) && (
        <div className="fixed inset-0 z-40" onClick={closeAll} />
      )}
    </div>
  );
}

function TBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 rounded-lg transition-all hover:bg-black/5 relative z-50"
      style={{ color: active ? "var(--text)" : "var(--text-muted)", background: active ? "var(--accent-light)" : "transparent" }}>
      {children}
    </button>
  );
}

function FBtn({ cmd, icon, title }: { cmd: string; icon: React.ReactNode; title?: string }) {
  return <button className="format-btn" title={title} onMouseDown={e => { e.preventDefault(); document.execCommand(cmd, false); }}>{icon}</button>;
}

function MItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all hover:bg-black/5"
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

function AIPanel({ actions, aiLoading, aiAction, aiResult, onAction, onApply, onClose }: {
  actions: { id: string; label: string }[];
  aiLoading: boolean; aiAction: string; aiResult: string;
  onAction: (id: string) => void; onApply: () => void; onClose: () => void;
}) {
  return (
    <div className="p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Assistant</p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5">
          <X size={13} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>
      <div className="space-y-1">
        {actions.map(action => (
          <button key={action.id} onClick={() => onAction(action.id)} disabled={aiLoading}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all hover:bg-black/5 text-left"
            style={{ fontSize: "14px", color: aiLoading && aiAction === action.id ? "var(--text-muted)" : "var(--text)", fontFamily: "var(--font-body)" }}>
            {aiLoading && aiAction === action.id
              ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: "var(--border)", borderTopColor: "var(--text)" }} />
              : <Sparkles size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
            {action.label}
          </button>
        ))}
      </div>
      {aiResult && (
        <div className="mt-3 animate-fade">
          <div className="p-3 rounded-xl" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "10px" }}>
              {aiResult.slice(0, 300)}{aiResult.length > 300 ? "…" : ""}
            </p>
            <button onClick={onApply} className="w-full py-2 rounded-lg text-sm transition-all hover:opacity-80"
              style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)" }}>
              Add to note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
