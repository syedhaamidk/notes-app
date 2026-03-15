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
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>();
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
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
  };

  // Real audio waveform using Web Audio API
  const startWaveform = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteFrequencyData(dataArray);
        const newBars = Array(28).fill(0).map((_, i) => {
          const idx = Math.floor((i / 28) * dataArray.length);
          const val = dataArray[idx] || 0;
          return Math.max(4, (val / 255) * 40);
        });
        setBars(newBars);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch {
      // Fallback to random animation
      waveRef.current = setInterval(() => {
        setBars(Array(28).fill(0).map(() => Math.random() * 32 + 3));
      }, 80);
    }
  };

  const startRecording = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Use Chrome or Edge for voice input."); setState("error"); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startWaveform(stream);
    } catch {
      setError("Microphone access denied. Click the 🔒 icon in address bar → allow microphone.");
      setState("error");
      return;
    }

    fullText.current = "";
    setTranscript(""); setInterim(""); setError("");
    setDuration(0); setAiEnhanced(false);
    setState("recording");

    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;
    r.maxAlternatives = 1;

    r.onstart = () => console.log("Speech recognition started");

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
      console.error("Speech error:", e.error);
      if (e.error === "not-allowed") {
        setError("Microphone blocked. Allow mic in browser settings.");
        setState("error");
      } else if (e.error === "no-speech") {
        // Don't error on no-speech, just keep recording
      } else if (e.error === "network") {
        setError("Network error. Speech recognition needs internet.");
        setState("error");
      } else if (e.error !== "aborted") {
        setError(`Error: ${e.error}`);
        setState("error");
      }
    };

    r.onend = () => {
      console.log("Speech ended, transcript:", fullText.current);
      clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearInterval(waveRef.current);
      setBars(Array(28).fill(4));
      setInterim("");
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

      if (fullText.current.trim()) {
        setState("done");
      } else {
        setError("No speech detected. Speak clearly and make sure your mic is working. Try speaking before pressing Stop.");
        setState("error");
      }
    };

    recognitionRef.current = r;
    try {
      r.start();
    } catch (e: any) {
      setError("Could not start. Try refreshing the page.");
      setState("error");
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    clearInterval(waveRef.current);
    setBars(Array(28).fill(4));
    setInterim("");
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
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
      {/* Waveform */}
      <div className="flex flex-col items-center justify-center py-6 gap-3"
        style={{ background: "var(--bg)", minHeight: "100px" }}>
        {state === "recording" ? (
          <>
            <div className="flex items-end justify-center gap-0.5" style={{ height: "44px" }}>
              {bars.map((h, i) => (
                <div key={i} style={{
                  width: "3px", height: `${h}px`,
                  background: `rgba(220,38,38,${0.3 + (h / 40) * 0.7})`,
                  borderRadius: "2px",
                  transition: "height 0.05s ease",
                }} />
              ))}
            </div>
            {interim && (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", maxWidth: "300px", padding: "0 16px" }}>
                {interim}
              </p>
            )}
            {transcript && (
              <p style={{ fontSize: "12px", color: "var(--accent)", textAlign: "center", maxWidth: "300px", padding: "0 16px" }}>
                ✓ {transcript.split(/\s+/).filter(Boolean).length} words captured
              </p>
            )}
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
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {aiEnhanced ? "✨ AI enhanced" : `${transcript.split(/\s+/).filter(Boolean).length} words ready`}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Mic size={24} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {supported ? "Tap record, then speak clearly" : "Use Chrome or Edge browser"}
            </p>
          </div>
        )}
      </div>

      {/* Transcript editor */}
      {(state === "done" || (state === "recording" && transcript)) && transcript && (
        <div className="px-5 pb-3">
          <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Transcript</p>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
            rows={isMobile ? 3 : 4}
            className="w-full rounded-xl p-3 resize-none"
            style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-display)", fontSize: "14px", lineHeight: "1.7", outline: "none" }} />
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
            <Square size={14} /> Stop & Save
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
              className="flex items-center rounded-xl transition-all active:scale-95"
              style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", padding: isMobile ? "14px 12px" : "12px" }}>
              <RotateCcw size={13} />
            </button>
            <button onClick={() => { onTranscript(transcript.trim()); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95"
              style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 500, padding: isMobile ? "14px" : "12px" }}>
              <Check size={14} /> Insert into Note
            </button>
          </>
        )}
      </div>
    </>
  );

  const header = (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{ background: state === "recording" ? "#dc2626" : "var(--surface-hover)" }}>
          <Mic size={14} style={{ color: state === "recording" ? "white" : "var(--text-muted)" }} />
        </div>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-body)" }}>Voice to Text</p>
          <p style={{ fontSize: "11px", color: state === "recording" ? "#dc2626" : "var(--text-muted)" }}>
            {state === "recording" ? `● Recording ${fmt(duration)} — speak now` :
             state === "processing" ? "AI cleaning…" :
             state === "done" ? "Tap Insert to add to note" :
             state === "error" ? "Something went wrong" :
             "Tap record and speak clearly"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {state === "idle" && supported && (
          <select value={lang} onChange={e => setLang(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg"
            style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", outline: "none" }}>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        )}
        <button onClick={() => { stopAll(); onClose(); }} className="p-1.5 rounded-lg hover:bg-black/5">
          <X size={14} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
        <div className="rounded-t-2xl overflow-hidden animate-up" style={{ background: "var(--surface)" }}
          onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-3 pb-1">
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "var(--border)" }} />
          </div>
          {header}
          <div style={{ borderTop: "1px solid var(--border)" }} />
          {content}
          <div style={{ height: "env(safe-area-inset-bottom)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ borderBottom: "1px solid var(--border)" }}>{header}</div>
        {content}
      </div>
    </div>
  );
}
