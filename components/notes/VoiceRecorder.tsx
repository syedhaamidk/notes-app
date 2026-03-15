"use client";
import { useState, useRef, useEffect } from "react";
import { Mic, Square, X, Check, Sparkles, RotateCcw, AlertCircle } from "lucide-react";

interface Props {
  onTranscript: (text: string) => void;
  onClose: () => void;
}

export function VoiceRecorder({ onTranscript, onClose }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "processing" | "done" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [bars, setBars] = useState<number[]>(Array(28).fill(4));
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [lang, setLang] = useState("en-US");
  const [supported, setSupported] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const waveRef = useRef<NodeJS.Timeout>();
  const fullText = useRef("");

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
    setIsMobile(window.innerWidth < 768);
    return () => stopAll();
  }, []);

  const stopAll = () => {
    try { recognitionRef.current?.abort(); } catch {}
    clearInterval(timerRef.current);
    clearInterval(waveRef.current);
  };

  const startRecording = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Use Chrome or Edge for voice input."); setState("error"); return; }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied. Tap the 🔒 icon in your browser address bar and allow microphone access.");
      setState("error");
      return;
    }

    fullText.current = "";
    setTranscript(""); setInterim(""); setError("");
    setDuration(0); setAiEnhanced(false);
    setState("recording");

    waveRef.current = setInterval(() => setBars(Array(28).fill(0).map(() => Math.random() * 32 + 3)), 80);
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
      clearInterval(timerRef.current); clearInterval(waveRef.current);
      setBars(Array(28).fill(4));
      if (e.error === "not-allowed") { setError("Microphone blocked. Allow mic access in browser settings."); setState("error"); }
      else if (e.error === "no-speech") { setError("No speech detected. Check your mic and try again."); setState("error"); }
      else if (e.error !== "aborted") { setError(`Error: ${e.error}. Try refreshing.`); setState("error"); }
    };

    r.onend = () => {
      clearInterval(timerRef.current); clearInterval(waveRef.current);
      setBars(Array(28).fill(4)); setInterim("");
      if (fullText.current.trim()) setState("done");
      else if (state === "recording") setState("idle");
    };

    recognitionRef.current = r;
    try { r.start(); } catch { setError("Could not start. Try refreshing."); setState("error"); }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    clearInterval(timerRef.current); clearInterval(waveRef.current);
    setBars(Array(28).fill(4)); setInterim("");
  };

  const enhanceWithAI = async () => {
    if (!transcript.trim()) return;
    setState("processing");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup", content: transcript }),
      });
      const data = await res.json();
      if (data.result) { setTranscript(data.result); setAiEnhanced(true); }
    } catch {}
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

  const content = (
    <>
      {/* Waveform / status */}
      <div className="flex flex-col items-center justify-center py-6 gap-3"
        style={{ background: "var(--bg)", minHeight: "100px" }}>
        {state === "recording" ? (
          <>
            <div className="flex items-end justify-center gap-0.5" style={{ height: "40px" }}>
              {bars.map((h, i) => (
                <div key={i} style={{ width: "3px", height: `${h}px`, background: `rgba(220,38,38,${0.3 + (h / 35) * 0.7})`, borderRadius: "2px", transition: "height 0.07s ease" }} />
              ))}
            </div>
            {interim && <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", maxWidth: "300px", padding: "0 16px" }}>{interim}</p>}
          </>
        ) : state === "processing" ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--text)" }} />
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Cleaning up…</span>
          </div>
        ) : state === "error" ? (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <AlertCircle size={22} style={{ color: "var(--danger)" }} />
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{error}</p>
          </div>
        ) : state === "done" ? (
          <div className="flex items-center gap-2">
            <Check size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{aiEnhanced ? "✨ AI enhanced" : "Ready to insert"}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-end justify-center gap-0.5">
              {Array(28).fill(0).map((_, i) => <div key={i} style={{ width: "3px", height: "4px", background: "var(--border)", borderRadius: "2px" }} />)}
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{supported ? "Tap record to start" : "Use Chrome or Edge"}</p>
          </div>
        )}
      </div>

      {/* Transcript */}
      {state === "done" && transcript && (
        <div className="px-5 pb-3">
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={isMobile ? 3 : 4}
            className="w-full rounded-xl p-3 resize-none"
            style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-display)", fontSize: "14px", lineHeight: "1.7", outline: "none" }} />
        </div>
      )}

      {!supported && (
        <div className="px-5 pb-3">
          <p className="p-3 rounded-xl" style={{ background: "rgba(192,57,43,0.08)", color: "var(--danger)", fontSize: "13px" }}>
            Use <strong>Chrome</strong> or <strong>Edge</strong>. Firefox doesn't support voice input.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 flex items-center gap-2">
        {(state === "idle" || state === "error") && supported && (
          <button onClick={startRecording}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95"
            style={{ background: "#dc2626", color: "white", fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 500, padding: isMobile ? "14px" : "12px" }}>
            <Mic size={16} /> Start Recording
          </button>
        )}
        {state === "recording" && (
          <button onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95"
            style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 500, padding: isMobile ? "14px" : "12px" }}>
            <Square size={14} /> Stop
          </button>
        )}
        {state === "done" && (
          <>
            {!aiEnhanced && (
              <button onClick={enhanceWithAI}
                className="flex items-center gap-1.5 rounded-xl transition-all active:scale-95"
                style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", fontSize: "13px", padding: isMobile ? "14px 12px" : "12px" }}>
                <Sparkles size={13} /> AI Fix
              </button>
            )}
            <button onClick={() => { setState("idle"); setTranscript(""); fullText.current = ""; setAiEnhanced(false); }}
              className="flex items-center gap-1.5 rounded-xl transition-all active:scale-95"
              style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", padding: isMobile ? "14px 12px" : "12px" }}>
              <RotateCcw size={13} />
            </button>
            <button onClick={() => { onTranscript(transcript.trim()); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95"
              style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 500, padding: isMobile ? "14px" : "12px" }}>
              <Check size={14} /> Insert
            </button>
          </>
        )}
      </div>
    </>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
        <div className="rounded-t-2xl overflow-hidden animate-up" style={{ background: "var(--surface)" }}
          onClick={e => e.stopPropagation()}>
          {/* Handle + header */}
          <div className="flex flex-col items-center pt-3 pb-2">
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "var(--border)", marginBottom: "12px" }} />
            <div className="w-full flex items-center justify-between px-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: state === "recording" ? "#dc2626" : "var(--surface-hover)" }}>
                  <Mic size={13} style={{ color: state === "recording" ? "white" : "var(--text-muted)" }} />
                </div>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-body)" }}>Voice to Text</p>
                  <p style={{ fontSize: "11px", color: state === "recording" ? "#dc2626" : "var(--text-muted)" }}>
                    {state === "recording" ? `● Recording ${fmt(duration)}` : state === "processing" ? "AI cleaning…" : state === "done" ? `${transcript.split(/\s+/).filter(Boolean).length} words` : "Tap record to start"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {state === "idle" && supported && (
                  <select value={lang} onChange={e => setLang(e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", outline: "none" }}>
                    {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                )}
                <button onClick={() => { stopAll(); onClose(); }} className="p-2 rounded-lg">
                  <X size={16} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            </div>
          </div>
          {content}
          {/* Safe area spacer */}
          <div style={{ height: "env(safe-area-inset-bottom)" }} />
        </div>
      </div>
    );
  }

  // Desktop: centered modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale" style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: state === "recording" ? "#dc2626" : "var(--surface-hover)", transition: "background 0.2s" }}>
              <Mic size={13} style={{ color: state === "recording" ? "white" : "var(--text-muted)" }} />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-body)" }}>Voice to Text</p>
              <p style={{ fontSize: "11px", color: state === "recording" ? "#dc2626" : "var(--text-muted)" }}>
                {state === "recording" ? `● Recording ${fmt(duration)}` : state === "processing" ? "AI cleaning…" : state === "done" ? `${transcript.split(/\s+/).filter(Boolean).length} words` : "Tap record to start"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state === "idle" && supported && (
              <select value={lang} onChange={e => setLang(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border"
                style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", outline: "none" }}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            )}
            <button onClick={() => { stopAll(); onClose(); }} className="p-1.5 rounded-lg hover:bg-black/5">
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        </div>
        {content}
      </div>
    </div>
  );
}
