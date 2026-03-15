"use client";
import { useState, useRef, useEffect } from "react";
import { Mic, Square, X, Check, Sparkles, RotateCcw, AlertCircle } from "lucide-react";

interface Props {
  onTranscript: (text: string) => void;
  onClose: () => void;
}

export function VoiceRecorder({ onTranscript, onClose }: Props) {
  const [state, setState] = useState<"idle"|"recording"|"processing"|"done"|"error">("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [bars, setBars] = useState<number[]>(Array(28).fill(4));
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [lang, setLang] = useState("en-US");
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<"native"|"whisper">("native");
  const [hasNative, setHasNative] = useState(true);

  const recogRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream|null>(null);
  const audioCtxRef = useRef<AudioContext|null>(null);
  const animRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const waveRef = useRef<NodeJS.Timeout>();
  const fullText = useRef("");

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setHasNative(false); setMode("whisper"); }
    setIsMobile(window.innerWidth < 768);
    return () => cleanup();
  }, []);

  const cleanup = () => {
    try { recogRef.current?.abort(); } catch {}
    try { recorderRef.current?.stop(); } catch {}
    clearInterval(timerRef.current);
    clearInterval(waveRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
  };

  const startWaveform = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      const arr = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(arr);
        setBars(Array(28).fill(0).map((_, i) => Math.max(4, (arr[Math.floor(i/28*arr.length)]||0)/255*40)));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      waveRef.current = setInterval(() => setBars(Array(28).fill(0).map(() => Math.random()*30+4)), 80);
    }
  };

  const stopWaveform = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    clearInterval(waveRef.current);
    setBars(Array(28).fill(4));
  };

  const getMic = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = s;
    return s;
  };

  // ── Native Web Speech API ──
  const startNative = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    try { const s = await getMic(); startWaveform(s); }
    catch { setError("Microphone denied. Allow mic in browser settings then try again."); setState("error"); return; }

    fullText.current = "";
    setTranscript(""); setInterim(""); setError(""); setDuration(0); setAiEnhanced(false);
    setState("recording");
    timerRef.current = setInterval(() => setDuration(d => d+1), 1000);

    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = lang;

    r.onresult = (e: any) => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
        else int += e.results[i][0].transcript;
      }
      if (fin) { fullText.current += fin; setTranscript(fullText.current); }
      setInterim(int);
    };

    r.onerror = (e: any) => {
      if (e.error === "not-allowed") { setError("Microphone blocked. Click 🔒 in address bar → allow mic."); setState("error"); }
      else if (e.error === "network") { setError("Network error. Speech API needs internet."); setState("error"); }
      else if (e.error !== "aborted" && e.error !== "no-speech") { setError(`Error: ${e.error}`); setState("error"); }
    };

    r.onend = () => {
      clearInterval(timerRef.current); stopWaveform(); setInterim("");
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (fullText.current.trim()) setState("done");
      else { setError("No speech detected. Speak clearly and try again."); setState("error"); }
    };

    recogRef.current = r;
    r.start();
  };

  // ── Whisper (all browsers) ──
  const startWhisper = async () => {
    let stream: MediaStream;
    try { stream = await getMic(); startWaveform(stream); }
    catch { setError("Microphone denied. Allow mic in browser settings then try again."); setState("error"); return; }

    chunksRef.current = [];
    setTranscript(""); setError(""); setDuration(0); setAiEnhanced(false);
    setState("recording");
    timerRef.current = setInterval(() => setDuration(d => d+1), 1000);

    const mime = ["audio/webm","audio/mp4","audio/ogg"].find(t => MediaRecorder.isTypeSupported(t)) || "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recorderRef.current = rec;

    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    rec.onstop = async () => {
      clearInterval(timerRef.current); stopWaveform();
      stream.getTracks().forEach(t => t.stop());

      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      if (blob.size < 500) { setError("Recording too short — speak for at least 2 seconds."); setState("error"); return; }

      setState("processing");
      try {
        const fd = new FormData();
        fd.append("audio", blob, "rec.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const data = await res.json();
        if (data.text?.trim()) { setTranscript(data.text.trim()); setState("done"); }
        else { setError(data.error || "Could not transcribe. Try speaking louder."); setState("error"); }
      } catch (e: any) {
        setError("Request failed: " + (e.message || "unknown error"));
        setState("error");
      }
    };

    rec.start();
  };

  const start = () => mode === "native" ? startNative() : startWhisper();

  const stop = () => {
    if (mode === "native") recogRef.current?.stop();
    else recorderRef.current?.stop();
    clearInterval(timerRef.current); stopWaveform();
  };

  const enhanceAI = async () => {
    setState("processing");
    try {
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup", content: transcript }),
      });
      const d = await res.json();
      if (d.result) { setTranscript(d.result); setAiEnhanced(true); }
    } catch {}
    setState("done");
  };

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const LANGS = [
    { code:"en-US",label:"English" }, { code:"hi-IN",label:"Hindi" },
    { code:"es-ES",label:"Spanish" }, { code:"fr-FR",label:"French" },
    { code:"de-DE",label:"German" },  { code:"ar-SA",label:"Arabic" },
  ];

  const pad = isMobile ? "14px" : "11px 16px";

  const body = (
    <div>
      {/* Mode switcher */}
      {state === "idle" && (
        <div className="flex gap-2 px-5 pb-3">
          <button onClick={() => setMode("native")} disabled={!hasNative}
            className="flex-1 py-2 rounded-xl text-xs transition-all"
            style={{ background: mode==="native"?"var(--text)":"var(--surface-hover)", color: mode==="native"?"var(--bg)":"var(--text-muted)", border:"1px solid var(--border)", fontFamily:"var(--font-body)", opacity: hasNative?1:0.4, cursor: hasNative?"pointer":"not-allowed" }}>
            Live {!hasNative && "(Chrome only)"}
          </button>
          <button onClick={() => setMode("whisper")}
            className="flex-1 py-2 rounded-xl text-xs transition-all"
            style={{ background: mode==="whisper"?"var(--text)":"var(--surface-hover)", color: mode==="whisper"?"var(--bg)":"var(--text-muted)", border:"1px solid var(--border)", fontFamily:"var(--font-body)" }}>
            Whisper AI ✦ All browsers
          </button>
        </div>
      )}

      {/* Waveform / status */}
      <div style={{ background:"var(--bg)", minHeight:"90px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"8px", padding:"20px" }}>
        {state === "recording" && (
          <>
            <div style={{ display:"flex", alignItems:"flex-end", gap:"2px", height:"44px" }}>
              {bars.map((h,i) => (
                <div key={i} style={{ width:"3px", height:`${h}px`, background:`rgba(220,38,38,${0.3+(h/40)*0.7})`, borderRadius:"2px", transition:"height 0.06s ease" }} />
              ))}
            </div>
            {mode==="whisper" && <p style={{ fontSize:"11px", color:"var(--text-muted)" }}>Recording… tap Stop & Save when done</p>}
            {interim && <p style={{ fontSize:"13px", color:"var(--text-muted)", fontStyle:"italic", textAlign:"center", maxWidth:"300px" }}>{interim}</p>}
            {transcript && <p style={{ fontSize:"11px", color:"var(--accent)" }}>✓ {transcript.split(/\s+/).filter(Boolean).length} words captured</p>}
          </>
        )}
        {state === "processing" && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"20px", height:"20px", borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--text)", animation:"spin 0.8s linear infinite" }} />
            <span style={{ fontSize:"13px", color:"var(--text-secondary)" }}>{mode==="whisper"?"Transcribing with Whisper AI…":"Processing…"}</span>
          </div>
        )}
        {state === "error" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", textAlign:"center", padding:"0 16px" }}>
            <AlertCircle size={22} style={{ color:"var(--danger)" }} />
            <p style={{ fontSize:"13px", color:"var(--text-secondary)", lineHeight:"1.5" }}>{error}</p>
          </div>
        )}
        {state === "done" && (
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <Check size={18} style={{ color:"var(--accent)" }} />
            <span style={{ fontSize:"13px", color:"var(--text-secondary)" }}>{aiEnhanced?"✨ AI enhanced":"Ready to insert"}</span>
          </div>
        )}
        {state === "idle" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
            <Mic size={24} style={{ color:"var(--text-muted)", opacity:0.3 }} />
            <p style={{ fontSize:"12px", color:"var(--text-muted)", textAlign:"center" }}>
              {mode==="whisper" ? "Works in Opera, Firefox & all browsers" : "Live transcription as you speak"}
            </p>
          </div>
        )}
      </div>

      {/* Transcript editor */}
      {transcript && (state==="done"||state==="recording") && (
        <div style={{ padding:"0 20px 12px" }}>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={3}
            style={{ width:"100%", background:"var(--surface-hover)", border:"1px solid var(--border)", borderRadius:"12px", padding:"12px", color:"var(--text)", fontFamily:"var(--font-display)", fontSize:"14px", lineHeight:"1.7", outline:"none", resize:"none", boxSizing:"border-box" }} />
        </div>
      )}

      {/* Buttons */}
      <div style={{ display:"flex", gap:"8px", padding:"0 20px 20px" }}>
        {(state==="idle"||state==="error") && (
          <button onClick={start} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", padding:pad, background:"#dc2626", color:"white", border:"none", borderRadius:"12px", fontFamily:"var(--font-body)", fontSize:"15px", fontWeight:500, cursor:"pointer" }}>
            <Mic size={16} /> Start Recording
          </button>
        )}
        {state==="recording" && (
          <button onClick={stop} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", padding:pad, background:"var(--text)", color:"var(--bg)", border:"none", borderRadius:"12px", fontFamily:"var(--font-body)", fontSize:"15px", fontWeight:500, cursor:"pointer" }}>
            <Square size={14} /> Stop & Save
          </button>
        )}
        {state==="done" && (
          <>
            {!aiEnhanced && (
              <button onClick={enhanceAI} style={{ display:"flex", alignItems:"center", gap:"6px", padding:pad, background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:"12px", fontFamily:"var(--font-body)", fontSize:"13px", cursor:"pointer" }}>
                <Sparkles size={13} /> AI Fix
              </button>
            )}
            <button onClick={() => { setState("idle"); setTranscript(""); fullText.current=""; setAiEnhanced(false); }}
              style={{ display:"flex", alignItems:"center", padding:pad, background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:"12px", cursor:"pointer" }}>
              <RotateCcw size={13} />
            </button>
            <button onClick={() => { onTranscript(transcript.trim()); onClose(); }}
              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", padding:pad, background:"var(--text)", color:"var(--bg)", border:"none", borderRadius:"12px", fontFamily:"var(--font-body)", fontSize:"15px", fontWeight:500, cursor:"pointer" }}>
              <Check size={14} /> Insert into Note
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const header = (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"32px", height:"32px", borderRadius:"10px", background:state==="recording"?"#dc2626":"var(--surface-hover)", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }}>
          <Mic size={14} style={{ color:state==="recording"?"white":"var(--text-muted)" }} />
        </div>
        <div>
          <p style={{ fontSize:"14px", fontWeight:500, color:"var(--text)", fontFamily:"var(--font-body)", margin:0 }}>Voice to Text</p>
          <p style={{ fontSize:"11px", color:state==="recording"?"#dc2626":"var(--text-muted)", margin:0 }}>
            {state==="recording" ? `● Recording ${fmt(duration)}` :
             state==="processing" ? "Transcribing…" :
             state==="done" ? "Tap Insert to add to note" :
             state==="error" ? "Something went wrong" : "Tap record to start"}
          </p>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        {state==="idle" && mode==="native" && hasNative && (
          <select value={lang} onChange={e => setLang(e.target.value)}
            style={{ fontSize:"11px", padding:"4px 8px", borderRadius:"8px", background:"var(--surface-hover)", border:"1px solid var(--border)", color:"var(--text-secondary)", fontFamily:"var(--font-body)", outline:"none" }}>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        )}
        <button onClick={() => { cleanup(); onClose(); }} style={{ padding:"6px", borderRadius:"8px", background:"none", border:"none", cursor:"pointer", display:"flex" }}>
          <X size={15} style={{ color:"var(--text-muted)" }} />
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", flexDirection:"column", justifyContent:"flex-end", background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)" }}>
        <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0" }} onClick={e => e.stopPropagation()}>
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
            <div style={{ width:"36px", height:"4px", borderRadius:"2px", background:"var(--border)" }} />
          </div>
          <div style={{ borderBottom:"1px solid var(--border)" }}>{header}</div>
          {body}
          <div style={{ height:"env(safe-area-inset-bottom)" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div style={{ width:"100%", maxWidth:"440px", background:"var(--surface)", borderRadius:"20px", overflow:"hidden", boxShadow:"var(--shadow-lg)" }}>
        <div style={{ borderBottom:"1px solid var(--border)" }}>{header}</div>
        {body}
      </div>
    </div>
  );
}
