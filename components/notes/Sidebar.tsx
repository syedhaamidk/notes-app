"use client";
import { useState, useEffect } from "react";
import { Tag } from "@/types";
import { signOut } from "next-auth/react";
import {
  FileText, Pin, Archive, Trash2, X, LogOut, Plus,
  ChevronDown, Moon, Sun, Settings, Search
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null };
  tags: Tag[];
  filter: string;
  selectedTag: string | null;
  noteCount: number;
  onFilterChange: (f: string) => void;
  onTagSelect: (name: string) => void;
  onTagsChange: () => void;
  open: boolean;
  onClose: () => void;
  onNewNote: () => void;
}

const TAG_COLORS = ["#6b7280","#1a1916","#1d4ed8","#7c3aed","#db2777","#dc2626","#d97706","#0891b2","#059669"];

export function Sidebar({ user, tags, filter, selectedTag, noteCount, onFilterChange, onTagSelect, onTagsChange, open, onClose, onNewNote }: Props) {
  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    setDarkMode(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    if (res.ok) {
      onTagsChange();
      setNewTagName("");
      setAddingTag(false);
      toast.success("Tag created");
    }
  };

  const handleDeleteTag = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/tags?id=${id}`, { method: "DELETE" });
    onTagsChange();
    toast.success("Tag deleted");
  };

  const NAV_ITEMS = [
    { id: "all", label: "All Notes", icon: FileText, count: noteCount },
    { id: "pinned", label: "Pinned", icon: Pin, count: null },
    { id: "archive", label: "Archive", icon: Archive, count: null },
    { id: "trash", label: "Trash", icon: Trash2, count: null },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      )}

      <aside className={`
        fixed md:relative z-40 md:z-auto flex flex-col h-full
        transition-transform duration-250
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `} style={{ width: "var(--sidebar-width)", background: "var(--bg)", borderRight: "1px solid var(--border)", flexShrink: 0 }}>

        {/* Logo + close */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--text)" }}>
              <span style={{ fontFamily: "var(--font-display)", color: "var(--bg)", fontSize: "12px", lineHeight: 1 }}>n</span>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", letterSpacing: "0.02em", color: "var(--text)" }}>nota</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleDark}
              className="p-1.5 rounded-lg transition-all hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              title={darkMode ? "Light mode" : "Dark mode"}>
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button className="md:hidden p-1.5" onClick={onClose}>
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        </div>

        {/* New note */}
        <div className="px-3 pb-3">
          <button onClick={() => { onNewNote(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80"
            style={{ background: "var(--text)", color: "var(--bg)", fontSize: "13px", fontFamily: "var(--font-body)" }}>
            <Plus size={13} />
            New note
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 overflow-y-auto">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = filter === item.id && !selectedTag;
              return (
                <button key={item.id}
                  onClick={() => { onFilterChange(item.id); onClose(); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all"
                  style={{
                    background: active ? "var(--surface-hover)" : "transparent",
                    color: active ? "var(--text)" : "var(--text-secondary)",
                    fontSize: "13.5px",
                    fontFamily: "var(--font-body)",
                    fontWeight: active ? 500 : 400,
                  }}>
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  <span className="flex-1">{item.label}</span>
                  {active && item.count !== null && item.count > 0 && (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>{item.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "var(--border)", margin: "12px 0 10px" }} />

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between px-2.5 mb-1">
              <button
                className="flex items-center gap-1 text-xs uppercase tracking-widest transition-all"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
                onClick={() => setTagsExpanded(!tagsExpanded)}>
                <ChevronDown size={11} style={{ transition: "transform 0.15s", transform: tagsExpanded ? "rotate(0deg)" : "rotate(-90deg)" }} />
                Tags
              </button>
              <button onClick={() => setAddingTag(true)}
                className="p-1 rounded hover:opacity-60 transition-opacity"
                style={{ color: "var(--text-muted)" }}>
                <Plus size={12} />
              </button>
            </div>

            {tagsExpanded && (
              <div className="space-y-0.5 animate-fade">
                {tags.map(tag => (
                  <button key={tag.id}
                    onClick={() => { onTagSelect(tag.name); onClose(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all group"
                    style={{
                      background: selectedTag === tag.name ? "var(--surface-hover)" : "transparent",
                      color: selectedTag === tag.name ? "var(--text)" : "var(--text-secondary)",
                      fontSize: "13.5px",
                    }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tag.color }} />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {tag._count && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{tag._count.notes}</span>}
                    <button
                      onClick={(e) => handleDeleteTag(tag.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ml-1">
                      <X size={10} style={{ color: "var(--text-muted)" }} />
                    </button>
                  </button>
                ))}

                {addingTag && (
                  <div className="px-2 py-2 animate-fade">
                    <input autoFocus value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddTag(); if (e.key === "Escape") setAddingTag(false); }}
                      placeholder="Tag name"
                      className="w-full px-2 py-1.5 rounded-md text-sm"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-body)", outline: "none" }}
                    />
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {TAG_COLORS.map(c => (
                        <button key={c} onClick={() => setNewTagColor(c)}
                          className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                          style={{ background: c, outline: c === newTagColor ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
                      ))}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <button onClick={handleAddTag}
                        className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
                        style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)" }}>
                        Add
                      </button>
                      <button onClick={() => { setAddingTag(false); setNewTagName(""); }}
                        className="flex-1 py-1.5 rounded-md text-xs"
                        style={{ background: "var(--surface-hover)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {tags.length === 0 && !addingTag && (
                  <button onClick={() => setAddingTag(true)}
                    className="w-full px-2.5 py-1.5 text-left rounded-lg transition-all hover:opacity-70"
                    style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    + Add a tag
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 p-2 rounded-lg group cursor-default">
            {user.image ? (
              <img src={user.image} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                style={{ background: "var(--text)", color: "var(--bg)" }}>
                {user.name?.[0] || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontSize: "12px", fontWeight: 500, color: "var(--text)" }}>{user.name}</p>
            </div>
            <button onClick={() => signOut()}
              className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
              title="Sign out">
              <LogOut size={12} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
