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
const NOTE_COLOR_MAP: Record<string,string> = {
  cream:"#fdf8f0", sage:"#f0f4f0", rose:"#fdf0f3",
  sky:"#f0f4fd", lavender:"#f3f0fd", yellow:"#fdf9e3"
};
const COLOR_OPTIONS = [
  { id: null,       label:"Default",  bg:"#ffffff" },
  { id:"cream",     label:"Cream",    bg:"#fdf8f0" },
  { id:"sage",      label:"Sage",     bg:"#f0f4f0" },
  { id:"rose",      label:"Rose",     bg:"#fdf0f3" },
  { id:"sky",       label:"Sky",      bg:"#f0f4fd" },
  { id:"lavender",  label:"Lavender", bg:"#f3f0fd" },
  { id:"yellow",    label:"Yellow",   bg:"#fdf9e3" },
];
const AI_ACTIONS = [
  { id:"summarize", label:"Summarize" },
  { id:"expand",    label:"Expand" },
  { id:"rewrite",   label:"Rewrite" },
  { id:"bullets",   label:"Make bullets" },
  { id:"continue",  label:"Continue writing" },
  { id:"fix",       label:"Fix grammar" },
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
  const [localNote, setLocalNote] = useState(note);
  const [floatingToolbar, setFloatingToolbar] = useState<{ el: HTMLElement; type: "image"|"table"; x: number; y: number } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<NodeJS.Timeout>();
  const titleRef = useRef(title);
  useEffect(() => { titleRef.current = title; }, [title]);

  useEffect(() => {
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, []);

  // Sync local note when prop changes (e.g. after save)
  useEffect(() => {
    setLocalNote(note);
    setTitle(note.title);
    setSelectedTagIds(note.tags.map(nt => nt.tagId));
  }, [note.id, note.isPinned, note.emoji, note.color, note.isArchived, note.coverImage, note.tags.length]);

  // Init editor HTML
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content || "";
    }
    const text = editorRef.current?.innerText || "";
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  }, [note.id]);

  const save = useCallback(async (data: Record<string,unknown>): Promise<Note | undefined> => {
    setSaving(true);
    try {
      const updated = await onUpdate(note.id, data);
      if (updated) setLocalNote(updated);
      return updated;
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save — check your connection");
      return undefined;
    } finally {
      setSaving(false);
    }
  }, [note.id, onUpdate]);

  const debounceSave = useCallback((data: Record<string,unknown>) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(data), 800);
  }, [save]);

  const handleContentChange = useCallback(() => {
    const content = editorRef.current?.innerHTML || "";
    const text = editorRef.current?.innerText || "";
    const wc = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(wc);
    debounceSave({ title: titleRef.current, content });
  }, [debounceSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    debounceSave({ title: e.target.value, content: editorRef.current?.innerHTML || "" });
  };

  const fmt = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleContentChange();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) { editorRef.current?.focus(); document.execCommand("createLink", false, url); handleContentChange(); }
  };

  const insertTable = () => {
    let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0;"><tbody>';
    for (let r = 0; r < 3; r++) {
      html += "<tr>";
      for (let c = 0; c < 3; c++) {
        const tag = r === 0 ? "th" : "td";
        html += `<${tag} contenteditable="true" style="border:1px solid var(--border);padding:8px 12px;min-width:80px;${r===0?"font-weight:600;background:var(--surface-hover);":""}">&nbsp;</${tag}>`;
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
        document.execCommand("insertHTML", false, `<img src="${ev.target?.result}" style="max-width:100%;border-radius:8px;margin:8px 0;display:block;" /><p><br></p>`);
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
      reader.onload = async (ev) => {
        const updated = await save({ coverImage: ev.target?.result as string });
        if (updated) setLocalNote(updated);
        setOpenMenu(null);
        toast.success("Cover image set!");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // ── All action handlers ──

  const handlePin = async () => {
    const updated = await save({ isPinned: !localNote.isPinned });
    if (updated) setLocalNote(updated);
    toast.success(localNote.isPinned ? "Unpinned" : "📌 Pinned!");
  };

  const handleEmoji = async (emoji: string | null) => {
    const updated = await save({ emoji });
    if (updated) setLocalNote(updated);
    setOpenMenu(null);
    toast.success(emoji ? `Emoji set to ${emoji}` : "Emoji removed");
  };

  const handleColor = async (colorId: string | null) => {
    const updated = await save({ color: colorId });
    if (updated) setLocalNote(updated);
    setOpenMenu(null);
    toast.success(colorId ? "Color applied!" : "Color removed");
  };

  const handleTagToggle = async (tagId: string) => {
    const newIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(newIds);
    const updated = await save({ tagIds: newIds });
    if (updated) setLocalNote(updated);
  };

  const handleArchive = async () => {
    const updated = await save({ isArchived: !localNote.isArchived });
    if (updated) setLocalNote(updated);
    setOpenMenu(null);
    toast.success(localNote.isArchived ? "Unarchived" : "Archived");
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
    // Strip any stray HTML tags if AI returned HTML instead of plain text
    const cleanResult = aiResult.startsWith("<") 
      ? aiResult  // already HTML, use as-is
      : aiResult.replace(/
/g, "<br>");
    editorRef.current.innerHTML += `<hr style="margin:16px 0;border:none;border-top:1px solid var(--border)"><p><em style="color:var(--text-muted);font-size:11px">✦ AI:</em></p><p>${cleanResult}</p>`;
    handleContentChange();
    setAiResult(""); setShowAI(false);
    toast.success("Added to note!");
  };

  const handleVoiceInsert = (text: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand("insertHTML", false, `<p>${text}</p>`);
    handleContentChange();
    toast.success("Voice inserted!");
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isImg = target.tagName === "IMG";
    const tbl = target.closest("table") as HTMLElement | null;
    if (isImg || tbl) {
      e.preventDefault();
      const el = isImg ? target : tbl!;
      const rect = el.getBoundingClientRect();
      setFloatingToolbar({ el, type: isImg ? "image" : "table", x: rect.left, y: rect.top });
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isImg = target.tagName === "IMG";
    const tbl = target.closest("table") as HTMLElement | null;
    if (isImg || tbl) {
      const el = isImg ? target : tbl!;
      const rect = el.getBoundingClientRect();
      setFloatingToolbar({ el, type: isImg ? "image" : "table", x: rect.left, y: rect.top });
    } else {
      setFloatingToolbar(null);
    }
    closeAll();
  };

  const floatingDelete = () => {
    if (!floatingToolbar) return;
    floatingToolbar.el.parentNode?.removeChild(floatingToolbar.el);
    setFloatingToolbar(null);
    handleContentChange();
    toast.success("Deleted");
  };

  const floatingMove = (dir: "up"|"down") => {
    if (!floatingToolbar) return;
    const el = floatingToolbar.el;
    const parent = el.parentNode;
    if (!parent) return;
    if (dir === "up") {
      const prev = el.previousElementSibling;
      if (prev) parent.insertBefore(el, prev);
    } else {
      const next = el.nextElementSibling;
      if (next) parent.insertBefore(next, el);
    }
    handleContentChange();
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setFloatingToolbar(f => f ? { ...f, x: rect.left, y: rect.top } : null);
    }, 50);
  };

  const tableAddRow = () => {
    if (!floatingToolbar || floatingToolbar.type !== "table") return;
    const tbody = floatingToolbar.el.querySelector("tbody");
    if (!tbody) return;
    const cols = tbody.querySelector("tr")?.children.length || 3;
    const tr = document.createElement("tr");
    for (let i = 0; i < cols; i++) {
      const td = document.createElement("td");
      td.contentEditable = "true";
      td.style.cssText = "border:1px solid var(--border);padding:8px 12px;min-width:80px;";
      td.innerHTML = "&nbsp;";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
    handleContentChange();
  };

  const tableAddCol = () => {
    if (!floatingToolbar || floatingToolbar.type !== "table") return;
    const rows = floatingToolbar.el.querySelectorAll("tr");
    rows.forEach((row, i) => {
      const cell = i === 0 ? document.createElement("th") : document.createElement("td");
      cell.contentEditable = "true";
      cell.style.cssText = i === 0
        ? "border:1px solid var(--border);padding:8px 12px;min-width:80px;font-weight:600;background:var(--surface-hover);"
        : "border:1px solid var(--border);padding:8px 12px;min-width:80px;";
      cell.innerHTML = "&nbsp;";
      row.appendChild(cell);
    });
    handleContentChange();
  };

  const toggle = (m: string) => setOpenMenu(openMenu === m ? null : m);
  const closeAll = () => setOpenMenu(null);

  const editorBg = localNote.color ? (NOTE_COLOR_MAP[localNote.color] || "var(--surface)") : "var(--surface)";

  return (
    <div className="flex flex-col h-full" style={{ background: editorBg }}>

      {/* Top toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-2 border-b flex-shrink-0"
        style={{ borderColor:"var(--border)", background:editorBg }}>

        <button onClick={onBack} className="md:hidden p-2 rounded-lg hover:bg-black/5 mr-1">
          <ArrowLeft size={15} style={{ color:"var(--text-secondary)" }} />
        </button>

        <div className="flex items-center gap-1.5 min-w-0">
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
            background: saving ? "var(--text-muted)" : "var(--accent, #5DCAA5)",
            transition: "background 0.3s ease",
          }} />
          <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {saving ? "Saving…" : `Saved ${format(new Date(localNote.updatedAt), "h:mm a")}`}
          </span>
        </div>
        <div className="flex-1" />

        {/* AI pill */}
        <button
          onClick={() => { setShowAI(!showAI); closeAll(); }}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "5px 11px", borderRadius: "20px",
            background: showAI ? "#5DCAA5" : "rgba(93,202,165,0.15)",
            color: showAI ? "#fff" : "#5DCAA5",
            border: "none", cursor: "pointer",
            fontSize: "11px", fontWeight: 500, fontFamily: "var(--font-body)",
            flexShrink: 0,
          }}
          title="AI assistant">
          <Sparkles size={12} />
          <span className="hidden sm:inline">AI</span>
        </button>

        {/* PIN */}
        <TBtn onClick={handlePin} active={localNote.isPinned} title={localNote.isPinned ? "Unpin" : "Pin note"}>
          <Pin size={14} />
        </TBtn>

        {/* EMOJI */}
        <div className="relative">
          <TBtn onClick={() => toggle("emoji")} title="Set emoji">
            {localNote.emoji ? <span style={{ fontSize:"14px", lineHeight:1 }}>{localNote.emoji}</span> : <Smile size={14} />}
          </TBtn>
          {openMenu === "emoji" && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 p-2 animate-scale"
                style={{ background:"var(--surface)", border:"1px solid var(--border)", width:"232px" }}>
                <div className="grid grid-cols-8 gap-1">
                  <button onClick={() => handleEmoji(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-xs"
                    style={{ color:"var(--text-muted)" }} title="Remove emoji">✕</button>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => handleEmoji(e)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-sm"
                      style={{ outline: localNote.emoji===e ? "2px solid var(--text)" : "none", outlineOffset:"1px" }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* COLOR */}
        <div className="relative">
          <TBtn onClick={() => toggle("color")} title="Note color">
            <Palette size={14} />
          </TBtn>
          {openMenu === "color" && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 p-3 animate-scale"
                style={{ background:"var(--surface)", border:"1px solid var(--border)", minWidth:"230px" }}>
                <p style={{ fontSize:"10px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"10px" }}>Note Color</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.id ?? "default"} onClick={() => handleColor(c.id)}
                      className="flex flex-col items-center gap-1 cursor-pointer">
                      <div className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                        style={{ background:c.bg, borderColor: localNote.color===c.id ? "#000000" : "var(--border)" }} />
                      <span style={{ fontSize:"9px", color:"var(--text-muted)" }}>{c.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ borderTop:"1px solid var(--border)", paddingTop:"10px", display:"flex", flexDirection:"column", gap:"4px" }}>
                  <button onClick={() => { closeAll(); handleCoverUpload(); }}
                    className="w-full py-2 rounded-lg text-xs hover:opacity-80 transition-all"
                    style={{ background:"var(--surface-hover)", color:"var(--text-secondary)", fontFamily:"var(--font-body)", border:"none", cursor:"pointer" }}>
                    {localNote.coverImage ? "📷 Change cover image" : "📷 Add cover image"}
                  </button>
                  {localNote.coverImage && (
                    <button onClick={async () => { await save({ coverImage: null }); setOpenMenu(null); toast.success("Cover removed"); }}
                      className="w-full py-1.5 rounded-lg text-xs transition-all"
                      style={{ color:"var(--danger)", fontFamily:"var(--font-body)", background:"none", border:"none", cursor:"pointer" }}>
                      Remove cover
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* TAGS */}
        <div className="relative">
          <TBtn onClick={() => toggle("tags")} title="Manage tags">
            <TagIcon size={14} />
          </TBtn>
          {openMenu === "tags" && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 animate-scale overflow-hidden"
                style={{ background:"var(--surface)", border:"1px solid var(--border)", minWidth:"190px" }}>
                <p style={{ fontSize:"10px", color:"var(--text-muted)", padding:"8px 12px 4px", textTransform:"uppercase", letterSpacing:"0.1em" }}>Tags</p>
                {tags.length === 0 ? (
                  <p style={{ fontSize:"12px", color:"var(--text-muted)", padding:"8px 12px 12px" }}>
                    Create tags in the sidebar first
                  </p>
                ) : (
                  <div className="py-1">
                    {tags.map(tag => (
                      <button key={tag.id} onClick={() => handleTagToggle(tag.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-all hover:bg-black/5">
                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                          style={{ background: selectedTagIds.includes(tag.id) ? tag.color : "transparent", borderColor:tag.color }}>
                          {selectedTagIds.includes(tag.id) && <Check size={9} style={{ color:"white" }} />}
                        </div>
                        <span style={{ fontSize:"13px", color:"var(--text)" }}>{tag.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* VOICE */}
        <TBtn onClick={() => setShowVoice(true)} title="Voice to text"><Mic size={14} /></TBtn>

        {/* EXPORT */}
        <TBtn onClick={() => { setShowExport(true); closeAll(); }} title="Export note">
          <Download size={14} />
        </TBtn>

        {/* MORE */}
        <div className="relative">
          <TBtn onClick={() => toggle("menu")} title="More options"><MoreHorizontal size={14} /></TBtn>
          {openMenu === "menu" && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-50 py-1 animate-scale overflow-hidden"
                style={{ background:"var(--surface)", border:"1px solid var(--border)", minWidth:"190px" }}>
                <MItem onClick={() => { onDuplicate(); closeAll(); }}>
                  <Copy size={13} /> Duplicate
                </MItem>
                <MItem onClick={handleArchive}>
                  <Archive size={13} /> {localNote.isArchived ? "Unarchive" : "Archive"}
                </MItem>
                <div style={{ height:"1px", background:"var(--border)", margin:"3px 0" }} />
                <MItem onClick={handleTrash} danger>
                  <Trash2 size={13} /> Move to trash
                </MItem>
                <MItem onClick={handleDelete} danger>
                  <X size={13} /> Delete permanently
                </MItem>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 1 — Text formatting */}
      <div className="format-toolbar flex-shrink-0" style={{ borderColor:"var(--border)" }}>
        <FBtn cmd="bold"          icon={<Bold size={12} />}          title="Bold (⌘B)" />
        <FBtn cmd="italic"        icon={<Italic size={12} />}        title="Italic (⌘I)" />
        <FBtn cmd="underline"     icon={<Underline size={12} />}     title="Underline (⌘U)" />
        <FBtn cmd="strikeThrough" icon={<span style={{ textDecoration:"line-through", fontSize:"11px", fontWeight:600 }}>S</span>} title="Strikethrough" />
        <div className="format-divider" />
        <button className="format-btn" onClick={() => fmt("formatBlock","h1")} title="Heading 1"><span style={{ fontWeight:700, fontSize:"11px" }}>H1</span></button>
        <button className="format-btn" onClick={() => fmt("formatBlock","h2")} title="Heading 2"><span style={{ fontWeight:700, fontSize:"10px" }}>H2</span></button>
        <button className="format-btn" onClick={() => fmt("formatBlock","h3")} title="Heading 3"><span style={{ fontWeight:700, fontSize:"9px" }}>H3</span></button>
        <div className="format-divider" />
        <FBtn cmd="insertUnorderedList" icon={<List size={12} />}        title="Bullet list" />
        <FBtn cmd="insertOrderedList"   icon={<ListOrdered size={12} />} title="Numbered list" />
        <button className="format-btn" onClick={() => fmt("formatBlock","blockquote")} title="Quote"><Quote size={12} /></button>
        <div className="format-divider" />
        <button className="format-btn" onClick={() => { const s=window.getSelection()?.toString(); if(s) fmt("insertHTML",`<code style="background:var(--surface-hover);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.875em">${s}</code>`); }} title="Inline code"><Code size={12} /></button>
        <button className="format-btn" onClick={() => fmt("removeFormat")} title="Remove formatting"><RotateCcw size={12} /></button>
      </div>

      {/* Row 2 — Insert actions */}
      <div className="format-toolbar flex-shrink-0" style={{ borderColor:"var(--border)", background:"var(--surface)" }}>
        <span style={{ fontSize:"10px", color:"var(--text-muted)", padding:"0 6px", opacity:0.6, userSelect:"none" }}>Insert</span>
        <div className="format-divider" />
        <button className="format-btn" onClick={insertLink}        title="Link"><Link size={12} /></button>
        <button className="format-btn" onClick={handleImageUpload} title="Image"><ImageIcon size={12} /></button>
        <button className="format-btn" onClick={insertTable}       title="Table"><Table size={12} /></button>
        <button className="format-btn" onClick={() => fmt("insertHorizontalRule")} title="Divider"><Minus size={12} /></button>
        <button className="format-btn" onClick={() => {
          if (confirm("Clear all content?")) { if(editorRef.current) editorRef.current.innerHTML=""; handleContentChange(); }
        }} style={{ marginLeft:"auto", fontSize:"10px", color:"var(--text-muted)", padding:"0 8px" }}>Clear</button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto" onClick={closeAll}>
          {localNote.coverImage && (
            <div style={{ width:"100%", height:"180px", overflow:"hidden", position:"relative" }}>
              <img src={localNote.coverImage} alt="Cover" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 50%, var(--surface))" }} />
            </div>
          )}
          <div className="max-w-2xl mx-auto px-6 py-6 md:px-10 pb-24 md:pb-8">
            {/* Tags display */}
            {localNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {localNote.tags.map(nt => (
                  <span key={nt.tagId} className="px-2 py-0.5 rounded-full"
                    style={{ background:nt.tag.color+"20", color:nt.tag.color, fontSize:"11px" }}>
                    {nt.tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Emoji display */}
            {localNote.emoji && (
              <div className="mb-3">
                <span style={{ fontSize:"44px" }}>{localNote.emoji}</span>
              </div>
            )}

            {/* Title */}
            <textarea
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled"
              rows={1}
              className="w-full resize-none bg-transparent border-none outline-none"
              style={{ fontFamily:"var(--font-display)", fontSize:"26px", fontWeight:500, color:"var(--text)", lineHeight:"1.25", marginBottom:"6px" }}
              onInput={e => { const el=e.currentTarget; el.style.height="auto"; el.style.height=el.scrollHeight+"px"; }}
            />

            {/* Date + meta */}
            <div className="flex items-center gap-3 mb-5">
              <p style={{ fontSize:"11px", color:"var(--text-muted)" }}>
                {format(new Date(localNote.updatedAt), "EEEE, MMMM d, yyyy · h:mm a")}
              </p>
              {localNote.isPinned && <span style={{ fontSize:"10px", color:"var(--text-muted)" }}>📌 Pinned</span>}
              {localNote.isArchived && <span style={{ fontSize:"10px", color:"var(--text-muted)" }}>📦 Archived</span>}
            </div>

            {/* Editor */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              className="rich-editor"
              data-placeholder="Start writing…"
              onInput={handleContentChange}
              onContextMenu={handleContextMenu}
              onClick={handleEditorClick}
              onPaste={e => {
                e.preventDefault();
                const html = e.clipboardData.getData("text/html");
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertHTML", false, html || text.replace(/\n/g,"<br>"));
              }}
            />
            {wordCount === 0 && (
              <p style={{
                fontFamily: "var(--font-display)", fontSize: "14px",
                color: "var(--text-muted)", marginTop: "12px",
                pointerEvents: "none", userSelect: "none", opacity: 0.45,
              }}>
                Press{" "}
                <kbd style={{
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border-light)",
                  borderRadius: "4px", padding: "1px 6px",
                  fontSize: "12px", fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                }}>/</kbd>
                {" "}for commands, or just start writing…
              </p>
            )}
          </div>
        </div>

        {/* Footer stats */}
        <div className="hidden md:flex items-center px-10 py-1.5 border-t flex-shrink-0"
          style={{ borderColor: "var(--border)", background: editorBg }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
            {wordCount} {wordCount === 1 ? "word" : "words"}
            {editorRef.current?.innerText?.trim()
              ? ` · ${editorRef.current.innerText.trim().length} characters` : ""}
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto", opacity: 0.5 }}>
            ⌘N new · ⌘B sidebar · / commands
          </span>
        </div>

        {/* AI Panel - desktop */}
        {showAI && (
          <div className="hidden md:flex flex-shrink-0 border-l flex-col animate-slide"
            style={{ width:"200px", borderColor:"var(--border)", background:"var(--surface)", overflowY:"auto" }}>
            <AIPanel actions={AI_ACTIONS} loading={aiLoading} currentAction={aiAction}
              result={aiResult} onAction={handleAI} onApply={applyAI} onClose={() => setShowAI(false)} />
          </div>
        )}
      </div>

      {/* AI Panel - mobile bottom sheet */}
      {showAI && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setShowAI(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden animate-up"
            style={{ background:"var(--surface)", borderTop:"1px solid var(--border)", maxHeight:"65vh", paddingBottom:"env(safe-area-inset-bottom)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width:"36px", height:"4px", borderRadius:"2px", background:"var(--border)" }} />
            </div>
            <AIPanel actions={AI_ACTIONS} loading={aiLoading} currentAction={aiAction}
              result={aiResult} onAction={handleAI} onApply={applyAI} onClose={() => setShowAI(false)} />
          </div>
        </div>
      )}

      {showExport && <ExportModal note={localNote} onClose={() => setShowExport(false)} />}

      {/* Floating element toolbar */}
      {floatingToolbar && (
        <div
          style={{
            position: "fixed",
            top: floatingToolbar.y - 44,
            left: floatingToolbar.x,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: "2px",
            background: "var(--surface-elevated, #1f1f1f)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "4px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
          onMouseDown={e => e.preventDefault()}
        >
          <button onClick={() => floatingMove("up")} title="Move up"
            style={{ padding:"4px 8px", borderRadius:"6px", border:"none", background:"transparent",
              color:"var(--text-secondary)", cursor:"pointer", fontSize:"13px" }}
            onMouseEnter={e => (e.currentTarget.style.background="var(--surface-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
            ↑
          </button>
          <button onClick={() => floatingMove("down")} title="Move down"
            style={{ padding:"4px 8px", borderRadius:"6px", border:"none", background:"transparent",
              color:"var(--text-secondary)", cursor:"pointer", fontSize:"13px" }}
            onMouseEnter={e => (e.currentTarget.style.background="var(--surface-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
            ↓
          </button>
          {floatingToolbar.type === "table" && (
            <>
              <div style={{ width:"1px", height:"16px", background:"var(--border)", margin:"0 2px" }} />
              <button onClick={tableAddRow} title="Add row"
                style={{ padding:"4px 8px", borderRadius:"6px", border:"none", background:"transparent",
                  color:"var(--text-secondary)", cursor:"pointer", fontSize:"11px", whiteSpace:"nowrap" }}
                onMouseEnter={e => (e.currentTarget.style.background="var(--surface-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                +row
              </button>
              <button onClick={tableAddCol} title="Add column"
                style={{ padding:"4px 8px", borderRadius:"6px", border:"none", background:"transparent",
                  color:"var(--text-secondary)", cursor:"pointer", fontSize:"11px", whiteSpace:"nowrap" }}
                onMouseEnter={e => (e.currentTarget.style.background="var(--surface-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                +col
              </button>
            </>
          )}
          <div style={{ width:"1px", height:"16px", background:"var(--border)", margin:"0 2px" }} />
          <button onClick={floatingDelete} title="Delete"
            style={{ padding:"4px 8px", borderRadius:"6px", border:"none", background:"transparent",
              color:"#cc0000", cursor:"pointer", fontSize:"13px" }}
            onMouseEnter={e => (e.currentTarget.style.background="rgba(204,0,0,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
            ✕
          </button>
          <button onClick={() => setFloatingToolbar(null)} title="Dismiss"
            style={{ padding:"4px 6px", borderRadius:"6px", border:"none", background:"transparent",
              color:"var(--text-muted)", cursor:"pointer", fontSize:"11px" }}
            onMouseEnter={e => (e.currentTarget.style.background="var(--surface-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
            esc
          </button>
        </div>
      )}
      {showVoice && <VoiceRecorder onTranscript={handleVoiceInsert} onClose={() => setShowVoice(false)} />}
    </div>
  );
}

function TBtn({ children, onClick, title, active }: {
  children: React.ReactNode; onClick: ()=>void; title?: string; active?: boolean;
}) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-lg transition-all hover:bg-black/5 flex-shrink-0"
      style={{ color: active?"var(--text)":"var(--text-muted)", background: active?"var(--accent-light)":"transparent" }}>
      {children}
    </button>
  );
}

function FBtn({ cmd, icon, title }: { cmd: string; icon: React.ReactNode; title?: string }) {
  return (
    <button className="format-btn" title={title}
      onMouseDown={e => { e.preventDefault(); document.execCommand(cmd, false); }}>
      {icon}
    </button>
  );
}

function MItem({ children, onClick, danger }: {
  children: React.ReactNode; onClick: ()=>void; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all hover:bg-black/5"
      style={{ fontSize:"13px", color: danger?"var(--danger)":"var(--text)", fontFamily:"var(--font-body)" }}>
      {children}
    </button>
  );
}

function AIPanel({ actions, loading, currentAction, result, onAction, onApply, onClose }: {
  actions: {id:string; label:string}[]; loading: boolean; currentAction: string;
  result: string; onAction: (id:string)=>void; onApply: ()=>void; onClose: ()=>void;
}) {
  return (
    <div className="p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize:"10px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em" }}>
          AI Assistant
        </p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5">
          <X size={13} style={{ color:"var(--text-muted)" }} />
        </button>
      </div>
      <div className="space-y-1">
        {actions.map(a => (
          <button key={a.id} onClick={() => onAction(a.id)} disabled={loading}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all hover:bg-black/5 text-left"
            style={{ fontSize:"13px", color:"var(--text)", fontFamily:"var(--font-body)", opacity: loading&&currentAction===a.id ? 0.5 : 1 }}>
            {loading && currentAction === a.id
              ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin flex-shrink-0"
                  style={{ borderColor:"var(--border)", borderTopColor:"var(--text)" }} />
              : <Sparkles size={12} style={{ color:"var(--text-muted)", flexShrink:0 }} />}
            {a.label}
          </button>
        ))}
      </div>
      {result && (
        <div className="mt-3 animate-fade">
          <div className="p-3 rounded-xl" style={{ background:"var(--surface-hover)", border:"1px solid var(--border)" }}>
            <p style={{ fontSize:"12px", color:"var(--text-secondary)", lineHeight:"1.6", marginBottom:"10px" }}>
              {result.replace(/<[^>]*>/g, "").slice(0, 300)}{result.replace(/<[^>]*>/g, "").length > 300 ? "…" : ""}
            </p>
            <button onClick={onApply}
              className="w-full py-2 rounded-lg text-xs transition-all hover:opacity-80"
              style={{ background:"var(--text)", color:"var(--bg)", fontFamily:"var(--font-body)", border:"none", cursor:"pointer" }}>
              Add to note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
