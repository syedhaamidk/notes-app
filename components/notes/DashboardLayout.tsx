"use client";
import { useState, useEffect, useCallback } from "react";
import { Note, Tag } from "@/types";
import { Sidebar } from "./Sidebar";
import { NotesList } from "./NotesList";
import { NoteEditor } from "./NoteEditor";
import { MobileNav } from "./MobileNav";
import { Search, Plus, Menu } from "lucide-react";
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
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  const fetchNotes = useCallback(async () => {
    const params = new URLSearchParams({ filter });
    if (selectedTag) params.set("tag", selectedTag);
    if (search) params.set("search", search);
    const res = await fetch(`/api/notes?${params}`);
    const data = await res.json();
    setNotes(data);
    setLoading(false);
  }, [filter, selectedTag, search]);

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { fetchTags(); }, [fetchTags]);

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", content: "" }),
    });
    const note = await res.json();
    setNotes(prev => [note, ...prev]);
    setSelectedNote(note);
    setMobileView("editor");
    toast.success("Note created");
  };

  const updateNote = async (id: string, data: Partial<Note>) => {
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
    toast.success("Note deleted");
  };

  const trashNote = async (id: string) => {
    await updateNote(id, { isTrashed: true, isPinned: false });
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) { setSelectedNote(null); setMobileView("list"); }
    toast.success("Moved to trash");
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setMobileView("editor");
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <Sidebar
        user={user}
        tags={tags}
        filter={filter}
        selectedTag={selectedTag}
        onFilterChange={(f) => { setFilter(f); setSelectedTag(null); setSelectedNote(null); }}
        onTagSelect={(t) => { setSelectedTag(t); setFilter("all"); setSelectedNote(null); }}
        onTagsChange={fetchTags}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Notes list panel */}
        <div className={`flex flex-col border-r ${mobileView === "editor" ? "hidden md:flex" : "flex"} md:flex`}
          style={{ width: "320px", minWidth: "280px", maxWidth: "380px", borderColor: "var(--border)", background: "var(--surface)" }}>

          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}>
              <Menu size={18} style={{ color: "var(--text-secondary)" }} />
            </button>
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-8 pr-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border-light)",
                  color: "var(--text)",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={createNote}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: "var(--text)", color: "white" }}>
              <Plus size={16} />
            </button>
          </div>

          {/* Notes list */}
          <NotesList
            notes={notes}
            loading={loading}
            selectedNote={selectedNote}
            filter={filter}
            onSelect={handleSelectNote}
            onPin={(id) => updateNote(id, { isPinned: !notes.find(n => n.id === id)?.isPinned })}
            onTrash={trashNote}
            onDelete={deleteNote}
            onRestore={(id) => updateNote(id, { isTrashed: false })}
          />
        </div>

        {/* Editor panel */}
        <div className={`flex-1 overflow-hidden ${mobileView === "list" ? "hidden md:flex" : "flex"} md:flex flex-col`}>
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote}
              tags={tags}
              onUpdate={updateNote}
              onTrash={() => trashNote(selectedNote.id)}
              onDelete={() => deleteNote(selectedNote.id)}
              onBack={() => setMobileView("list")}
              onTagsChange={fetchTags}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "var(--text-muted)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--surface-hover)" }}>
                <span style={{ fontSize: "28px" }}>◈</span>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "17px", color: "var(--text-secondary)" }}>
                Select a note to start
              </p>
              <p style={{ fontSize: "13px" }}>or create a new one</p>
              <button onClick={createNote}
                className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-80"
                style={{ background: "var(--text)", color: "white", fontFamily: "var(--font-body)" }}>
                <Plus size={14} /> New note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav
        mobileView={mobileView}
        onBack={() => setMobileView("list")}
        onNew={createNote}
        hasNote={!!selectedNote}
      />
    </div>
  );
}
