import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const original = await prisma.note.findFirst({
    where: { id, userId: session.user.id },
    include: { tags: true },
  });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await prisma.note.create({
    data: {
      title: original.title + " (copy)",
      content: original.content,
      emoji: original.emoji,
      color: original.color,
      userId: session.user.id,
      tags: { create: original.tags.map(t => ({ tagId: t.tagId })) },
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json(copy);
}
