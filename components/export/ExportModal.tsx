"use client";
import { useState, useRef } from "react";
import { Note } from "@/types";
import { X, Download, Upload, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { format as dateFns } from "date-fns";
import toast from "react-hot-toast";
import React from "react";

interface Props { note: Note; onClose: () => void; }
type Template = "minimal" | "journal" | "dark" | "pastel" | "elegant" | "custom";
type ExportFormat = "pdf" | "png" | "txt" | "md";

const TEMPLATES: { id: Template; label: string; desc: string; preview: string }[] = [
  { id: "minimal",  label: "Minimal",         desc: "Clean white, generous space",  preview: "linear-gradient(145deg,#ffffff,#f8f8f6)" },
  { id: "journal",  label: "Warm Journal",     desc: "Cozy cream & serif vibes",     preview: "linear-gradient(145deg,#fdf6e3,#f5e6c8)" },
  { id: "dark",     label: "Dark Editorial",   desc: "Bold, dramatic, minimal",      preview: "linear-gradient(145deg,#1a1916,#2d2a24)" },
  { id: "pastel",   label: "Pastel Soft",      desc: "Dreamy lavender & rose",       preview: "linear-gradient(145deg,#f3e8ff,#fce7f3)" },
  { id: "elegant",  label: "Elegant Paper",    desc: "Textured, sophisticated",      preview: "linear-gradient(145deg,#f7f3ee,#ede8e0)" },
  { id: "custom",   label: "Custom Template",  desc: "Upload your own background",   preview: "linear-gradient(145deg,#e8e6e1,#d4d0c8)" },
];

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "png", label: "PNG" },
  { id: "txt", label: "Text" },
  { id: "md",  label: "Markdown" },
];

const AI_TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual",       label: "Casual" },
  { id: "creative",     label: "Creative" },
  { id: "academic",     label: "Academic" },
  { id: "minimal",      label: "Minimal" },
];

const AI_LENGTHS = [
  { id: "brief",    label: "Brief" },
  { id: "medium",   label: "Medium" },
  { id: "detailed", label: "Detailed" },
];

export function ExportModal({ note, onClose }: Props) {
  const [template, setTemplate] = useState<Template>("minimal");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [exporting, setExporting] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [showAIGen, setShowAIGen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiLength, setAiLength] = useState("medium");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [useGenerated, setUseGenerated] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

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
        toast.success("Template generated!");
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch { toast.error("Network error"); }
    setAiGenerating(false);
  };

  const handleCustomUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCustomBg(ev.target?.result as string);
        setTemplate("custom");
      };
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
        const text = `${title}\n${"─".repeat(40)}\n\n${note.content.replace(/<[^>]*>/g, "")}\n\n─────\nExported from Nota`;
        downloadBlob(new Blob([text], { type: "text/plain" }), `${title}.txt`);
      } else if (exportFormat === "md") {
        const md = `# ${note.emoji ? note.emoji + " " : ""}${title}\n\n*${dateFns(new Date(note.updatedAt), "MMMM d, yyyy")}*\n\n${note.content.replace(/<[^>]*>/g, "")}\n\n---\n*Exported from Nota*`;
        downloadBlob(new Blob([md], { type: "text/markdown" }), `${title}.md`);
      } else {
        await exportVisual(exportFormat);
      }
      toast.success(`Exported as ${exportFormat.toUpperCase()}`);
      onClose();
    } catch {
      toast.error("Export failed. Try PNG or Text format.");
    }
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden animate-scale"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "17px", color: "var(--text)" }}>Export Note</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 transition-all">
            <X size={15} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row overflow-auto" style={{ maxHeight: "calc(90vh - 130px)" }}>
          {/* Options */}
          <div className="p-5 space-y-5 md:w-64 flex-shrink-0">
            <div>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Template</p>
              <div className="space-y-1">
                {TEMPLATES.map(t => (
                  <button key={t.id}
                    onClick={() => t.id === "custom" ? handleCustomUpload() : setTemplate(t.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl transition-all"
                    style={{ background: template === t.id ? "var(--surface-hover)" : "transparent", border: `1px solid ${template === t.id ? "var(--border)" : "transparent"}` }}>
                    <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: t.id === "custom" && customBg ? "transparent" : t.preview }}>
                      {t.id === "custom" && customBg
                        ? <img src={customBg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : t.id === "custom" && <Upload size={11} style={{ color: "#6b7280" }} />}
                    </div>
                    <div className="text-left">
                      <p style={{ fontSize: "12px", fontWeight: template === t.id ? 500 : 400, color: "var(--text)" }}>{t.label}</p>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Format</p>
              <div className="grid grid-cols-2 gap-1.5">
                {FORMATS.map(f => (
                  <button key={f.id} onClick={() => setExportFormat(f.id)}
                    className="py-2 rounded-lg text-xs transition-all"
                    style={{
                      background: exportFormat === f.id ? "var(--text)" : "var(--surface-hover)",
                      color: exportFormat === f.id ? "var(--bg)" : "var(--text-secondary)",
                      fontFamily: "var(--font-body)",
                      border: `1px solid ${exportFormat === f.id ? "var(--text)" : "var(--border-light)"}`,
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Generator */}
            <div>
              <button
                onClick={() => setShowAIGen(!showAIGen)}
                className="w-full flex items-center justify-between"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0" }}>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  ✦ AI Generate
                </p>
                {showAIGen
                  ? <ChevronUp size={12} style={{ color: "var(--text-muted)" }} />
                  : <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />}
              </button>

              {showAIGen && (
                <div className="mt-3 space-y-3 animate-fade">
                  <textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Describe your note… e.g. 'weekly team standup', 'book review of 1984', 'travel plan for Tokyo'"
                    rows={3}
                    style={{
                      width: "100%", resize: "none", borderRadius: "10px", padding: "8px 10px",
                      background: "var(--surface-hover)", border: "1px solid var(--border)",
                      color: "var(--text)", fontSize: "12px", fontFamily: "var(--font-body)",
                      outline: "none", lineHeight: "1.5",
                    }}
                  />

                  <div>
                    <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "6px" }}>Tone</p>
                    <div className="flex flex-wrap gap-1">
                      {AI_TONES.map(t => (
                        <button key={t.id} onClick={() => setAiTone(t.id)}
                          style={{
                            padding: "3px 10px", borderRadius: "20px", fontSize: "11px",
                            fontFamily: "var(--font-body)", cursor: "pointer",
                            background: aiTone === t.id ? "var(--text)" : "var(--surface-hover)",
                            color: aiTone === t.id ? "var(--bg)" : "var(--text-secondary)",
                            border: `1px solid ${aiTone === t.id ? "var(--text)" : "var(--border-light)"}`,
                          }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "6px" }}>Length</p>
                    <div className="flex gap-1">
                      {AI_LENGTHS.map(l => (
                        <button key={l.id} onClick={() => setAiLength(l.id)}
                          style={{
                            flex: 1, padding: "4px 0", borderRadius: "8px", fontSize: "11px",
                            fontFamily: "var(--font-body)", cursor: "pointer",
                            background: aiLength === l.id ? "var(--text)" : "var(--surface-hover)",
                            color: aiLength === l.id ? "var(--bg)" : "var(--text-secondary)",
                            border: `1px solid ${aiLength === l.id ? "var(--text)" : "var(--border-light)"}`,
                          }}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleGenerate} disabled={aiGenerating}
                    className="w-full py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{
                      background: "#5DCAA5", color: "#fff", fontFamily: "var(--font-body)",
                      border: "none", cursor: aiGenerating ? "wait" : "pointer",
                      opacity: aiGenerating ? 0.7 : 1,
                    }}>
                    {aiGenerating
                      ? <><div className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> Generating…</>
                      : <><Sparkles size={11} /> Generate Content</>}
                  </button>

                  {generatedContent && (
                    <div className="animate-fade">
                      <div className="p-2 rounded-lg" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
                        <p style={{ fontSize: "10px", color: "#5DCAA5", marginBottom: "4px", fontWeight: 500 }}>✓ Content ready</p>
                        <p style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                          {generatedContent.replace(/<[^>]*>/g, "").slice(0, 80)}…
                        </p>
                      </div>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" checked={useGenerated} onChange={e => setUseGenerated(e.target.checked)}
                          style={{ accentColor: "#5DCAA5" }} />
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                          Use generated content in export
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 p-4 overflow-auto" style={{ background: "var(--bg)" }}>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Preview</p>
            <div style={{ transform: "scale(0.82)", transformOrigin: "top left", width: "122%" }}>
              <ExportPreview ref={previewRef} note={note} template={template} customBg={customBg} showWatermark={showWatermark} overrideContent={useGenerated && generatedContent ? generatedContent : undefined} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
          {/* Watermark toggle */}
          <button onClick={() => setShowWatermark(!showWatermark)}
            className="flex items-center gap-2"
            style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-body)", background: "none", border: "none", cursor: "pointer" }}>
            <div className="w-8 h-4 rounded-full transition-all relative flex-shrink-0"
              style={{ background: showWatermark ? "var(--text)" : "var(--border)" }}>
              <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                style={{ left: showWatermark ? "calc(100% - 14px)" : "2px" }} />
            </div>
            {showWatermark ? "Watermark on" : "No watermark"}
          </button>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: "var(--surface-hover)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Cancel
            </button>
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm transition-all hover:opacity-80"
              style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-body)" }}>
              {exporting
                ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                : <Download size={13} />}
              {exporting ? "Exporting…" : `Export ${exportFormat.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ExportPreview = React.forwardRef<HTMLDivElement, {
  note: Note; template: Template; customBg: string | null; showWatermark: boolean; overrideContent?: string;
}>(({ note, template, customBg, showWatermark, overrideContent }, ref) => {
  const date = dateFns(new Date(note.updatedAt), "MMMM d, yyyy");
  const contentText = overrideContent
    ? overrideContent.replace(/<[^>]*>/g, "").trim()
    : note.content.replace(/<[^>]*>/g, "").trim();

  const styles: Record<Template, React.CSSProperties> = {
    minimal:  { background: "#ffffff",                                           padding: "56px 52px", fontFamily: "Georgia,serif", minHeight: "500px", color: "#1a1916" },
    journal:  { background: "linear-gradient(160deg,#fdf6e3,#f5e8cc)",          padding: "52px 48px", fontFamily: "Georgia,serif", minHeight: "500px", color: "#3d2e1e" },
    dark:     { background: "#1a1916",                                           padding: "56px 52px", fontFamily: "Georgia,serif", minHeight: "500px", color: "#e8e4dc" },
    pastel:   { background: "linear-gradient(145deg,#f5f0ff,#fce7f3)",          padding: "52px 48px", fontFamily: "Georgia,serif", minHeight: "500px", color: "#2d1b4e" },
    elegant:  { background: "#f7f3ee", borderLeft: "4px solid #c4a882",         padding: "56px 52px", fontFamily: "Georgia,serif", minHeight: "500px", color: "#2a2420" },
    custom:   { padding: "56px 52px", fontFamily: "Georgia,serif", minHeight: "500px", color: "#1a1916", position: "relative", overflow: "hidden" },
  };

  const accents: Record<Template, string> = {
    minimal: "#1a1916", journal: "#8b5e3c", dark: "#a8d5b8",
    pastel: "#7c3aed", elegant: "#c4a882", custom: "#1a1916",
  };

  const accent = accents[template];

  return (
    <div ref={ref} style={styles[template]}>
      {template === "custom" && customBg && (
        <>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${customBg})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.88)" }} />
        </>
      )}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: accent, opacity: 0.7 }}>nota</span>
          <span style={{ fontSize: "9px", opacity: 0.4 }}>{date}</span>
        </div>
        <div style={{ height: "1px", background: accent, opacity: 0.15, marginBottom: "28px" }} />
        {note.emoji && <div style={{ fontSize: "32px", marginBottom: "10px" }}>{note.emoji}</div>}
        <h1 style={{ fontSize: "26px", fontWeight: 600, lineHeight: "1.2", marginBottom: "10px" }}>{note.title || "Untitled"}</h1>
        {note.tags.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
            {note.tags.map(nt => (
              <span key={nt.tagId} style={{ padding: "2px 8px", borderRadius: "999px", background: accent + "18", color: accent, fontSize: "10px" }}>
                {nt.tag.name}
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize: "14px", lineHeight: "1.85", whiteSpace: "pre-wrap", opacity: 0.9 }}>
          {contentText || "No content yet."}
        </div>
        {showWatermark && (
          <div style={{ marginTop: "40px", paddingTop: "14px", borderTop: `1px solid ${accent}18` }}>
            <p style={{ fontSize: "9px", opacity: 0.35, letterSpacing: "0.12em" }}>
              EXPORTED FROM NOTA · {new Date().getFullYear()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
ExportPreview.displayName = "ExportPreview";
