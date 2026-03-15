"use client";
import { useState, useRef, useEffect } from "react";
import { Mic, Square, X, Check, Sparkles, RotateCcw, AlertCircle, Upload } from "lucide-react";

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
  const [isMobile, setIsMobile] = useState(false);
  // native = Web Speech API, whisper = Groq Whisper (all browsers)
  const [mode, setMode] = useState<"native" | "whisper">("native");

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const waveRef = useRef<NodeJS.Timeout>();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>();
  const fullText = useRef("");

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    // Check if Web Speech API is supported
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setMode("whisper");
    return () => stopAll();
  }, []);

  const stopAll = () => {
    try { recognitionRef.current?.abort(); } catch {}
    try { mediaRecorderRef.current?.stop(); } catch {}
    clearInterval(timerRef.current);
    clearInterval(waveRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
  };

  const startWaveform = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteFrequencyData(dataArray);
        setBars(Array(28).fill(0).map((_, i) => {
          const val = dataArray[Math.floor((i / 28) * dataArray.length)] || 0;
          return Math.max(4, (val / 255) * 40);
        }));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch {
      waveRef.current = setInterval(() => setBars(Array(28).fill(0).map(() => Math.random() * 32 + 3)), 80);
    }
  };

  const getMic = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  };

  // Native Web Speech API recording
  const startNative = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let stream: MediaStream;
    try { stream = await getMic(); startWaveform(stream); }
    catch { setError("Mic access denied. Allow microphone in browser settings."); setState("error"); return; }

    fullText.current = "";
    setTranscript(""); setInterim(""); setError(""); setDuration(0); setAiEnhanced(false);
    setState("recording");
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = lang;

    r.onresult = (e: any) => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t + " "; else int += t;
      }
      if (fin) { fullText.current += fin; setTranscript(fullText.current); }
      setInterim(int);
    };

    r.onerror = (e: any) => {
      if (e.error === "not-allowed") { setError("Mic blocked. Allow in browser settings."); setState("error"); }
      else if (e.error === "no-speech") { /* keep recording */ }
      else if (e.error !== "aborted") { setError(`Error: ${e.error}`); setState("error"); }
    };

    r.onend = () => {
      clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearInterval(waveRef.current);
      setBars(Array(28).fill(4)); setInterim("");
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (fullText.current.trim()) setState("done");
      else { setError("No speech detected. Speak clearly and try again."); setState("error"); }
    };

    recognitionRef.current = r;
    try { r.start(); } catch { setError("Could not start. Try refreshing."); setState("error"); }
  };

  // Whisper recording (works in ALL browsers)
  const startWhisper = async () => {
    let stream: MediaStream;
    try { stream = await getMic(); startWaveform(stream); }
    catch { setError("Mic access denied. Allow microphone in browser settings."); setState("error"); return; }

    audioChunksRef.current = [];
    setTranscript(""); setInterim(""); setError(""); setDuration(0); setAiEnhanced(false);
    setState("recording");
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/ogg";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

    recorder.onstop = async () => {
      clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearInterval(waveRef.current);
      setBars(Array(28).fill(4));
      stream.getTracks().forEach(t => t.stop());

      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      if (audioBlob.size < 1000) {
        setError("Recording too short. Hold the button and speak for a few seconds.");
        setState("error"); return;
      }

      setState("processing");
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const data = await res.json();
        if (data.text) { setTranscript(data.text); setState("done"); }
        else { setError(data.error || "Transcription failed"); setState("error"); }
      } catch { setError("Network error. Check connection."); setState("error"); }
    };

    recorder.start();
  };

  const startRecording = () => mode === "native" ? startNative() : startWhisper();

  const stopRecording = () => {
    if (mode === "native") {
      recognitionRef.current?.stop();
    } else {
      mediaRecorderRef.current?.stop();
    }
    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    clearInterval(waveRef.current);
    setBars(Array(28).fill(4)); setInterim("");
  };

  const enhanceWithAI = async () => {
    if (!transcript.trim()) return;
    setState("processing");
    try {
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup", content: transcript }),
      });
      const data = await res.json();
      if (data.result) { setTranscript(data.result); setAiEnhanced(true); }
    } catch {}
    setState("done");
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const LANGS = [
    { code: "en-US", label: "English" }, { code: "hi-IN", label: "Hindi" },
    { code: "es-ES", label: "Spanish" }, { code: "fr-FR", label: "French" },
    { code: "de-DE", label: "German" }, { code: "ar-SA", label: "Arabic" },
  ];

  const content = (
    <>
      {/* Mode toggle */}
      {state === "idle" && (
        <div className="flex items-center justify-center gap-2 px-5 pb-3">
          <button onClick={() => setMode("native")}
            className="flex-1 py-2 rounded-xl text-xs transition-all"
            style={{ background: mode === "native" ? "var(--text)" : "var(--surface-hover)", color: mode === "native" ? "var(--bg)" : "var(--text-muted)", fontFamily: "var(--font-body)", border: "1px solid var(--border)" }}>
            Live (Chrome/Edge)
          </button>
          <button onClick={() => setMode("whisper")}
            className="flex-1 py-2 rounded-xl text-xs transition-all"
            style={{ background: mode === "whisper" ? "var(--text)" : "var(--surface-hover)", color: mode === "whisper" ? "var(--bg)" : "var(--text-muted)", fontFamily: "var(--font-body)", border: "1px solid var(--border)" }}>
            Whisper AI (All browsers)
          </button>
        </div>
      )}

      {/* Waveform */}
      <div className="flex flex-col items-center justify-center py-5 gap-3" style={{ background: "var(--bg)", minHeight: "90px" }}>
        {state === "recording" ? (
          <>
            <div className="flex items-end justify-center gap-0.5" style={{ height: "44px" }}>
              {bars.map((h, i) => (
                <div key={i} style={{ width: "3px", height: `${h}px`, background: `rgba(220,38,38,${0.3 + (h / 40) * 0.7})`, borderRadius: "2px", transition: "height 0.05s ease" }} />
              ))}
            </div>
            {mode === "whisper" && <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Recording… tap Stop when done</p>}
            {interim && <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", maxWidth: "300px", padding: "0 16px" }}>{interim}</p>}
            {transcript && <p style={{ fontSize: "11px", color: "var(--accent)" }}>✓ {transcript.split(/\s+/).filter(Boolean).length} words</p>}
          </>
        ) : state === "processing" ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--text)" }} />
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{mode === "whisper" ? "Transcribing with Whisper AI…" : "Processing…"}</span>
          </div>
        ) : state === "error" ? (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <AlertCircle size={20} style={{ color: "var(--danger)" }} />
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{error}</p>
          </div>
        ) : state === "done" ? (
          <div className="flex items-center gap-2">
            <Check size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{aiEnhanced ? "✨ AI enhanced" : `${transcript.split(/\s+/).filter(Boolean).length} words ready`}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Mic size={22} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
              {mode === "whisper" ? "Works in all browsers via Whisper AI" : "Live transcription via Web Speech API"}
            </p>
          </div>
        )}
      </div>

      {/* Transcript */}
      {transcript && (state === "done" || state === "recording") && (
        <div className="px-5 pb-3">
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={3}
            className="w-full rounded-xl p-3 resize-none"
            style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-display)", fontSize: "14px", lineHeight: "1.7", outline: "none" }} />
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 flex items-center gap-2">
        {(state === "idle" || state === "error") && (
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
              style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: isMobile ? "14px 12px" : "12px" }}>
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
            {state === "recording" ? `● Recording ${fmt(duration)}` :
             state === "processing" ? "Transcribing…" :
             state === "done" ? "Tap Insert to add to note" :
             state === "error" ? "Something went wrong" : "Tap record to start"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {state === "idle" && mode === "native" && (
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
        <div className="rounded-t-2xl overflow-hidden animate-up" style={{ background: "var(--surface)" }} onClick={e => e.stopPropagation()}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden animate-scale" style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ borderBottom: "1px solid var(--border)" }}>{header}</div>
        {content}
      </div>
    </div>
  );
}
