"use client";
import { useState, useRef } from "react";
import { Note } from "@/types";
import { X, Download, FileText, Image } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface Props {
  note: Note;
  onClose: () => void;
}

type Template = "minimal" | "journal" | "dark" | "pastel" | "elegant";
type Format = "pdf" | "png" | "txt" | "md";

const TEMPLATES: { id: Template; label: string; desc: string; preview: string }[] = [
  {
    id: "minimal",
    label: "Minimal",
    desc: "Clean white, lots of space",
    preview: "linear-gradient(145deg, #ffffff, #f8f8f6)",
  },
  {
    id: "journal",
    label: "Warm Journal",
    desc: "Cozy cream & serif vibes",
    preview: "linear-gradient(145deg, #fdf6e3, #f5e6c8)",
  },
  {
    id: "dark",
    label: "Dark Editorial",
    desc: "Bold, dramatic, minimal",
    preview: "linear-gradient(145deg, #1a1916, #2d2a24)",
  },
  {
    id: "pastel",
    label: "Pastel Soft",
    desc: "Dreamy lavender & rose",
    preview: "linear-gradient(145deg, #f3e8ff, #fce7f3)",
  },
  {
    id: "elegant",
    label: "Elegant Paper",
    desc: "Textured, sophisticated",
    preview: "linear-gradient(145deg, #f7f3ee, #ede8e0)",
  },
];

const FORMATS: { id: Format; label: string; icon: React.ReactNode }[] = [
  { id: "pdf", label: "PDF", icon: <FileText size={14} /> },
  { id: "png", label: "PNG Image", icon: <Image size={14} /> },
  { id: "txt", label: "Plain Text", icon: <FileText size={14} /> },
  { id: "md", label: "Markdown", icon: <FileText size={14} /> },
];

export function ExportModal({ note, onClose }: Props) {
  const [template, setTemplate] = useState<Template>("minimal");
  const [format, setFormat] = useState<Format>("pdf");
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === "txt") {
        const text = `${note.title}\n${"─".repeat(40)}\n\n${note.content}\n\n─────\nExported from Nota · ${new Date().toLocaleDateString()}`;
        downloadBlob(new Blob([text], { type: "text/plain" }), `${note.title}.txt`);
      } else if (format === "md") {
        const md = `# ${note.emoji ? note.emoji + " " : ""}${note.title}\n\n*${format_date(note.updatedAt)}*\n\n${note.content}\n\n---\n*Exported from Nota*`;
        downloadBlob(new Blob([md], { type: "text/markdown" }), `${note.title}.md`);
      } else if (format === "png" || format === "pdf") {
        await exportVisual(format);
      }
      toast.success(`Exported as ${format.toUpperCase()}`);
      onClose();
    } catch (e) {
      toast.error("Export failed. Try a different format.");
      console.error(e);
    }
    setExporting(false);
  };

  const exportVisual = async (fmt: "png" | "pdf") => {
    const { default: html2canvas } = await import("html2canvas");
    if (!previewRef.current) return;

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });

    if (fmt === "png") {
      canvas.toBlob(blob => {
        if (blob) downloadBlob(blob, `${note.title}.png`);
      });
    } else {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
      const imgData = canvas.toDataURL("image/png");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`${note.title}.pdf`);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const format_date = (d: string) => format(new Date(d), "MMMM d, yyyy");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden animate-scale shadow-2xl"
        style={{ background: "var(--surface)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px" }}>Export Note</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-all">
            <X size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row overflow-auto" style={{ maxHeight: "calc(90vh - 130px)" }}>
          {/* Left: options */}
          <div className="p-6 space-y-6 md:w-72 flex-shrink-0">
            {/* Templates */}
            <div>
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Template</p>
              <div className="space-y-1.5">
                {TEMPLATES.map(t => (
                  <button key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all"
                    style={{
                      background: template === t.id ? "var(--surface-hover)" : "transparent",
                      border: `1px solid ${template === t.id ? "var(--border)" : "transparent"}`,
                    }}>
                    <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: t.preview }} />
                    <div className="text-left">
                      <p style={{ fontSize: "13px", fontWeight: template === t.id ? 500 : 400, color: "var(--text)" }}>{t.label}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Format</p>
              <div className="grid grid-cols-2 gap-1.5">
                {FORMATS.map(f => (
                  <button key={f.id}
                    onClick={() => setFormat(f.id)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all"
                    style={{
                      background: format === f.id ? "var(--text)" : "var(--surface-hover)",
                      color: format === f.id ? "white" : "var(--text-secondary)",
                      fontSize: "13px", fontFamily: "var(--font-body)",
                      border: `1px solid ${format === f.id ? "var(--text)" : "var(--border-light)"}`,
                    }}>
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="flex-1 p-4 overflow-auto" style={{ background: "var(--bg)" }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Preview</p>
            <div className="rounded-xl overflow-hidden shadow-lg" style={{ transform: "scale(0.85)", transformOrigin: "top left", width: "117.6%" }}>
              <ExportPreview ref={previewRef} note={note} template={template} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm transition-all"
            style={{ background: "var(--surface-hover)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            Cancel
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm transition-all hover:opacity-80"
            style={{ background: "var(--text)", color: "white", fontFamily: "var(--font-body)" }}>
            {exporting ? (
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
            ) : <Download size={14} />}
            {exporting ? "Exporting..." : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Export preview templates
import React from "react";

const ExportPreview = React.forwardRef<HTMLDivElement, { note: Note; template: Template }>(
  ({ note, template }, ref) => {
    const date = format(new Date(note.updatedAt), "MMMM d, yyyy");

    const styles: Record<Template, React.CSSProperties> = {
      minimal: {
        background: "#ffffff",
        padding: "60px 56px",
        fontFamily: "'Georgia', serif",
        minHeight: "520px",
        color: "#1a1916",
      },
      journal: {
        background: "linear-gradient(160deg, #fdf6e3 0%, #f5e8cc 100%)",
        padding: "56px 52px",
        fontFamily: "'Georgia', serif",
        minHeight: "520px",
        color: "#3d2e1e",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='%23d4a96a' fill-opacity='0.07' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      },
      dark: {
        background: "#1a1916",
        padding: "60px 56px",
        fontFamily: "'Georgia', serif",
        minHeight: "520px",
        color: "#e8e4dc",
      },
      pastel: {
        background: "linear-gradient(145deg, #f5f0ff 0%, #fce7f3 50%, #fef3c7 100%)",
        padding: "56px 52px",
        fontFamily: "'Georgia', serif",
        minHeight: "520px",
        color: "#2d1b4e",
      },
      elegant: {
        background: "#f7f3ee",
        padding: "60px 56px",
        fontFamily: "'Georgia', serif",
        minHeight: "520px",
        color: "#2a2420",
        borderLeft: "4px solid #c4a882",
      },
    };

    const accentColors: Record<Template, string> = {
      minimal: "#2d6a4f",
      journal: "#8b5e3c",
      dark: "#a8d5b8",
      pastel: "#7c3aed",
      elegant: "#c4a882",
    };

    const accent = accentColors[template];
    const style = styles[template];

    return (
      <div ref={ref} style={style}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
            <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: accent, opacity: 0.8 }}>
              nota
            </span>
            <span style={{ fontSize: "10px", opacity: 0.5 }}>{date}</span>
          </div>
          <div style={{ height: "1px", background: accent, opacity: 0.2 }} />
        </div>

        {/* Emoji */}
        {note.emoji && (
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>{note.emoji}</div>
        )}

        {/* Title */}
        <h1 style={{
          fontSize: "28px", fontWeight: 600, lineHeight: "1.2",
          marginBottom: "12px",
          fontFamily: "'Georgia', serif",
        }}>
          {note.title || "Untitled"}
        </h1>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px" }}>
            {note.tags.map(nt => (
              <span key={nt.tagId} style={{
                padding: "2px 10px", borderRadius: "999px",
                background: accent + "22", color: accent,
                fontSize: "11px", letterSpacing: "0.05em",
              }}>
                {nt.tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ fontSize: "15px", lineHeight: "1.8", whiteSpace: "pre-wrap", opacity: 0.9 }}>
          {note.content || "No content yet."}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "48px", paddingTop: "16px", borderTop: `1px solid ${accent}22` }}>
          <p style={{ fontSize: "10px", opacity: 0.4, letterSpacing: "0.1em" }}>
            EXPORTED FROM NOTA · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    );
  }
);

ExportPreview.displayName = "ExportPreview";
