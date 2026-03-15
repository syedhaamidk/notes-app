"use client";
import { ArrowLeft, Plus, Mic, Menu, PenLine } from "lucide-react";
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
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          padding: "10px 16px",
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
          gap: "10px",
        }}>

        {mobileView === "list" ? (
          // List view bottom bar
          <>
            <button
              onClick={onMenuOpen}
              style={{
                width: "42px", height: "42px",
                borderRadius: "12px",
                background: "var(--surface-hover)",
                border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-secondary)", cursor: "pointer",
              }}>
              <Menu size={18} />
            </button>

            <button
              onClick={onNew}
              style={{
                flex: 1, height: "42px",
                borderRadius: "12px",
                background: "var(--text)",
                border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                color: "var(--bg)",
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 500,
                cursor: "pointer",
              }}>
              <Plus size={16} /> New note
            </button>
          </>
        ) : (
          // Editor view bottom bar
          <>
            <button
              onClick={onBack}
              style={{
                height: "42px", padding: "0 14px",
                borderRadius: "12px",
                background: "var(--surface-hover)",
                border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)", fontSize: "14px",
                cursor: "pointer", whiteSpace: "nowrap",
              }}>
              <ArrowLeft size={15} /> Notes
            </button>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setShowVoice(true)}
                style={{
                  width: "42px", height: "42px",
                  borderRadius: "12px",
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-secondary)", cursor: "pointer",
                }}
                title="Voice to text">
                <Mic size={17} />
              </button>

              <button
                onClick={onNew}
                style={{
                  width: "42px", height: "42px",
                  borderRadius: "12px",
                  background: "var(--text)",
                  border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--bg)", cursor: "pointer",
                }}
                title="New note">
                <PenLine size={17} />
              </button>
            </div>
          </>
        )}
      </div>

      {showVoice && (
        <VoiceRecorder
          onTranscript={(text) => {
            onVoiceInsert?.(text);
            setShowVoice(false);
          }}
          onClose={() => setShowVoice(false)}
        />
      )}
    </>
  );
}
