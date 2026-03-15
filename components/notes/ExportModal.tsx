"use client";
import { useState, useRef, useEffect } from "react";
import { Note } from "@/types";
import { X, Download, Upload, Sparkles, ChevronDown, ChevronUp, Eye, Settings } from "lucide-react";
import { format as dateFns } from "date-fns";
import toast from "react-hot-toast";
import React from "react";

interface Props { note: Note; onClose: () => void; }
type Template = "minimal" | "journal" | "dark" | "pastel" | "elegant" | "custom";
type LayoutTemplate = "none" | "grid" | "lined" | "bullet" | "cornell" | "weekly";
type ExportFormat = "pdf" | "png" | "txt" | "md";

const TEMPLATES: { id: Template; label: string; desc: string; preview: string }[] = [
  { id: "minimal",  label: "Minimal",        desc: "Clean white, generous space",  preview: "linear-gradient(145deg,#ffffff,#f8f8f6)" },
  { id: "journal",  label: "Warm Journal",   desc: "Cozy cream & serif vibes",     preview: "linear-gradient(145deg,#fdf6e3,#f5e6c8)" },
  { id: "dark",     label: "Dark Editorial", desc: "Bold, dramatic, minimal",      preview: "linear-gradient(145deg,#1a1916,#2d2a24)" },
  { id: "pastel",   label: "Pastel Soft",    desc: "Dreamy lavender & rose",       preview: "linear-gradient(145deg,#f3e8ff,#fce7f3)" },
  { id: "elegant",  label: "Elegant Paper",  desc: "Textured, sophisticated",      preview: "linear-gradient(145deg,#f7f3ee,#ede8e0)" },
  { id: "custom",   label: "Custom",         desc: "Upload your own background",   preview: "linear-gradient(145deg,#e8e6e1,#d4d0c8)" },
];

const LAYOUT_TEMPLATES: { id: LayoutTemplate; label: string; icon: string }[] = [
  { id: "none",    label: "Note",    icon: "¶" },
  { id: "lined",   label: "Lined",   icon: "≡" },
  { id: "grid",    label: "Grid",    icon: "⊞" },
  { id: "bullet",  label: "Bullet",  icon: "·" },
  { id: "cornell", label: "Cornell", icon: "▤" },
  { id: "weekly",  label: "Weekly",  icon: "⊟" },
];

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "png", label: "PNG" },
  { id: "txt", label: "Text" },
  { id: "md",  label: "Markdown" },
];

const AI_TONES = ["Professional","Casual","Creative","Academic","Minimal"];
const AI_LENGTHS = ["Brief","Medium","Detailed"];

export function ExportModal({ note, onClose }: Props) {
  const [template, setTemplate] = useState<Template>("minimal");
  const [layoutTemplate, setLayoutTemplate] = useState<LayoutTemplate>("none");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [exporting, setExporting] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [showAIGen, setShowAIGen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("Professional");
  const [aiLength, setAiLength] = useState("Medium");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [useGenerated, setUseGenerated] = useState(false);
  // Mobile: toggle between options and preview
  const [mobileTab, setMobileTab] = useState<"options" | "preview">("options");
  const [isMobile, setIsMobile] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) { toast.error("Describe what you want first!"); return; }
    setAiGenerating(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "template",
          content: `${aiPrompt}. Tone: ${aiTone}. Length: ${aiLength}. Return clean HTML with h1, h2, h3, p, ul, li, ol, strong, em tags only. No html/body/head/style tags.`,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setGeneratedContent(data.result);
        setUseGenerated(true);
        toast.success("Content generated!");
        if (isMobile) setMobileTab("preview");
      } else toast.error(data.error || "Generation failed");
    } catch { toast.error("Network error"); }
    setAiGenerating(false);
  };

  const handleCustomUpload = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { setCustomBg(ev.target?.result as string); setTemplate("custom"); };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportVisual = async (fmt: "png" | "pdf") => {
    const { default: html2canvas } = await import("html2canvas");
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: null });
    if (fmt === "png") {
      canvas.toBlob(blob => { if (blob) downloadBlob(blob, `${note.title || "note"}.png`); });
    } else {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
      const imgData = canvas.toDataURL("image/png");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pw / canvas.width, ph / canvas.height);
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`${note.title || "note"}.pdf`);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const title = note.title || "Untitled";
      if (exportFormat === "txt") {
        downloadBlob(new Blob([`${title}\n${"─".repeat(40)}\n\n${note.content.replace(/<[^>]*>/g,"")}\n\n─────\nExported from Nota`], { type:"text/plain" }), `${title}.txt`);
      } else if (exportFormat === "md") {
        downloadBlob(new Blob([`# ${note.emoji||""}${title}\n\n*${dateFns(new Date(note.updatedAt),"MMMM d, yyyy")}*\n\n${note.content.replace(/<[^>]*>/g,"")}\n\n---\n*Exported from Nota*`], { type:"text/markdown" }), `${title}.md`);
      } else {
        await exportVisual(exportFormat);
      }
      toast.success(`Exported as ${exportFormat.toUpperCase()}`);
      onClose();
    } catch { toast.error("Export failed. Try PNG or Text format."); }
    setExporting(false);
  };

  const OptionsPanel = () => (
    <div className="p-4 space-y-5 overflow-y-auto" style={{ maxHeight: isMobile ? "calc(85vh - 140px)" : "calc(90vh - 130px)" }}>
      {/* Style */}
      <div>
        <p style={{ fontSize:"10px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Style</p>
        <div className="space-y-1">
          {TEMPLATES.map(t => (
            <button key={t.id}
              onClick={() => t.id === "custom" ? handleCustomUpload() : setTemplate(t.id)}
              className="w-full flex items-center gap-3 p-2 rounded-xl transition-all"
              style={{ background: template===t.id ? "var(--surface-hover)" : "transparent", border:`1px solid ${template===t.id ? "var(--border)" : "transparent"}` }}>
              <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{ background: t.id==="custom"&&customBg ? "transparent" : t.preview }}>
                {t.id==="custom"&&customBg ? <img src={customBg} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : t.id==="custom"&&<Upload size={11} style={{ color:"#6b7280" }} />}
              </div>
              <div className="text-left">
                <p style={{ fontSize:"12px", fontWeight:template===t.id?500:400, color:"var(--text)" }}>{t.label}</p>
                <p style={{ fontSize:"10px", color:"var(--text-muted)" }}>{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div>
        <p style={{ fontSize:"10px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Layout</p>
        <div className="grid grid-cols-3 gap-1.5">
          {LAYOUT_TEMPLATES.map(l => (
            <button key={l.id} onClick={() => setLayoutTemplate(l.id)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
              style={{ background:layoutTemplate===l.id?"var(--text)":"var(--surface-hover)", border:`1px solid ${layoutTemplate===l.id?"var(--text)":"var(--border-light)"}` }}>
              <span style={{ fontSize:"16px", lineHeight:1, color:layoutTemplate===l.id?"var(--bg)":"var(--text-secondary)" }}>{l.icon}</span>
              <span style={{ fontSize:"10px", fontFamily:"var(--font-body)", color:layoutTemplate===l.id?"var(--bg)":"var(--text-secondary)" }}>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div>
        <p style={{ fontSize:"10px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Format</p>
        <div className="grid grid-cols-2 gap-1.5">
          {FORMATS.map(f => (
            <button key={f.id} onClick={() => setExportFormat(f.id)}
              className="py-2 rounded-lg text-xs transition-all"
              style={{ background:exportFormat===f.id?"var(--text)":"var(--surface-hover)", color:exportFormat===f.id?"var(--bg)":"var(--text-secondary)", fontFamily:"var(--font-body)", border:`1px solid ${exportFormat===f.id?"var(--text)":"var(--border-light)"}` }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Generate */}
      <div>
        <button onClick={() => setShowAIGen(!showAIGen)}
          className="w-full flex items-center justify-between"
          style={{ background:"none", border:"none", cursor:"pointer", padding:"0" }}>
          <p style={{ fontSize:"10px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em" }}>✦ AI Content</p>
          {showAIGen ? <ChevronUp size={12} style={{ color:"var(--text-muted)" }} /> : <ChevronDown size={12} style={{ color:"var(--text-muted)" }} />}
        </button>
        {showAIGen && (
          <div className="mt-3 space-y-3 animate-fade">
            <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. weekly standup, book review, travel plan…" rows={3}
              style={{ width:"100%", resize:"none", borderRadius:"10px", padding:"8px 10px", background:"var(--surface-hover)", border:"1px solid var(--border)", color:"var(--text)", fontSize:"12px", fontFamily:"var(--font-body)", outline:"none", lineHeight:"1.5" }} />
            <div>
              <p style={{ fontSize:"10px", color:"var(--text-muted)", marginBottom:"6px" }}>Tone</p>
              <div className="flex flex-wrap gap-1">
                {AI_TONES.map(t => (
                  <button key={t} onClick={() => setAiTone(t)}
                    style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontFamily:"var(--font-body)", cursor:"pointer", background:aiTone===t?"var(--text)":"var(--surface-hover)", color:aiTone===t?"var(--bg)":"var(--text-secondary)", border:`1px solid ${aiTone===t?"var(--text)":"var(--border-light)"}` }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize:"10px", color:"var(--text-muted)", marginBottom:"6px" }}>Length</p>
              <div className="flex gap-1">
                {AI_LENGTHS.map(l => (
                  <button key={l} onClick={() => setAiLength(l)}
                    style={{ flex:1, padding:"4px 0", borderRadius:"8px", fontSize:"11px", fontFamily:"var(--font-body)", cursor:"pointer", background:aiLength===l?"var(--text)":"var(--surface-hover)", color:aiLength===l?"var(--bg)":"var(--text-secondary)", border:`1px solid ${aiLength===l?"var(--text)":"var(--border-light)"}` }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerate} disabled={aiGenerating}
              className="w-full py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all hover:opacity-80"
              style={{ background:"#5DCAA5", color:"#fff", fontFamily:"var(--font-body)", border:"none", cursor:aiGenerating?"wait":"pointer", opacity:aiGenerating?0.7:1 }}>
              {aiGenerating ? <><div className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor:"rgba(255,255,255,0.3)", borderTopColor:"#fff" }} />Generating…</> : <><Sparkles size={11} />Generate Content</>}
            </button>
            {generatedContent && (
              <div className="animate-fade">
                <div className="p-2 rounded-lg" style={{ background:"var(--surface-hover)", border:"1px solid var(--border)" }}>
                  <p style={{ fontSize:"10px", color:"#5DCAA5", marginBottom:"4px", fontWeight:500 }}>✓ Content ready</p>
                  <p style={{ fontSize:"10px", color:"var(--text-muted)", lineHeight:"1.5" }}>{generatedContent.replace(/<[^>]*>/g,"").slice(0,80)}…</p>
                </div>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={useGenerated} onChange={e => setUseGenerated(e.target.checked)} style={{ accentColor:"#5DCAA5" }} />
                  <span style={{ fontSize:"11px", color:"var(--text-secondary)", fontFamily:"var(--font-body)" }}>Use in export</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const PreviewPanel = () => (
    <div className="flex-1 p-4 overflow-auto" style={{ background:"var(--bg)" }}>
      <p style={{ fontSize:"10px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"10px" }}>Preview</p>
      <div style={{ transform:"scale(0.82)", transformOrigin:"top left", width:"122%" }}>
        <ExportPreview ref={previewRef} note={note} template={template} layoutTemplate={layoutTemplate}
          customBg={customBg} showWatermark={showWatermark}
          overrideContent={useGenerated&&generatedContent ? generatedContent : undefined} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(6px)", padding: isMobile ? "0" : "16px" }}>
      <div className="w-full rounded-t-2xl md:rounded-2xl overflow-hidden animate-scale"
        style={{ background:"var(--surface)", boxShadow:"var(--shadow-lg)", maxHeight: isMobile ? "90vh" : "90vh", maxWidth: isMobile ? "100%" : "680px" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor:"var(--border)" }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"17px", color:"var(--text)" }}>Export Note</h2>
          {/* Mobile tabs */}
          {isMobile && (
            <div className="flex gap-1 p-1 rounded-lg" style={{ background:"var(--surface-hover)" }}>
              <button onClick={() => setMobileTab("options")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all"
                style={{ background:mobileTab==="options"?"var(--surface)":"transparent", color:mobileTab==="options"?"var(--text)":"var(--text-muted)", fontFamily:"var(--font-body)", border:"none", cursor:"pointer" }}>
                <Settings size={11} /> Options
              </button>
              <button onClick={() => setMobileTab("preview")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all"
                style={{ background:mobileTab==="preview"?"var(--surface)":"transparent", color:mobileTab==="preview"?"var(--text)":"var(--text-muted)", fontFamily:"var(--font-body)", border:"none", cursor:"pointer" }}>
                <Eye size={11} /> Preview
              </button>
            </div>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 transition-all">
            <X size={15} style={{ color:"var(--text-secondary)" }} />
          </button>
        </div>

        {/* Body */}
        {isMobile ? (
          // Mobile: single panel, toggled
          <div style={{ height:"calc(90vh - 130px)", overflowY:"auto" }}>
            {mobileTab === "options" ? <OptionsPanel /> : <PreviewPanel />}
          </div>
        ) : (
          // Desktop: side by side
          <div className="flex overflow-auto" style={{ maxHeight:"calc(90vh - 130px)" }}>
            <div style={{ width:"260px", flexShrink:0, borderRight:"1px solid var(--border)" }}>
              <OptionsPanel />
            </div>
            <PreviewPanel />
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between gap-2" style={{ borderColor:"var(--border)" }}>
          <button onClick={() => setShowWatermark(!showWatermark)}
            className="flex items-center gap-2"
            style={{ fontSize:"12px", color:"var(--text-muted)", fontFamily:"var(--font-body)", background:"none", border:"none", cursor:"pointer" }}>
            <div className="w-8 h-4 rounded-full transition-all relative flex-shrink-0"
              style={{ background:showWatermark?"var(--text)":"var(--border)" }}>
              <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                style={{ left:showWatermark?"calc(100% - 14px)":"2px" }} />
            </div>
            <span className="hidden sm:inline">{showWatermark ? "Watermark on" : "No watermark"}</span>
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm"
              style={{ background:"var(--surface-hover)", color:"var(--text-secondary)", fontFamily:"var(--font-body)" }}>
              Cancel
            </button>
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all hover:opacity-80"
              style={{ background:"var(--text)", color:"var(--bg)", fontFamily:"var(--font-body)" }}>
              {exporting ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor:"rgba(255,255,255,0.3)", borderTopColor:"white" }} /> : <Download size={13} />}
              {exporting ? "Exporting…" : `Export ${exportFormat.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinedLayout({ accent }: { accent: string }) {
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
      {Array.from({ length:28 }).map((_,i) => (
        <div key={i} style={{ position:"absolute", left:"48px", right:"32px", top:`${120+i*28}px`, height:"1px", background:accent, opacity:0.12 }} />
      ))}
      <div style={{ position:"absolute", left:"44px", top:"100px", bottom:"60px", width:"1px", background:"#e57373", opacity:0.35 }} />
    </div>
  );
}

function GridLayout({ accent }: { accent: string }) {
  const size = 18;
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
        <defs><pattern id="grid" width={size} height={size} patternUnits="userSpaceOnUse"><path d={`M ${size} 0 L 0 0 0 ${size}`} fill="none" stroke={accent} strokeWidth="0.4" opacity="0.2" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

function DotGridLayout({ accent }: { accent: string }) {
  const spacing = 18;
  const dots = [];
  for (let r=0;r<30;r++) for (let c=0;c<25;c++) dots.push({ x:30+c*spacing, y:30+r*spacing });
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
        {dots.map((d,i) => <circle key={i} cx={d.x} cy={d.y} r="1" fill={accent} opacity="0.2" />)}
      </svg>
    </div>
  );
}

function CornellLayout({ accent, textColor }: { accent: string; textColor: string }) {
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
      <div style={{ position:"absolute", left:"140px", top:"80px", bottom:"100px", width:"1px", background:accent, opacity:0.25 }} />
      <div style={{ position:"absolute", left:"32px", right:"32px", bottom:"100px", height:"1px", background:accent, opacity:0.25 }} />
      <div style={{ position:"absolute", left:"32px", top:"85px", width:"100px", fontSize:"8px", letterSpacing:"0.12em", textTransform:"uppercase", color:textColor, opacity:0.35, fontFamily:"Georgia,serif" }}>Cue / Key</div>
      <div style={{ position:"absolute", left:"152px", top:"85px", fontSize:"8px", letterSpacing:"0.12em", textTransform:"uppercase", color:textColor, opacity:0.35, fontFamily:"Georgia,serif" }}>Notes</div>
      <div style={{ position:"absolute", left:"32px", bottom:"72px", fontSize:"8px", letterSpacing:"0.12em", textTransform:"uppercase", color:textColor, opacity:0.35, fontFamily:"Georgia,serif" }}>Summary</div>
      {Array.from({ length:18 }).map((_,i) => (
        <React.Fragment key={i}>
          <div style={{ position:"absolute", left:"152px", right:"32px", top:`${106+i*24}px`, height:"1px", background:accent, opacity:0.1 }} />
          <div style={{ position:"absolute", left:"32px", width:"100px", top:`${106+i*24}px`, height:"1px", background:accent, opacity:0.1 }} />
        </React.Fragment>
      ))}
    </div>
  );
}

function WeeklyLayout({ accent, textColor }: { accent: string; textColor: string }) {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return (
    <div style={{ position:"absolute", inset:"80px 32px 60px", pointerEvents:"none" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"6px", height:"100%" }}>
        {days.map(day => (
          <div key={day} style={{ border:`1px solid ${accent}`, borderRadius:"6px", opacity:0.5, overflow:"hidden" }}>
            <div style={{ padding:"5px 6px", borderBottom:`1px solid ${accent}`, background:`${accent}10` }}>
              <span style={{ fontSize:"8px", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:textColor, fontFamily:"Georgia,serif" }}>{day}</span>
            </div>
            {Array.from({ length:8 }).map((_,i) => <div key={i} style={{ borderBottom:`1px solid ${accent}20`, height:"20px" }} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

const ExportPreview = React.forwardRef<HTMLDivElement, {
  note: Note; template: Template; layoutTemplate: LayoutTemplate;
  customBg: string|null; showWatermark: boolean; overrideContent?: string;
}>(({ note, template, layoutTemplate, customBg, showWatermark, overrideContent }, ref) => {
  const date = dateFns(new Date(note.updatedAt), "MMMM d, yyyy");
  const contentHtml = overrideContent || note.content || "";

  const styles: Record<Template, React.CSSProperties> = {
    minimal:  { background:"#ffffff",                                         padding:"56px 52px", fontFamily:"Georgia,serif", minHeight:"500px", color:"#1a1916", position:"relative", overflow:"hidden" },
    journal:  { background:"linear-gradient(160deg,#fdf6e3,#f5e8cc)",         padding:"52px 48px", fontFamily:"Georgia,serif", minHeight:"500px", color:"#3d2e1e", position:"relative", overflow:"hidden" },
    dark:     { background:"#1a1916",                                         padding:"56px 52px", fontFamily:"Georgia,serif", minHeight:"500px", color:"#e8e4dc", position:"relative", overflow:"hidden" },
    pastel:   { background:"linear-gradient(145deg,#f5f0ff,#fce7f3)",         padding:"52px 48px", fontFamily:"Georgia,serif", minHeight:"500px", color:"#2d1b4e", position:"relative", overflow:"hidden" },
    elegant:  { background:"#f7f3ee", borderLeft:"4px solid #c4a882",         padding:"56px 52px", fontFamily:"Georgia,serif", minHeight:"500px", color:"#2a2420", position:"relative", overflow:"hidden" },
    custom:   {                                                                padding:"56px 52px", fontFamily:"Georgia,serif", minHeight:"500px", color:"#1a1916", position:"relative", overflow:"hidden" },
  };

  const accents: Record<Template,string> = {
    minimal:"#1a1916", journal:"#8b5e3c", dark:"#a8d5b8", pastel:"#7c3aed", elegant:"#c4a882", custom:"#1a1916",
  };

  const accent = accents[template];
  const textColor = styles[template].color as string;
  const isLayoutOnly = layoutTemplate !== "none";

  return (
    <div ref={ref} style={styles[template]}>
      {template==="custom"&&customBg&&(
        <>
          <div style={{ position:"absolute", inset:0, backgroundImage:`url(${customBg})`, backgroundSize:"cover", backgroundPosition:"center" }} />
          <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.88)" }} />
        </>
      )}
      {layoutTemplate==="lined"   && <LinedLayout accent={accent} />}
      {layoutTemplate==="grid"    && <GridLayout accent={accent} />}
      {layoutTemplate==="bullet"  && <DotGridLayout accent={accent} />}
      {layoutTemplate==="cornell" && <CornellLayout accent={accent} textColor={textColor} />}
      {layoutTemplate==="weekly"  && <WeeklyLayout accent={accent} textColor={textColor} />}

      <div style={{ position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
          <span style={{ fontSize:"9px", letterSpacing:"0.2em", textTransform:"uppercase", color:accent, opacity:0.7 }}>nota</span>
          <span style={{ fontSize:"9px", opacity:0.4 }}>{date}</span>
        </div>
        <div style={{ height:"1px", background:accent, opacity:0.15, marginBottom:"28px" }} />

        {isLayoutOnly&&layoutTemplate!=="weekly" ? (
          <>
            {note.emoji&&<div style={{ fontSize:"28px", marginBottom:"8px" }}>{note.emoji}</div>}
            <h1 style={{ fontSize:"22px", fontWeight:600, lineHeight:"1.2", marginBottom:"6px", opacity:0.9 }}>{note.title||"Untitled"}</h1>
            <p style={{ fontSize:"11px", opacity:0.35, marginBottom:"24px" }}>{date}</p>
            {(layoutTemplate==="lined"||layoutTemplate==="grid"||layoutTemplate==="bullet")&&(
              <p style={{ fontSize:"10px", opacity:0.2, fontStyle:"italic", marginTop:"8px" }}>Start writing here…</p>
            )}
          </>
        ) : layoutTemplate==="weekly" ? (
          <>
            <h1 style={{ fontSize:"20px", fontWeight:600, marginBottom:"4px", opacity:0.9 }}>{note.title||"Weekly Planner"}</h1>
            <p style={{ fontSize:"10px", opacity:0.35, marginBottom:"16px" }}>{date}</p>
          </>
        ) : (
          <>
            {note.emoji&&<div style={{ fontSize:"32px", marginBottom:"10px" }}>{note.emoji}</div>}
            <h1 style={{ fontSize:"26px", fontWeight:600, lineHeight:"1.2", marginBottom:"10px" }}>{note.title||"Untitled"}</h1>
            {note.tags.length>0&&(
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"20px" }}>
                {note.tags.map(nt=>(
                  <span key={nt.tagId} style={{ padding:"2px 8px", borderRadius:"999px", background:accent+"18", color:accent, fontSize:"10px" }}>{nt.tag.name}</span>
                ))}
              </div>
            )}
            <div style={{ fontSize:"14px", lineHeight:"1.85", opacity:0.9 }}
              dangerouslySetInnerHTML={{ __html: contentHtml||`<p style="opacity:0.4;font-style:italic">No content yet.</p>` }} />
          </>
        )}

        {showWatermark&&(
          <div style={{ marginTop:"40px", paddingTop:"14px", borderTop:`1px solid ${accent}18` }}>
            <p style={{ fontSize:"9px", opacity:0.35, letterSpacing:"0.12em" }}>EXPORTED FROM NOTA · {new Date().getFullYear()}</p>
          </div>
        )}
      </div>
    </div>
  );
});
ExportPreview.displayName = "ExportPreview";
