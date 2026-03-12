"use client";
import { ArrowLeft, Plus } from "lucide-react";

interface Props {
  mobileView: "list" | "editor";
  onBack: () => void;
  onNew: () => void;
  hasNote: boolean;
}

export function MobileNav({ mobileView, onBack, onNew, hasNote }: Props) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-3 pb-safe border-t z-20"
      style={{ background: "var(--surface)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}>
      {mobileView === "editor" && hasNote ? (
        <button onClick={onBack} className="flex items-center gap-2 py-2 px-3 rounded-xl text-sm transition-all"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          <ArrowLeft size={16} /> Notes
        </button>
      ) : (
        <div />
      )}
      <button onClick={onNew}
        className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm transition-all hover:opacity-80"
        style={{ background: "var(--text)", color: "white", fontFamily: "var(--font-body)" }}>
        <Plus size={15} /> New Note
      </button>
    </div>
  );
}
