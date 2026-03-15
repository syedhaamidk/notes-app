"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, X, Check, Sparkles, RotateCcw } from "lucide-react";

interface Props {
  onTranscript: (text: string) => void;
  onClose: () => void;
}

export function VoiceRecorder({ onTranscript, onClose }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "processing" | "done">("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [bars, setBars] = useState<number[]>(Array(28).fill(4));
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [lang, setLang] = useState("en-US");

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const waveRef = useRef<NodeJS.Timeout>();
  const fullText = useRef("");

  useEffect(() => () => stopAll(), []);

  const stopAll = () => {
    recognitionRef.current?.abort();
    clearInterval(timerRef.current);
    clearInterval(waveRef.current);
  };

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Use Chrome or Edge for voice input."); return; }

    fullText.current = "";
    setTranscript(""); setInterim(""); setError(""); setDuration(0); setAiEnhanced(false);
    setState("recording");

    waveRef.current = setInterval(() => {
      setBars(Array(28).fill(0).map(() => Math.random() * 32 + 3));
    }, 80);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;

    r.onresult = (e: any) => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t + " ";
        else int += t;
      }
      if (fin) { fullText.current += fin; setTranscript(fullText.current); }
      setInterim(int);
    };

    r.onerror = (e: any) => {
      if (e.error !== "aborted") setError(`Mic error: ${e.error}`);
      stopRecording();
    };

    r.onend = () => { if (fullText.current) setState("done"); else setState("idle"); };

    recognitionRef.current = r;
    r.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    clearInterval(timerRef.current);
    clearInterval(waveRef.current);
    setBars(Array(28).fill(4));
    setInterim("");
    if (fullText.current.trim()) setState("done");
    else setState("idle");
  };

  const enhanceWithAI = async () => {
    if (!transcript.trim()) return;
    setState("processing");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Clean up this voice transcription. Fix punctuation, capitalization, remove filler words (um, uh, like), fix grammar, and make it read naturally. Keep the meaning exactly the same. Return ONLY the cleaned text, nothing else:\n\n${transcript}`
          }],
        }),
      });
      const data = await res.json();
      const cleaned = data.content?.[0]?.text?.trim();
      if (cleaned) { setTranscript(cleaned); setAiEnhanced(true); }
    } catch { /* silently fail */ }
    setState("done");
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const LANGS = [
    { code: "en-US", label: "English" },
    { code: "hi-IN", label: "Hindi" },
    { code: "es-ES", label: "Spanish" },
    { code: "fr-FR", label: "French" },
    { code: "de-DE", label: "German" },
    { code: "ar-SA", label: "Arabic" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: state === "recording" ? "#dc2626" : "var(--surface-hover)" }}>
              <Mic size={13} style={{ color: state === "recording" ? "white" : "var(--text-muted)" }} />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-body)" }}>
                Voice to Text
              </p>
              <p style={{ fontSize: "11px", color: state === "recording" ? "#dc2626" : "var(--text-muted)" }}>
                {state === "recording" ? `● Recording ${fmt(duration)}` :
                 state === "processing" ? "AI cleaning up…" :
                 state === "done" ? `${transcript.split(/\s+/).filter(Boolean).length} words` :
                 "Tap record to start"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language picker */}
            {state === "idle" && (
              <select value={lang} onChange={e => setLang(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border transition-all"
                style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", outline: "none" }}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            )}
            <button onClick={() => { stopAll(); onClose(); }}
              className="p-1.5 rounded-lg hover:bg-black/5 transition-all">
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        </div>

        {/* Waveform / status */}
        <div className="flex flex-col items-center justify-center py-8 gap-3"
          style={{ background: "var(--bg)", minHeight: "120px" }}>
          {state === "recording" ? (
            <>
              <div className="flex items-end justify-center gap-0.5" style={{ height: "40px" }}>
                {bars.map((h, i) => (
                  <div key={i} style={{
                    width: "3px", height: `${h}px`,
                    background: `rgba(220,38,38,${0.3 + (h / 35) * 0.7})`,
                    borderRadius: "2px",
                    transition: "height 0.07s ease",
                  }} />
                ))}
              </div>
              {interim && (
                <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", maxWidth: "320px", padding: "0 16px" }}>
                  {interim}
                </p>
              )}
            </>
          ) : state === "processing" ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--text)" }} />
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Cleaning up transcript…</span>
            </div>
          ) : state === "done" ? (
            <div className="flex items-center gap-2">
              <Check size={18} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {aiEnhanced ? "✨ AI enhanced" : "Ready to insert"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-end justify-center gap-0.5" style={{ height: "20px" }}>
                {Array(28).fill(0).map((_, i) => (
                  <div key={i} style={{ width: "3px", height: "4px", background: "var(--border)", borderRadius: "2px" }} />
                ))}
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Ready to record</p>
            </div>
          )}
        </div>

        {/* Transcript box */}
        {(transcript || error) && (
          <div className="px-5 pb-4">
            {error ? (
              <p style={{ fontSize: "13px", color: "var(--danger)", padding: "10px 12px", background: "rgba(192,57,43,0.08)", borderRadius: "8px" }}>{error}</p>
            ) : (
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={4}
                className="w-full rounded-xl p-3 text-sm resize-none"
                style={{
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontFamily: "var(--font-display)",
                  fontSize: "14px",
                  lineHeight: "1.7",
                  outline: "none",
                }}
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-5 flex items-center gap-2">
          {state === "idle" && (
            <button onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all hover:opacity-80"
              style={{ background: "#dc2626", color: "white", fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 500 }}>
              <Mic size={15} /> Start Recording
            </button>
          )}

          {state === "recording" && (
            <button onClick={stopRecording}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all hover:opacity-80"
              style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 500 }}>
              <Square size={14} /> Stop
            </button>
          )}

          {state === "done" && (
            <>
              {!aiEnhanced && (
                <button onClick={enhanceWithAI}
                  className="flex items-center gap-1.5 px-3 py-3 rounded-xl transition-all hover:opacity-80"
                  style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", fontSize: "13px" }}
                  title="Clean up with AI">
                  <Sparkles size={13} /> AI Fix
                </button>
              )}
              <button onClick={() => { setState("idle"); setTranscript(""); fullText.current = ""; setAiEnhanced(false); }}
                className="flex items-center gap-1.5 px-3 py-3 rounded-xl transition-all hover:opacity-80"
                style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", fontSize: "13px" }}>
                <RotateCcw size={13} />
              </button>
              <button onClick={() => { onTranscript(transcript.trim()); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all hover:opacity-80"
                style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 500 }}>
                <Check size={14} /> Insert into Note
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
