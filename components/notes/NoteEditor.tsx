"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Note, Tag } from "@/types";
import { format } from "date-fns";
import {
  Pin, Trash2, Archive, MoreHorizontal, ArrowLeft,
  Tag as TagIcon, Smile, Palette, Download, Copy,
  Bold, Italic, Underline, List, ListOrdered,
  Quote, Code, Minus, Link, Image as ImageIcon,
  Check, X, Table, Sparkles, Mic, RotateCcw, CheckSquare,
  AlignLeft, AlignCenter, AlignRight,
  ArrowLeftFromLine, ArrowRightFromLine, ArrowLeftRight,
  GripVertical, FileText, LayoutTemplate
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
  const [todoStats, setTodoStats] = useState<{ done: number; total: number } | null>(null);
  // Image selection + resize
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgRect, setImgRect] = useState<DOMRect | null>(null);
  // Page layout mode — persisted in localStorage
  const [pageMode, setPageMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nota_page_mode") === "true";
    }
    return false;
  });
  const togglePageMode = () => {
    setPageMode(prev => {
      const next = !prev;
      localStorage.setItem("nota_page_mode", String(next));
      return next;
    });
  };

  // Page count — how many A4 pages the content currently spans
  const [pageCount, setPageCount] = useState(1);
  const pageCardRef = useRef<HTMLDivElement>(null);

  // A4 page body height in px at 96dpi: 297mm ≈ 1122px
  // We subtract padding (64px top + 64px bottom = 128px) for content area
  const PAGE_CONTENT_H = 994; // px

  useEffect(() => {
    if (!pageMode || !pageCardRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!pageCardRef.current) return;
      const h = pageCardRef.current.scrollHeight;
      // Each page is PAGE_CONTENT_H + 64px top padding + 64px bottom padding = 1122px
      const pages = Math.max(1, Math.ceil(h / 1122));
      setPageCount(pages);
    });
    observer.observe(pageCardRef.current);
    return () => observer.disconnect();
  }, [pageMode]);

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

  // Compute todo completion stats from the live DOM
  const computeTodoStats = useCallback(() => {
    if (!editorRef.current) return;
    const total = editorRef.current.querySelectorAll(".todo-item").length;
    if (total === 0) { setTodoStats(null); return; }
    const done  = editorRef.current.querySelectorAll(".todo-item.todo-done").length;
    setTodoStats({ done, total });
  }, []);

  // Keep imgRect in sync with the selected image position (scroll / resize / zoom)
  const updateImgRect = useCallback(() => {
    if (selectedImg) setImgRect(selectedImg.getBoundingClientRect());
  }, [selectedImg]);

  useEffect(() => {
    if (!selectedImg) { setImgRect(null); return; }
    updateImgRect();
    window.addEventListener("scroll", updateImgRect, true);
    window.addEventListener("resize", updateImgRect);
    return () => {
      window.removeEventListener("scroll", updateImgRect, true);
      window.removeEventListener("resize", updateImgRect);
    };
  }, [selectedImg, updateImgRect]);

  // Init editor HTML — state lives entirely in the todo-done CSS class which
  // is persisted in innerHTML, so no extra restoration step is needed.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content || "";
    }
    const text = editorRef.current?.innerText || "";
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    computeTodoStats();
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    computeTodoStats();
    debounceSave({ title: titleRef.current, content });
  }, [debounceSave, computeTodoStats]);

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

  const insertTodo = () => {
    // Pure span-based checkbox — NO <input type="checkbox">.
    // State lives entirely in the "todo-done" CSS class on .todo-item.
    // This avoids every browser bug around inputs inside contenteditable.
    const newItem =
      `<div class="todo-item">` +
        `<span class="todo-check-wrap"><span class="todo-check"></span></span>` +
        `<span class="todo-text" contenteditable="true"><br></span>` +
      `</div>`;
    const html =
      `<div class="todo-group">${newItem}</div><p><br></p>`;

    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);

    // Place cursor inside the new task text span
    const groups = editorRef.current?.querySelectorAll<HTMLElement>(".todo-group");
    const lastGroup = groups?.[groups.length - 1];
    const firstText = lastGroup?.querySelector<HTMLElement>(".todo-text");
    if (firstText && window.getSelection) {
      const sel = window.getSelection()!;
      const r = document.createRange();
      r.setStart(firstText, 0); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    }
    handleContentChange();
  };

  // ── Checkbox toggle ─────────────────────────────────────────────────────────
  // Uses onMouseDown + preventDefault so contenteditable never interferes.
  // State is the single source of truth: "todo-done" class on .todo-item.
  const handleEditorMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".todo-check-wrap")) {
      e.preventDefault();
      const item = target.closest<HTMLElement>(".todo-item");
      if (!item) return;
      item.classList.toggle("todo-done");
      computeTodoStats();
      setTimeout(() => handleContentChange(), 0);
    }
  }, [handleContentChange, computeTodoStats]);

  // ── Keyboard handling inside todo items ─────────────────────────────────────
  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const node = sel.getRangeAt(0).startContainer;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    const todoText = el?.closest<HTMLElement>(".todo-text");
    if (!todoText) return;

    const item = todoText.closest<HTMLElement>(".todo-item");
    if (!item) return;

    // ── Enter: add new task, or exit list if current task is empty ───────────
    if (e.key === "Enter") {
      e.preventDefault();

      if (!todoText.textContent?.trim()) {
        // Empty task + Enter → exit todo list, insert a paragraph below
        const p = document.createElement("p");
        p.innerHTML = "<br>";
        const group = item.closest<HTMLElement>(".todo-group");
        const insertAfter = group ?? item;
        insertAfter.parentNode?.insertBefore(p, insertAfter.nextSibling);
        item.remove();
        // If group is now empty, remove it too
        if (group && !group.querySelector(".todo-item")) group.remove();

        const r = document.createRange();
        r.setStart(p, 0); r.collapse(true);
        sel.removeAllRanges(); sel.addRange(r);
      } else {
        // Non-empty task + Enter → insert a new blank task directly after
        const newItem = document.createElement("div");
        newItem.className = "todo-item";
        newItem.innerHTML =
          `<span class="todo-check-wrap"><span class="todo-check"></span></span>` +
          `<span class="todo-text" contenteditable="true"><br></span>`;
        item.parentNode?.insertBefore(newItem, item.nextSibling);

        const newText = newItem.querySelector<HTMLElement>(".todo-text")!;
        const r = document.createRange();
        r.setStart(newText, 0); r.collapse(true);
        sel.removeAllRanges(); sel.addRange(r);
      }

      handleContentChange();
    }

    // ── Backspace on an empty task: remove it, focus previous ───────────────
    if (e.key === "Backspace" && !todoText.textContent?.trim()) {
      e.preventDefault();

      const prev = item.previousElementSibling as HTMLElement | null;
      item.remove();

      if (prev?.classList.contains("todo-item")) {
        const prevText = prev.querySelector<HTMLElement>(".todo-text");
        if (prevText) {
          const r = document.createRange();
          r.selectNodeContents(prevText);
          r.collapse(false);
          sel.removeAllRanges(); sel.addRange(r);
        }
      }

      handleContentChange();
    }
  }, [handleContentChange]);

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
    const plainResult = aiResult.replace(/<[^>]*>/g, " ").replace(/  +/g, " ").trim();
    editorRef.current.innerHTML += `<hr style="margin:16px 0;border:none;border-top:1px solid var(--border)"><p><em style="color:var(--text-muted);font-size:11px">✦ AI:</em></p><p>${plainResult}</p>`;
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

  // Save content after the browser's native drag-drop reorders elements
  const handleDrop = () => {
    setSelectedImg(null);
    setTimeout(() => handleContentChange(), 50);
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isImg = target.tagName === "IMG";
    const tbl = target.closest("table") as HTMLElement | null;

    if (isImg) {
      setSelectedImg(target as HTMLImageElement);
      setFloatingToolbar(null); // image uses its own overlay now
    } else {
      setSelectedImg(null);
      if (tbl) {
        const rect = tbl.getBoundingClientRect();
        setFloatingToolbar({ el: tbl, type: "table", x: rect.left, y: rect.top });
      } else {
        setFloatingToolbar(null);
      }
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
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "28px", height: "28px", borderRadius: "8px",
            background: showAI ? "#5DCAA5" : "rgba(93,202,165,0.15)",
            color: showAI ? "#fff" : "#5DCAA5",
            border: "none", cursor: "pointer", flexShrink: 0,
          }}
          title="AI assistant">
          <Sparkles size={13} />
        </button>

        {/* Page / Scroll mode toggle */}
        <TBtn onClick={togglePageMode} active={pageMode}
          title={pageMode ? "Switch to scroll view" : "Switch to page view"}>
          {pageMode ? <LayoutTemplate size={14} /> : <FileText size={14} />}
        </TBtn>

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
        <button className="format-btn" onClick={() => {
          // Capture selection BEFORE focus() — calling focus() clears the selection
          const sel = window.getSelection();
          const s = sel?.toString();
          if (s && sel && sel.rangeCount > 0) {
            const saved = sel.getRangeAt(0).cloneRange();
            editorRef.current?.focus();
            sel.removeAllRanges();
            sel.addRange(saved);
            document.execCommand("insertHTML", false,
              `<code style="background:var(--surface-hover);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.875em">${s}</code>`);
            handleContentChange();
          } else {
            toast.error("Select some text first");
          }
        }} title="Inline code"><Code size={12} /></button>
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
        <button className="format-btn" onClick={insertTodo} title="To-do list"><CheckSquare size={12} /></button>
        <button className="format-btn" onClick={() => {
          if (confirm("Clear all content?")) { if(editorRef.current) editorRef.current.innerHTML=""; handleContentChange(); }
        }} style={{ marginLeft:"auto", fontSize:"10px", color:"var(--text-muted)", padding:"0 8px" }}>Clear</button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Shared inner content ─────────────────────────────────────────
            We define this once and render it inside either the scroll wrapper
            or the page-mode card, avoiding duplication.                      */}
        {(() => {
          const innerContent = (
            <>
              {/* Tags */}
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

              {/* Emoji */}
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

              {/* Todo progress bar */}
              {todoStats && (
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
                  <div style={{ flex:1, height:"3px", borderRadius:"2px", background:"var(--border)", overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:"2px",
                      background: todoStats.done === todoStats.total ? "#5DCAA5" : "var(--text)",
                      width:`${Math.round((todoStats.done/todoStats.total)*100)}%`,
                      transition:"width 0.3s ease, background 0.3s ease",
                    }} />
                  </div>
                  <span style={{ fontSize:"11px", color:"var(--text-muted)", fontFamily:"var(--font-body)", whiteSpace:"nowrap" } as React.CSSProperties}>
                    {todoStats.done} / {todoStats.total} · {Math.round((todoStats.done/todoStats.total)*100)}%
                  </span>
                </div>
              )}

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
                onMouseDown={handleEditorMouseDown}
                onClick={handleEditorClick}
                onKeyDown={handleEditorKeyDown}
                onDrop={handleDrop}
                onPaste={e => {
                  e.preventDefault();
                  const html = e.clipboardData.getData("text/html");
                  const text = e.clipboardData.getData("text/plain");
                  document.execCommand("insertHTML", false, html || text.replace(/\n/g,"<br>"));
                }}
              />
              {wordCount === 0 && (
                <p style={{
                  fontFamily:"var(--font-display)", fontSize:"14px",
                  color:"var(--text-muted)", marginTop:"12px",
                  pointerEvents:"none", userSelect:"none", opacity:0.45,
                }}>
                  Press{" "}
                  <kbd style={{
                    background:"var(--surface-hover)", border:"1px solid var(--border-light)",
                    borderRadius:"4px", padding:"1px 6px", fontSize:"12px",
                    fontFamily:"var(--font-mono)", color:"var(--text-muted)",
                  }}>/</kbd>
                  {" "}for commands, or just start writing…
                </p>
              )}
            </>
          );

          // ── SCROLL mode (original) ─────────────────────────────────────
          if (!pageMode) return (
            <div className="flex-1 overflow-y-auto" onClick={closeAll}>
              {localNote.coverImage && (
                <div style={{ width:"100%", height:"180px", overflow:"hidden", position:"relative" }}>
                  <img src={localNote.coverImage} alt="Cover" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 50%, var(--surface))" }} />
                </div>
              )}
              <div className="max-w-2xl mx-auto px-6 py-6 md:px-10 pb-24 md:pb-8">
                {innerContent}
              </div>
            </div>
          );

          // ── PAGE mode — paginated A4 cards ────────────────────────────
          return (
            <div className="flex-1 overflow-y-auto nota-page-canvas" onClick={closeAll}>
              {localNote.coverImage && (
                <div style={{ width:"100%", height:"160px", overflow:"hidden", position:"relative" }}>
                  <img src={localNote.coverImage} alt="Cover" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 50%, #f0ede8)" }} />
                </div>
              )}

              {/* Page counter pill */}
              <div style={{ display:"flex", justifyContent:"center", paddingTop:"16px", paddingBottom:"4px" }}>
                <span style={{
                  fontSize:"10px", color:"var(--text-muted)",
                  background:"rgba(0,0,0,0.06)",
                  borderRadius:"999px", padding:"3px 10px",
                  fontFamily:"var(--font-body)", letterSpacing:"0.04em",
                }}>
                  {pageCount === 1 ? "Page view · A4" : `${pageCount} pages · A4`}
                </span>
              </div>

              {/* First page — contains the editor; grows with content */}
              <div
                ref={pageCardRef}
                className="nota-page-card"
                style={{
                  background: editorBg || "var(--page-card-bg, #ffffff)",
                  // Clamp at exactly one A4 page height — overflow spills into extra pages
                  minHeight: "1122px",
                  maxHeight: pageCount > 1 ? "1122px" : undefined,
                  overflow: pageCount > 1 ? "hidden" : "visible",
                  position: "relative",
                }}
              >
                {innerContent}

                {/* Subtle bottom-of-page rule when content will overflow */}
                {pageCount > 1 && (
                  <div style={{
                    position:"absolute", bottom:0, left:"72px", right:"72px",
                    height:"1px", background:"var(--border)", opacity:0.5,
                  }} />
                )}
              </div>

              {/* Extra pages — rendered as empty continuation sheets */}
              {Array.from({ length: pageCount - 1 }).map((_, i) => (
                <div key={i}>
                  {/* Page separator gap with page number */}
                  <div style={{
                    display:"flex", alignItems:"center", justifyContent:"center",
                    height:"32px", gap:"10px",
                  }}>
                    <div style={{ flex:1, maxWidth:"80px", height:"0.5px", background:"var(--border)", opacity:0.4 }} />
                    <span style={{ fontSize:"9px", color:"var(--text-muted)", fontFamily:"var(--font-body)", opacity:0.7 }}>
                      Page {i + 2}
                    </span>
                    <div style={{ flex:1, maxWidth:"80px", height:"0.5px", background:"var(--border)", opacity:0.4 }} />
                  </div>

                  {/* Continuation page card — empty writing space */}
                  <div className="nota-page-card" style={{
                    background: editorBg || "var(--page-card-bg, #ffffff)",
                    minHeight: "1122px",
                  }}>
                    {/* Faint ruled lines to indicate writeable area */}
                    <div style={{ position:"relative", height:"100%", minHeight:"900px" }}>
                      {Array.from({ length: 28 }).map((_, li) => (
                        <div key={li} style={{
                          position:"absolute",
                          left:0, right:0,
                          top:`${li * 32}px`,
                          height:"0.5px",
                          background:"var(--border)",
                          opacity:0.25,
                        }} />
                      ))}
                      <p style={{
                        position:"absolute", top:"16px", left:0, right:0,
                        textAlign:"center", fontSize:"11px",
                        color:"var(--text-muted)", opacity:0.35,
                        fontFamily:"var(--font-body)", fontStyle:"italic",
                        pointerEvents:"none", userSelect:"none",
                      }}>
                        Continue writing on page {i + 2}…
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ height:"48px" }} />
            </div>
          );
        })()}

        {/* Footer stats */}
        <div className="hidden md:flex items-center px-10 py-1.5 border-t flex-shrink-0"
          style={{ borderColor: "var(--border)", background: editorBg }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
            {wordCount} {wordCount === 1 ? "word" : "words"}
            {editorRef.current?.innerText?.trim()
              ? ` · ${editorRef.current.innerText.trim().length} characters` : ""}
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto", opacity: 0.5 }}>
            {pageMode ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · A4` : "⌘N new · ⌘B sidebar · / commands"}
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

      {/* Image resize overlay — rendered outside contenteditable so it's never saved */}
      {selectedImg && imgRect && (
        <ImageResizer
          img={selectedImg}
          rect={imgRect}
          onResize={updateImgRect}
          onDone={() => { handleContentChange(); updateImgRect(); }}
          onDelete={() => {
            selectedImg.parentNode?.removeChild(selectedImg);
            setSelectedImg(null);
            handleContentChange();
            toast.success("Image deleted");
          }}
          onDeselect={() => setSelectedImg(null)}
        />
      )}

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
              {result.replace(/<[^>]*>/g, " ").replace(/  +/g, " ").trim().slice(0, 300)}{result.length > 300 ? "…" : ""}
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

// ── Image resize + free-move overlay ─────────────────────────────────────────
type HandlePos = "nw"|"n"|"ne"|"e"|"se"|"s"|"sw"|"w";
const HANDLE_CURSORS: Record<HandlePos, string> = {
  nw:"nw-resize", n:"n-resize", ne:"ne-resize", e:"e-resize",
  se:"se-resize", s:"s-resize", sw:"sw-resize", w:"w-resize",
};
const HANDLE_POSITIONS: Record<HandlePos, React.CSSProperties> = {
  nw:{ top:-5, left:-5 }, n:{ top:-5, left:"50%", transform:"translateX(-50%)" },
  ne:{ top:-5, right:-5 }, e:{ top:"50%", right:-5, transform:"translateY(-50%)" },
  se:{ bottom:-5, right:-5 }, s:{ bottom:-5, left:"50%", transform:"translateX(-50%)" },
  sw:{ bottom:-5, left:-5 }, w:{ top:"50%", left:-5, transform:"translateY(-50%)" },
};

function ImageResizer({ img, rect, onResize, onDone, onDelete, onDeselect }: {
  img: HTMLImageElement; rect: DOMRect;
  onResize: () => void; onDone: () => void;
  onDelete: () => void; onDeselect: () => void;
}) {
  const ue  = useEffect;
  const ucb = useCallback;
  const ust = useState;

  const getCurrentTranslate = () => {
    const m = img.style.transform?.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
  };
  const [pos, setPos] = ust(getCurrentTranslate);

  ue(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onDeselect(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onDeselect]);

  const getXY = (ev: MouseEvent | TouchEvent) =>
    "touches" in ev
      ? { x: (ev as TouchEvent).touches[0].clientX, y: (ev as TouchEvent).touches[0].clientY }
      : { x: (ev as MouseEvent).clientX, y: (ev as MouseEvent).clientY };

  // ── Resize ────────────────────────────────────────────────────────────────
  const startResize = ucb((e: React.MouseEvent | React.TouchEvent, handle: HandlePos) => {
    e.preventDefault(); e.stopPropagation();
    const start  = getXY("touches" in e ? (e as React.TouchEvent).nativeEvent : (e as React.MouseEvent).nativeEvent);
    const startW = img.offsetWidth;
    const startH = img.offsetHeight;
    const aspect = startW / startH;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const cur = getXY(ev);
      const dx  = cur.x - start.x;
      const dy  = cur.y - start.y;
      let newW  = startW;
      if      (handle==="se"||handle==="ne"||handle==="e") newW = Math.max(40, startW + dx);
      else if (handle==="sw"||handle==="nw"||handle==="w") newW = Math.max(40, startW - dx);
      else if (handle==="s") newW = Math.max(40, startH + dy) * aspect;
      else if (handle==="n") newW = Math.max(40, startH - dy) * aspect;
      img.style.width    = `${Math.round(newW)}px`;
      img.style.maxWidth = "none";
      img.style.height   = "auto";
      onResize();
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend",  onUp);
      onDone();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend",  onUp);
  }, [img, onResize, onDone]);

  // ── Move ──────────────────────────────────────────────────────────────────
  const startMove = ucb((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); e.stopPropagation();
    const start       = getXY("touches" in e ? (e as React.TouchEvent).nativeEvent : (e as React.MouseEvent).nativeEvent);
    const { x: ox, y: oy } = getCurrentTranslate();
    img.style.float    = "";
    img.style.display  = "inline-block";
    img.style.position = "relative";

    const onMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault();
      const cur = getXY(ev);
      const nx  = ox + (cur.x - start.x);
      const ny  = oy + (cur.y - start.y);
      img.style.transform = `translate(${nx}px, ${ny}px)`;
      setPos({ x: Math.round(nx), y: Math.round(ny) });
      onResize();
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend",  onUp);
      onDone();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend",  onUp);
  }, [img, onResize, onDone]);

  // ── Align ─────────────────────────────────────────────────────────────────
  const setAlign = (align: "left"|"center"|"right") => {
    img.style.transform = ""; img.style.position = "";
    setPos({ x: 0, y: 0 });
    if (align === "left") {
      img.style.float = "left"; img.style.display = "";
      img.style.marginRight = "16px"; img.style.marginLeft = "0"; img.style.marginBottom = "8px";
    } else if (align === "right") {
      img.style.float = "right"; img.style.display = "";
      img.style.marginLeft = "16px"; img.style.marginRight = "0"; img.style.marginBottom = "8px";
    } else {
      img.style.float = ""; img.style.display = "block";
      img.style.marginLeft = "auto"; img.style.marginRight = "auto";
    }
    onDone();
  };

  const HANDLES: HandlePos[] = ["nw","n","ne","e","se","s","sw","w"];
  const moved = pos.x !== 0 || pos.y !== 0;

  return (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:98 }} onMouseDown={onDeselect} />

      {/* Selection border + resize handles */}
      <div style={{ position:"fixed", top:rect.top, left:rect.left, width:rect.width, height:rect.height,
        zIndex:99, pointerEvents:"none", outline:"2px solid #5DCAA5", outlineOffset:"1px", borderRadius:"2px" }}>
        {HANDLES.map(h => (
          <div key={h} style={{ position:"absolute", width:10, height:10, background:"#fff",
            border:"2px solid #5DCAA5", borderRadius:"2px", cursor:HANDLE_CURSORS[h],
            pointerEvents:"all", zIndex:100, ...HANDLE_POSITIONS[h] }}
            onMouseDown={e => startResize(e, h)} onTouchStart={e => startResize(e, h)} />
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ position:"fixed", top:Math.max(8, rect.top - 46), left:Math.max(8, rect.left),
        zIndex:101, display:"flex", alignItems:"center", gap:"2px",
        background:"var(--surface-elevated, #1f1f1f)", border:"1px solid var(--border)",
        borderRadius:"10px", padding:"4px 6px", boxShadow:"0 4px 16px rgba(0,0,0,0.25)",
        pointerEvents:"all", userSelect:"none" as const }}
        onMouseDown={e => e.stopPropagation()}>

        {/* Move grip */}
        <div title="Drag to reposition"
          style={{ padding:"4px 5px", borderRadius:"6px", cursor:"grab", color:"var(--text-muted)",
            display:"flex", alignItems:"center" }}
          onMouseDown={startMove} onTouchStart={startMove}
          onMouseEnter={e => (e.currentTarget.style.background="var(--surface-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
          <GripVertical size={13} />
        </div>
        <div style={{ width:1, height:16, background:"var(--border)", margin:"0 2px" }} />

        {/* Readout */}
        <span style={{ fontSize:"10px", color:"var(--text-muted)", padding:"0 3px", whiteSpace:"nowrap" }}>
          {Math.round(img.offsetWidth)}×{Math.round(img.offsetHeight)}
          {moved && ` · ${pos.x>=0?"+":""}${pos.x}, ${pos.y>=0?"+":""}${pos.y}`}
        </span>
        <div style={{ width:1, height:16, background:"var(--border)", margin:"0 2px" }} />

        {/* Align */}
        {([
          { a:"left",   Icon:ArrowLeftFromLine, title:"Float left"  },
          { a:"center", Icon:ArrowLeftRight,    title:"Center"      },
          { a:"right",  Icon:ArrowRightFromLine,title:"Float right" },
        ] as const).map(({ a, Icon, title }) => (
          <button key={a} onClick={() => setAlign(a)} title={title}
            style={{ padding:"4px 5px", borderRadius:"6px", border:"none", background:"transparent",
              color:"var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center" }}
            onMouseEnter={e => (e.currentTarget.style.background="var(--surface-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
            <Icon size={13} />
          </button>
        ))}
        <div style={{ width:1, height:16, background:"var(--border)", margin:"0 2px" }} />

        {/* Width presets */}
        {[25,50,75,100].map(pct => (
          <button key={pct} onClick={() => {
            img.style.width    = `${Math.round((img.parentElement?.offsetWidth ?? 600) * pct / 100)}px`;
            img.style.maxWidth = "none";
            img.style.height   = "auto";
            onDone();
          }} style={{ padding:"3px 5px", borderRadius:"6px", border:"none", background:"transparent",
            color:"var(--text-secondary)", cursor:"pointer", fontSize:"10px", fontFamily:"var(--font-body)" }}
            onMouseEnter={e => (e.currentTarget.style.background="var(--surface-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
            {pct}%
          </button>
        ))}

        {/* Reset position (only when moved) */}
        {moved && (<>
          <div style={{ width:1, height:16, background:"var(--border)", margin:"0 2px" }} />
          <button onClick={() => { img.style.transform=""; img.style.position=""; setPos({x:0,y:0}); onDone(); }}
            title="Reset position"
            style={{ padding:"3px 6px", borderRadius:"6px", border:"none", background:"transparent",
              color:"var(--text-muted)", cursor:"pointer", fontSize:"11px" }}
            onMouseEnter={e => (e.currentTarget.style.background="var(--surface-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}>↺</button>
        </>)}
        <div style={{ width:1, height:16, background:"var(--border)", margin:"0 2px" }} />

        {/* Delete */}
        <button onClick={onDelete} title="Delete image"
          style={{ padding:"4px 5px", borderRadius:"6px", border:"none", background:"transparent",
            color:"#cc0000", cursor:"pointer", display:"flex", alignItems:"center" }}
          onMouseEnter={e => (e.currentTarget.style.background="rgba(204,0,0,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
          <X size={13} />
        </button>
      </div>
    </>
  );
}
