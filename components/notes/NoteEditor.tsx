"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Note, Tag } from "@/types";
import { format } from "date-fns";
import {
  Pin, Trash2, Archive, MoreHorizontal, ArrowLeft,
  Tag as TagIcon, Smile, Palette, Download, Copy,
  Bold, Italic, Underline, List, ListOrdered,
  Quote, Code, Minus, Link, Image as ImageIcon,
  Check, X, Table, Sparkles, Mic, RotateCcw
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
const NOTE_COLOR_MAP: Record<string,string> = { cream:"#fdf8f0",sage:"#f0f4f0",rose:"#fdf0f3",sky:"#f0f4fd",lavender:"#f3f0fd",yellow:"#fdf9e3" };
const COLOR_OPTIONS = [
  { id: null, label:"Default", bg:"var(--surface)" },
  { id:"cream", label:"Cream", bg:"#fdf8f0" },
  { id:"sage", label:"Sage", bg:"#f0f4f0" },
  { id:"rose", label:"Rose", bg:"#fdf0f3" },
  { id:"sky", label:"Sky", bg:"#f0f4fd" },
  { id:"lavender", label:"Lavender", bg:"#f3f0fd" },
  { id:"yellow", label:"Yellow", bg:"#fdf9e3" },
];
const AI_ACTIONS = [
  { id:"summarize", label:"Summarize" },
  { id:"expand", label:"Expand" },
  { id:"rewrite", label:"Rewrite" },
  { id:"bullets", label:"Make bullets" },
  { id:"continue", label:"Continue writing" },
  { id:"fix", label:"Fix grammar" },
];

export function NoteEditor({ note, tags, onUpdate, onTrash, onDelete, onBack, onTagsChange, onDuplicate }: Props) {
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [openMenu, setOpenMenu] = useState<string|null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(note.tags.map(nt => nt.tagId));
  const [wordCount, setWordCount] = useState(note.wordCount || 0);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<NodeJS.Timeout>();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Init editor content
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = note.content || "";
    updateWordCount();
  }, [note.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); onDuplicate(); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const updateWordCount = () => {
    const text = editorRef.current?.innerText || "";
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  };

  const save = useCallback(async (data: Record<string,unknown>) => {
    setSaving(true);
    await onUpdate(note.id, data);
    setSaving(false);
  }, [note.id, onUpdate]);

  const debounceSave = useCallback((data: Record<string,unknown>) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(data), 800);
  }, [save]);

  const handleContentChange = useCallback(() => {
    updateWordCount();
    const content = editorRef.current?.innerHTML || "";
    debounceSave({ title, content, wordCount });
  }, [title, debounceSave, wordCount]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    debounceSave({ title: e.target.value, content: editorRef.current?.innerHTML || "" });
  };

  // Formatting
  const fmt = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleContentChange();
  };

  const insertLink = () => {
    const url = prompt("Enter URL (e.g. https://example.com):");
    if (url) { editorRef.current?.focus(); document.execCommand("createLink", false, url); handleContentChange(); }
  };

  const insertTable = () => {
    let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0;"><tbody>';
    for (let r = 0; r < 3; r++) {
      html += "<tr>";
      for (let c = 0; c < 3; c++) {
        const tag = r === 0 ? "th" : "td";
        html += `<${tag} contenteditable="true" style="border:1px solid var(--border);padding:8px 12px;min-width:80px;${r===0?"font-weight:600;background:var(--surface-hover);":""}"> </${tag}>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    handleContentChange();
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        editorRef.current?.focus();
        document.execCommand("insertHTML", false, `<img src="${ev.target?.result}" style="max-width:100%;border-radius:8px;margin:8px 0;display:block;cursor:pointer;" onclick="this.style.outline=this.style.outline?'':'2px solid var(--accent)'" />`);
        handleContentChange();
      };
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
      reader.onload = async (ev) => { await save({ coverImage: ev.target?.result as string }); toast.success("Cover set!"); };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleTagToggle = async (tagId: string) => {
    const newIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(newIds);
    await save({ tagIds: newIds });
    toast.success("Tags updated");
  };

  const handlePin = async () => {
    await save({ isPinned: !note.isPinned });
    toast.success(note.isPinned ? "Unpinned" : "Pinned");
  };

  const handleArchive = async () => {
    await save({ isArchived: !note.isArchived });
    toast.success(note.isArchived ? "Unarchived" : "Archived");
    setOpenMenu(null);
  };

  const handleTrash = () => {
    setOpenMenu(null);
    onTrash();
  };

  const handleDelete = () => {
    setOpenMenu(null);
    if (confirm("Permanently delete this note? This cannot be undone.")) onDelete();
  };

  const handleAI = async (action: string) => {
    const content = editorRef.current?.innerText || "";
    if (!content.trim()) { toast.error("Write something first!"); return; }
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
    } catch { toast.error("Network error"); }
    setAiLoading(false);
  };

  const applyAI = () => {
    if (!editorRef.current || !aiResult) return;
    editorRef.current.innerHTML += `<hr style="margin:16px 0;border:none;border-top:1px solid var(--border)"><p><em style="color:var(--text-muted);font-size:11px">✦ AI ${aiAction}:</em></p><p>${aiResult.replace(/\n/g, "<br>")}</p>`;
    handleContentChange();
    setAiResult(""); setShowAI(false);
    toast.success("Added to note");
  };

  const handleVoiceInsert = (text: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand("insertHTML", false, `<p>${text}</p>`);
    handleContentChange();
    toast.success("Voice added!");
  };

  // Right-click context menu on editor for delete image/table
  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG" || target.closest("table")) {
      e.preventDefault();
      if (confirm(`Delete this ${target.tagName === "IMG" ? "image" : "table"}?`)) {
        const el = target.tagName === "IMG" ? target : target.closest("table");
        el?.parentNode?.removeChild(el);
        handleContentChange();
      }
    }
  };

  const toggle = (menu: string) => setOpenMenu(openMenu === menu ? null : menu);
  const closeAll = () => setOpenMenu(null);
  const editorBg = note.color ? (NOTE_COLOR_MAP[note.color] || "var(--surface)") : "var(--surface)";

  return (
    <div className="flex flex-col h-full" style={{ background: editorBg }}>

      {/* Top toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-2 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: editorBg }}>
        <button onClick={onBack} className="md:hidden p-2 rounded-lg hover:bg-black/5 mr-1">
          <ArrowLeft size={15} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {saving ? "Saving…" : `Saved ${format(new Date(note.updatedAt), "h:mm a")}`}
          </span>
          {wordCount > 0 && <span className="hidden md:inline" style={{ fontSize: "11px", color: "var(--text-muted)" }}>· {wordCount}w</span>}
        </div>

        {/* Pin */}
        <TBtn onClick={handlePin} active={note.isPinned} title={note.isPinned ? "Unpin" : "Pin"}>
          <Pin size={14} />
        </TBtn>

        {/* Emoji picker */}
        <div className="relative">
          <TBtn onClick={() => toggle("emoji")} title="Set emoji"><Smile size={14} /></TBtn>
          {openMenu === "emoji" && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 p-2 grid grid-cols-8 gap-1 animate-scale"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", width: "224px" }}>
                <button onClick={() => { save({ emoji: null }); closeAll(); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-xs"
                  style={{ color: "var(--text-muted)" }}>✕</button>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { save({ emoji: e }); closeAll(); toast.success("Emoji set!"); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-sm"
                    style={{ outline: note.emoji === e ? "2px solid var(--text)" : "none", outlineOffset: "1px" }}>{e}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Color picker */}
        <div className="relative">
          <TBtn onClick={() => toggle("color")} title="Note color"><Palette size={14} /></TBtn>
          {openMenu === "color" && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 p-3 animate-scale"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: "220px" }}>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Note Color</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.id ?? "default"} onClick={() => { save({ color: c.id }); closeAll(); toast.success("Color set!"); }}
                      className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: c.bg, borderColor: note.color === c.id ? "var(--text)" : "var(--border)" }} />
                      <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{c.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <button onClick={() => { closeAll(); handleCoverUpload(); }}
                    className="w-full py-2 rounded-lg text-xs transition-all hover:opacity-80"
                    style={{ background: "var(--surface-hover)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    {note.coverImage ? "Change cover image" : "+ Add cover image"}
                  </button>
                  {note.coverImage && (
                    <button onClick={() => { save({ coverImage: null }); closeAll(); }}
                      className="w-full py-1.5 rounded-lg text-xs mt-1"
                      style={{ color: "var(--danger)", fontFamily: "var(--font-body)" }}>
                      Remove cover
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tags */}
        <div className="relative">
          <TBtn onClick={() => toggle("tags")} title="Tags"><TagIcon size={14} /></TBtn>
          {openMenu === "tags" && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 animate-scale overflow-hidden"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: "180px" }}>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", padding: "8px 12px 4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tags</p>
                {tags.length === 0
                  ? <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 12px 12px" }}>Create tags in the sidebar first</p>
                  : tags.map(tag => (
                    <button key={tag.id} onClick={() => handleTagToggle(tag.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 transition-all hover:bg-black/5">
                      <div className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0"
                        style={{ background: selectedTagIds.includes(tag.id) ? tag.color : "transparent", borderColor: tag.color }}>
                        {selectedTagIds.includes(tag.id) && <Check size={8} style={{ color: "white" }} />}
                      </div>
                      <span style={{ fontSize: "13px", color: "var(--text)" }}>{tag.name}</span>
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>

        {/* Voice */}
        <TBtn onClick={() => setShowVoice(true)} title="Voice to text"><Mic size={14} /></TBtn>

        {/* AI */}
        <TBtn onClick={() => { setShowAI(!showAI); closeAll(); }} active={showAI} title="AI assistant">
          <Sparkles size={14} />
        </TBtn>

        {/* Export */}
        <TBtn onClick={() => { setShowExport(true); closeAll(); }} title="Export"><Download size={14} /></TBtn>

        {/* More menu */}
        <div className="relative">
          <TBtn onClick={() => toggle("menu")} title="More options"><MoreHorizontal size={14} /></TBtn>
          {openMenu === "menu" && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 py-1 animate-scale overflow-hidden"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: "180px" }}>
                <MItem onClick={() => { onDuplicate(); closeAll(); }}><Copy size={13} /> Duplicate</MItem>
                <MItem onClick={handleArchive}><Archive size={13} /> {note.isArchived ? "Unarchive" : "Archive"}</MItem>
                <div style={{ height: "1px", background: "var(--border)", margin: "3px 0" }} />
                <MItem onClick={handleTrash} danger><Trash2 size={13} /> Move to trash</MItem>
                <MItem onClick={handleDelete} danger><X size={13} /> Delete permanently</MItem>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="format-toolbar flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <FBtn cmd="bold"          icon={<Bold size={12} />}          title="Bold" />
        <FBtn cmd="italic"        icon={<Italic size={12} />}        title="Italic" />
        <FBtn cmd="underline"     icon={<Underline size={12} />}     title="Underline" />
        <FBtn cmd="strikeThrough" icon={<span style={{ textDecoration:"line-through",fontSize:"11px",fontWeight:600 }}>S</span>} title="Strikethrough" />
        <div className="format-divider" />
        <button className="format-btn" onClick={() => fmt("formatBlock","h1")} title="Heading 1"><span style={{ fontWeight:700,fontSize:"11px" }}>H1</span></button>
        <button className="format-btn" onClick={() => fmt("formatBlock","h2")} title="Heading 2"><span style={{ fontWeight:700,fontSize:"10px" }}>H2</span></button>
        <button className="format-btn" onClick={() => fmt("formatBlock","h3")} title="Heading 3"><span style={{ fontWeight:700,fontSize:"9px" }}>H3</span></button>
        <div className="format-divider" />
        <FBtn cmd="insertUnorderedList" icon={<List size={12} />}        title="Bullet list" />
        <FBtn cmd="insertOrderedList"   icon={<ListOrdered size={12} />} title="Numbered list" />
        <button className="format-btn" onClick={() => fmt("formatBlock","blockquote")} title="Blockquote"><Quote size={12} /></button>
        <div className="format-divider" />
        <button className="format-btn" onClick={() => { const s=window.getSelection()?.toString(); if(s) fmt("insertHTML",`<code style="background:var(--surface-hover);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.875em">${s}</code>`); }} title="Inline code"><Code size={12} /></button>
        <button className="format-btn" onClick={insertLink}        title="Insert link"><Link size={12} /></button>
        <button className="format-btn" onClick={handleImageUpload} title="Insert image"><ImageIcon size={12} /></button>
        <button className="format-btn" onClick={insertTable}       title="Insert table"><Table size={12} /></button>
        <button className="format-btn" onClick={() => fmt("insertHorizontalRule")} title="Horizontal rule"><Minus size={12} /></button>
        <button className="format-btn" onClick={() => { fmt("removeFormat"); }} title="Remove formatting" style={{ marginLeft:"2px" }}>
          <RotateCcw size={12} />
        </button>
        <button className="format-btn" onClick={() => {
          if (!editorRef.current) return;
          if (confirm("Clear all content?")) { editorRef.current.innerHTML = ""; handleContentChange(); }
        }} style={{ marginLeft:"auto",fontSize:"10px",color:"var(--text-muted)" }} title="Clear all">Clear</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 overflow-y-auto" onClick={closeAll}>
          {note.coverImage && (
            <div style={{ width:"100%",height:"180px",overflow:"hidden",position:"relative",flexShrink:0 }}>
              <img src={note.coverImage} alt="Cover" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,var(--surface))" }} />
            </div>
          )}
          <div className="max-w-2xl mx-auto px-6 py-6 md:px-10 pb-24 md:pb-8">
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {note.tags.map(nt => (
                  <span key={nt.tagId} className="px-2 py-0.5 rounded-full"
                    style={{ background:nt.tag.color+"20",color:nt.tag.color,fontSize:"11px" }}>
                    {nt.tag.name}
                  </span>
                ))}
              </div>
            )}
            {note.emoji && <div className="mb-3"><span style={{ fontSize:"40px" }}>{note.emoji}</span></div>}
            <textarea
              ref={titleRef}
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled"
              rows={1}
              className="w-full resize-none bg-transparent border-none outline-none"
              style={{ fontFamily:"var(--font-display)",fontSize:"26px",fontWeight:500,color:"var(--text)",lineHeight:"1.25",marginBottom:"6px" }}
              onInput={e => { const el=e.currentTarget; el.style.height="auto"; el.style.height=el.scrollHeight+"px"; }}
            />
            <p style={{ fontSize:"11px",color:"var(--text-muted)",marginBottom:"20px" }}>
              {format(new Date(note.updatedAt),"EEEE, MMMM d, yyyy · h:mm a")}
            </p>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="rich-editor"
              data-placeholder="Start writing…"
              onInput={handleContentChange}
              onContextMenu={handleContextMenu}
              onPaste={e => {
                e.preventDefault();
                const html = e.clipboardData.getData("text/html");
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertHTML", false, html || text.replace(/\n/g,"<br>"));
              }}
            />
          </div>
        </div>

        {/* AI panel - desktop sidebar */}
        {showAI && (
          <div className="hidden md:flex flex-shrink-0 border-l flex-col animate-slide"
            style={{ width:"200px",borderColor:"var(--border)",background:"var(--surface)",overflowY:"auto" }}>
            <AIPanel actions={AI_ACTIONS} aiLoading={aiLoading} aiAction={aiAction}
              aiResult={aiResult} onAction={handleAI} onApply={applyAI} onClose={() => setShowAI(false)} />
          </div>
        )}
      </div>

      {/* AI panel - mobile bottom sheet */}
      {showAI && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setShowAI(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden animate-up"
            style={{ background:"var(--surface)",borderTop:"1px solid var(--border)",maxHeight:"60vh",paddingBottom:"env(safe-area-inset-bottom)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width:"36px",height:"4px",borderRadius:"2px",background:"var(--border)" }} />
            </div>
            <AIPanel actions={AI_ACTIONS} aiLoading={aiLoading} aiAction={aiAction}
              aiResult={aiResult} onAction={handleAI} onApply={applyAI} onClose={() => setShowAI(false)} />
          </div>
        </div>
      )}

      {showExport && <ExportModal note={note} onClose={() => setShowExport(false)} />}
      {showVoice && <VoiceRecorder onTranscript={handleVoiceInsert} onClose={() => setShowVoice(false)} />}
    </div>
  );
}

function TBtn({ children, onClick, title, active }: { children:React.ReactNode; onClick:()=>void; title?:string; active?:boolean }) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-lg transition-all hover:bg-black/5 flex-shrink-0"
      style={{ color:active?"var(--text)":"var(--text-muted)",background:active?"var(--accent-light)":"transparent" }}>
      {children}
    </button>
  );
}

function FBtn({ cmd, icon, title }: { cmd:string; icon:React.ReactNode; title?:string }) {
  return (
    <button className="format-btn" title={title}
      onMouseDown={e => { e.preventDefault(); document.execCommand(cmd,false); }}>
      {icon}
    </button>
  );
}

function MItem({ children, onClick, danger }: { children:React.ReactNode; onClick:()=>void; danger?:boolean }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all hover:bg-black/5"
      style={{ fontSize:"13px",color:danger?"var(--danger)":"var(--text)",fontFamily:"var(--font-body)" }}>
      {children}
    </button>
  );
}

function AIPanel({ actions, aiLoading, aiAction, aiResult, onAction, onApply, onClose }: {
  actions:{id:string;label:string}[]; aiLoading:boolean; aiAction:string; aiResult:string;
  onAction:(id:string)=>void; onApply:()=>void; onClose:()=>void;
}) {
  return (
    <div className="p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em" }}>AI Assistant</p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5">
          <X size={13} style={{ color:"var(--text-muted)" }} />
        </button>
      </div>
      <div className="space-y-1">
        {actions.map(a => (
          <button key={a.id} onClick={() => onAction(a.id)} disabled={aiLoading}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all hover:bg-black/5 text-left"
            style={{ fontSize:"14px",color:"var(--text)",fontFamily:"var(--font-body)",opacity:aiLoading&&aiAction===a.id?0.5:1 }}>
            {aiLoading && aiAction === a.id
              ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor:"var(--border)",borderTopColor:"var(--text)" }} />
              : <Sparkles size={12} style={{ color:"var(--text-muted)",flexShrink:0 }} />}
            {a.label}
          </button>
        ))}
      </div>
      {aiResult && (
        <div className="mt-3 animate-fade">
          <div className="p-3 rounded-xl" style={{ background:"var(--surface-hover)",border:"1px solid var(--border)" }}>
            <p style={{ fontSize:"12px",color:"var(--text-secondary)",lineHeight:"1.6",marginBottom:"10px" }}>
              {aiResult.slice(0,300)}{aiResult.length>300?"…":""}
            </p>
            <button onClick={onApply} className="w-full py-2 rounded-lg text-sm transition-all hover:opacity-80"
              style={{ background:"var(--text)",color:"var(--bg)",fontFamily:"var(--font-body)" }}>
              Add to note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
