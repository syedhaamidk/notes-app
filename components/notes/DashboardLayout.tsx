"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Note, Tag } from "@/types";
import { Sidebar } from "./Sidebar";
import { NotesList } from "./NotesList";
import { NoteEditor } from "./NoteEditor";
import { MobileNav } from "./MobileNav";
import { PanelLeftClose, PanelLeftOpen, Search, Plus } from "lucide-react";
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

  // Restore sidebar collapse preference
  useEffect(() => {
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebarCollapsed", String(next));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
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
    setNotes(prev => prev.map(n => n.id === id ? updated : n));
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
    await updateNote(id, { isTrashed: true, isPinned: false });
    setNotes(prev => prev.filter(n => n.id !== id));
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
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? "0px" : "220px",
        minWidth: sidebarCollapsed ? "0px" : "220px",
        overflow: "hidden",
        transition: "width 0.25s ease, min-width 0.25s ease",
        flexShrink: 0,
      }}>
        <Sidebar
          user={user} tags={tags} filter={filter} selectedTag={selectedTag}
          noteCount={notes.length}
          onFilterChange={(f) => { setFilter(f); setSelectedTag(null); setSelectedNote(null); }}
          onTagSelect={(t) => { setSelectedTag(t); setFilter("all"); setSelectedNote(null); }}
          onTagsChange={fetchTags}
          open={sidebarOpen} onClose={() => setSidebarOpen(false)}
          onNewNote={createNote}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Notes list panel */}
        <div className={`flex flex-col border-r ${mobileView === "editor" ? "hidden md:flex" : "flex"} md:flex`}
          style={{ width: "300px", minWidth: "260px", maxWidth: "340px", borderColor: "var(--border)", background: "var(--surface)", flexShrink: 0 }}>

          {/* List header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            {/* Sidebar toggle */}
            <button
              onClick={() => { if (window.innerWidth < 768) setSidebarOpen(true); else toggleSidebar(); }}
              className="p-1.5 rounded-lg transition-all hover:opacity-70 flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
              title="Toggle sidebar (⌘B)">
              {sidebarCollapsed
                ? <PanelLeftOpen size={15} />
                : <PanelLeftClose size={15} />}
            </button>

            <div className="flex-1 relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search… (⌘F)"
                className="w-full pl-7 pr-3 py-1.5 rounded-lg text-sm"
                style={{ background: "var(--surface-hover)", border: "1px solid var(--border-light)", color: "var(--text)", fontFamily: "var(--font-body)", outline: "none", fontSize: "13px" }}
              />
            </div>

            <button onClick={createNote}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
              style={{ background: "var(--text)", color: "var(--bg)" }}
              title="New note (⌘N)">
              <Plus size={14} />
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
        <div className={`flex-1 overflow-hidden ${mobileView === "list" ? "hidden md:flex" : "flex"} md:flex flex-col`}>
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
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--surface-hover)" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--text-muted)" }}>n</span>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "var(--text-secondary)" }}>No note selected</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>⌘N to create · ⌘B to toggle sidebar</p>
              <button onClick={createNote}
                className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all hover:opacity-80"
                style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)" }}>
                <Plus size={13} /> New note
              </button>
            </div>
          )}
        </div>
      </div>

      <MobileNav mobileView={mobileView} onBack={() => setMobileView("list")} onNew={createNote} hasNote={!!selectedNote} />
    </div>
  );
}
