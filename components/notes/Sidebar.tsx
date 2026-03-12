"use client";
import { useState } from "react";
import { Tag } from "@/types";
import { signOut } from "next-auth/react";
import {
  FileText, Pin, Archive, Trash2, Tag as TagIcon,
  X, LogOut, Plus, Hash, ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null };
  tags: Tag[];
  filter: string;
  selectedTag: string | null;
  onFilterChange: (f: string) => void;
  onTagSelect: (name: string) => void;
  onTagsChange: () => void;
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { id: "all", label: "All Notes", icon: FileText },
  { id: "pinned", label: "Pinned", icon: Pin },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "trash", label: "Trash", icon: Trash2 },
];

const TAG_COLORS = ["#6b7280","#2d6a4f","#1d4ed8","#7c3aed","#db2777","#dc2626","#d97706","#0891b2"];

export function Sidebar({ user, tags, filter, selectedTag, onFilterChange, onTagSelect, onTagsChange, open, onClose }: Props) {
  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[1]);
  const [tagsExpanded, setTagsExpanded] = useState(true);

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
  };

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={onClose} />
      )}

      <aside className={`
        fixed md:relative z-40 md:z-auto flex flex-col h-full
        transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `} style={{ width: "240px", background: "var(--bg)", borderRight: "1px solid var(--border)" }}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--text)" }}>
              <span style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "14px" }}>n</span>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", letterSpacing: "0.02em" }}>nota</span>
          </div>
          <button className="md:hidden p-1" onClick={onClose}>
            <X size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = filter === item.id && !selectedTag;
              return (
                <button key={item.id}
                  onClick={() => { onFilterChange(item.id); onClose(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all"
                  style={{
                    background: active ? "var(--accent-light)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: "14px",
                    fontFamily: "var(--font-body)",
                  }}>
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Tags section */}
          <div className="mt-5">
            <div className="flex items-center justify-between px-3 mb-1">
              <button
                className="flex items-center gap-1.5 text-xs uppercase tracking-wider transition-all"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
                onClick={() => setTagsExpanded(!tagsExpanded)}>
                <ChevronDown size={12} className={`transition-transform ${tagsExpanded ? "" : "-rotate-90"}`} />
                Tags
              </button>
              <button onClick={() => setAddingTag(true)} className="p-1 rounded hover:opacity-60">
                <Plus size={13} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            {tagsExpanded && (
              <div className="space-y-0.5 animate-fade">
                {tags.map(tag => (
                  <button key={tag.id}
                    onClick={() => { onTagSelect(tag.name); onClose(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-all group"
                    style={{
                      background: selectedTag === tag.name ? "var(--surface-hover)" : "transparent",
                      color: selectedTag === tag.name ? "var(--text)" : "var(--text-secondary)",
                      fontSize: "14px",
                    }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tag.color }} />
                    <span className="flex-1 truncate">{tag.name}</span>
                    <button
                      onClick={(e) => handleDeleteTag(tag.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity">
                      <X size={11} style={{ color: "var(--text-muted)" }} />
                    </button>
                  </button>
                ))}

                {addingTag && (
                  <div className="px-3 py-2 animate-fade">
                    <input
                      autoFocus
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddTag(); if (e.key === "Escape") setAddingTag(false); }}
                      placeholder="Tag name"
                      className="w-full px-2 py-1.5 rounded-md text-sm"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        fontFamily: "var(--font-body)",
                        outline: "none",
                      }}
                    />
                    <div className="flex gap-1.5 mt-2">
                      {TAG_COLORS.map(c => (
                        <button key={c} onClick={() => setNewTagColor(c)}
                          className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                          style={{ background: c, outline: c === newTagColor ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleAddTag}
                        className="flex-1 py-1 rounded text-xs transition-all"
                        style={{ background: "var(--text)", color: "white", fontFamily: "var(--font-body)" }}>
                        Add
                      </button>
                      <button onClick={() => setAddingTag(false)}
                        className="flex-1 py-1 rounded text-xs"
                        style={{ background: "var(--surface-hover)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {tags.length === 0 && !addingTag && (
                  <p className="px-3 py-1.5 text-xs" style={{ color: "var(--text-muted)" }}>No tags yet</p>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* User */}
        <div className="px-3 pb-4 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg group">
            {user.image ? (
              <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{ background: "var(--accent)", color: "white" }}>
                {user.name?.[0] || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{user.name}</p>
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user.email}</p>
            </div>
            <button onClick={() => signOut()} className="opacity-0 group-hover:opacity-100 p-1 transition-opacity">
              <LogOut size={13} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
