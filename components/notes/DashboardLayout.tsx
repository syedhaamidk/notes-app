"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Note, Tag } from "@/types";
import { Sidebar } from "./Sidebar";
import { NotesList } from "./NotesList";
import { NoteEditor } from "./NoteEditor";
import { MobileNav } from "./MobileNav";
import { PanelLeftClose, PanelLeftOpen, Search, Plus, Menu } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
}

export function DashboardLayout({ user }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const searchRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<{ insertText: (t: string) => void } | null>(null);

  // Swipe to go back
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Swipe right > 80px and mostly horizontal = go back to list
    if (dx > 80 && dy < 60 && mobileView === "editor") {
      setMobileView("list");
    }
    // Swipe right from left edge = open sidebar
    if (dx > 60 && dy < 60 && touchStartX.current < 30 && mobileView === "list") {
      setSidebarOpen(true);
    }
  };

  const fetchNotes = useCallback(async () => {
    const params = new URLSearchParams({ filter });
    if (selectedTag) params.set("tag", selectedTag);
    if (search) params.set("search", search);
    const res = await fetch(`/api/notes?${params}`);
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filter, selectedTag, search]);

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { fetchTags(); }, [fetchTags]);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      const stored = localStorage.getItem("sidebarCollapsed");
      if (stored === "true") setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebarCollapsed", String(next));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "n") { e.preventDefault(); createNote(); }
        if (e.key === "b") { e.preventDefault(); toggleSidebar(); }
        if (e.key === "f") { e.preventDefault(); searchRef.current?.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sidebarCollapsed]);

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", content: "" }),
    });
    const note = await res.json();
    setNotes(prev => [note, ...prev]);
    setSelectedNote(note);
    setMobileView("editor");
  };

  const updateNote = async (id: string, data: any) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    // Always refresh the full list so filters (pinned/archive/trash) stay in sync
    await fetchNotes();
    if (selectedNote?.id === id) setSelectedNote(updated);
    return updated;
  };

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) { setSelectedNote(null); setMobileView("list"); }
    toast.success("Deleted permanently");
  };

  const trashNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTrashed: true, isPinned: false }),
    });
    await fetchNotes();
    if (selectedNote?.id === id) { setSelectedNote(null); setMobileView("list"); }
    toast.success("Moved to trash");
  };

  const duplicateNote = async () => {
    if (!selectedNote) return;
    const res = await fetch(`/api/notes/${selectedNote.id}/duplicate`, { method: "POST" });
    const copy = await res.json();
    setNotes(prev => [copy, ...prev]);
    setSelectedNote(copy);
    toast.success("Note duplicated");
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>

      {/* Desktop sidebar */}
      <div className="hidden md:block flex-shrink-0" style={{
        width: sidebarCollapsed ? "0px" : "220px",
        overflow: "hidden",
        transition: "width 0.25s ease",
      }}>
        <Sidebar
          user={user} tags={tags} filter={filter} selectedTag={selectedTag}
          noteCount={notes.length}
          onFilterChange={(f) => { setFilter(f); setSelectedTag(null); setSelectedNote(null); }}
          onTagSelect={(t) => { setSelectedTag(t); setFilter("all"); setSelectedNote(null); }}
          onTagsChange={fetchTags}
          open={false} onClose={() => {}}
          onNewNote={createNote}
        />
      </div>

      {/* Mobile sidebar drawer */}
      <Sidebar
        user={user} tags={tags} filter={filter} selectedTag={selectedTag}
        noteCount={notes.length}
        onFilterChange={(f) => { setFilter(f); setSelectedTag(null); setSelectedNote(null); setSidebarOpen(false); }}
        onTagSelect={(t) => { setSelectedTag(t); setFilter("all"); setSelectedNote(null); setSidebarOpen(false); }}
        onTagsChange={fetchTags}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        onNewNote={() => { createNote(); setSidebarOpen(false); }}
        mobileOnly
      />

      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* Notes list */}
        <div className={`flex flex-col border-r flex-shrink-0 ${mobileView === "editor" ? "hidden md:flex" : "flex"}`}
          style={{ width: "100%", maxWidth: "320px", borderColor: "var(--border)", background: "var(--surface)" }}>

          <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <button
              className="flex-shrink-0 p-2 rounded-lg transition-all hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              onClick={() => { if (window.innerWidth < 768) setSidebarOpen(true); else toggleSidebar(); }}>
              {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <Menu size={15} />}
            </button>
            <div className="flex-1 relative min-w-0">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                ref={searchRef} value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-7 pr-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-hover)", border: "1px solid var(--border-light)", color: "var(--text)", fontFamily: "var(--font-body)", outline: "none", fontSize: "14px" }}
              />
            </div>
            <button onClick={createNote}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
              style={{ background: "var(--text)", color: "var(--bg)" }}>
              <Plus size={15} />
            </button>
          </div>

          <NotesList
            notes={notes} loading={loading} selectedNote={selectedNote} filter={filter}
            search={search}
            onSelect={(note) => { setSelectedNote(note); setMobileView("editor"); }}
            onPin={(id) => updateNote(id, { isPinned: !notes.find(n => n.id === id)?.isPinned })}
            onTrash={trashNote} onDelete={deleteNote}
            onRestore={(id) => updateNote(id, { isTrashed: false })}
          />
        </div>

        {/* Editor */}
        <div className={`flex-1 overflow-hidden min-w-0 ${mobileView === "list" ? "hidden md:flex" : "flex"} flex-col`}>
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote} tags={tags}
              onUpdate={updateNote}
              onTrash={() => trashNote(selectedNote.id)}
              onDelete={() => deleteNote(selectedNote.id)}
              onBack={() => setMobileView("list")}
              onTagsChange={fetchTags}
              onDuplicate={duplicateNote}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 pb-20 md:pb-0">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--surface-hover)" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--text-muted)" }}>n</span>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "var(--text-secondary)" }}>No note selected</p>
              <p className="hidden md:block" style={{ fontSize: "12px", color: "var(--text-muted)" }}>⌘N to create · ⌘B to toggle sidebar</p>
              <p className="md:hidden" style={{ fontSize: "12px", color: "var(--text-muted)" }}>Tap + New to start</p>
              <button onClick={createNote}
                className="mt-1 flex items-center gap-2 px-5 py-3 rounded-xl text-sm transition-all hover:opacity-80"
                style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)" }}>
                <Plus size={14} /> New note
              </button>
            </div>
          )}
        </div>
      </div>

      <MobileNav
        mobileView={mobileView}
        onBack={() => setMobileView("list")}
        onNew={createNote}
        hasNote={!!selectedNote}
        onMenuOpen={() => setSidebarOpen(true)}
        onVoiceInsert={(text) => {
          // Find the editor's contenteditable and insert text
          const editor = document.querySelector('.rich-editor') as HTMLElement;
          if (editor) {
            editor.focus();
            document.execCommand('insertText', false, text);
          }
        }}
      />
    </div>
  );
}
