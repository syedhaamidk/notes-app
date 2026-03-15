import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const note = await prisma.note.findFirst({
    where: { shareId, isShared: true },
    include: { tags: { include: { tag: true } } },
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}
