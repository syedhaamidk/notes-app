"use client";
import { ArrowLeft, Plus, Mic, Menu } from "lucide-react";
import { useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";

interface Props {
  mobileView: "list" | "editor";
  onBack: () => void;
  onNew: () => void;
  hasNote: boolean;
  onVoiceInsert?: (text: string) => void;
  onMenuOpen?: () => void;
}

export function MobileNav({ mobileView, onBack, onNew, hasNote, onVoiceInsert, onMenuOpen }: Props) {
  const [showVoice, setShowVoice] = useState(false);

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 pb-safe border-t z-20"
        style={{ background: "var(--surface)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}>

        {/* Left side */}
        <div className="flex items-center gap-2">
          {mobileView === "editor" && hasNote ? (
            <button onClick={onBack}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", fontSize: "14px" }}>
              <ArrowLeft size={16} /> Notes
            </button>
          ) : (
            <button onClick={onMenuOpen}
              className="p-2.5 rounded-xl"
              style={{ color: "var(--text-secondary)", background: "var(--surface-hover)" }}>
              <Menu size={17} />
            </button>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Voice button - always visible */}
          {mobileView === "editor" && hasNote && (
            <button onClick={() => setShowVoice(true)}
              className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all"
              style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}>
              <Mic size={16} />
            </button>
          )}

          <button onClick={onNew}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl transition-all hover:opacity-80"
            style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 500 }}>
            <Plus size={15} /> New
          </button>
        </div>
      </div>

      {showVoice && (
        <VoiceRecorder
          onTranscript={(text) => { onVoiceInsert?.(text); }}
          onClose={() => setShowVoice(false)}
        />
      )}
    </>
  );
}
