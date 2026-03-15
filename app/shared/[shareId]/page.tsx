import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { notFound } from "next/navigation";

export default async function SharedNotePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const note = await prisma.note.findFirst({
    where: { shareId, isShared: true },
    include: { tags: { include: { tag: true } } },
  });

  if (!note) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ marginBottom: "48px", paddingBottom: "24px", borderBottom: "1px solid #e8e6e1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{ width: "24px", height: "24px", background: "#1a1916", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "Georgia, serif", color: "white", fontSize: "12px" }}>n</span>
            </div>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "16px" }}>nota</span>
          </div>
          <p style={{ fontSize: "12px", color: "#a09d98" }}>Shared note</p>
        </div>

        {note.emoji && <div style={{ fontSize: "48px", marginBottom: "16px" }}>{note.emoji}</div>}

        {note.tags.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
            {note.tags.map(nt => (
              <span key={nt.tagId} style={{ padding: "2px 10px", borderRadius: "999px", background: nt.tag.color + "22", color: nt.tag.color, fontSize: "11px" }}>
                {nt.tag.name}
              </span>
            ))}
          </div>
        )}

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "36px", fontWeight: 500, lineHeight: 1.2, marginBottom: "12px", color: "#1a1916" }}>
          {note.title}
        </h1>
        <p style={{ fontSize: "13px", color: "#a09d98", marginBottom: "40px" }}>
          {format(new Date(note.updatedAt), "MMMM d, yyyy")}
        </p>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", lineHeight: "1.85", color: "#1a1916", whiteSpace: "pre-wrap" }}>
          {note.content}
        </div>
      </div>
    </div>
  );
}
