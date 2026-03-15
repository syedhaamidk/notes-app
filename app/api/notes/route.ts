import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all";
  const tag = searchParams.get("tag");
  const search = searchParams.get("search");

  const where: any = { userId: session.user.id };
  if (filter === "trash") { where.isTrashed = true; }
  else if (filter === "archive") { where.isArchived = true; where.isTrashed = false; }
  else if (filter === "pinned") { where.isPinned = true; where.isArchived = false; where.isTrashed = false; }
  else { where.isArchived = false; where.isTrashed = false; }

  if (tag) where.tags = { some: { tag: { name: tag } } };
  if (search) where.OR = [
    { title: { contains: search, mode: "insensitive" } },
    { content: { contains: search, mode: "insensitive" } },
  ];

  const notes = await prisma.note.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const note = await prisma.note.create({
    data: {
      title: body.title || "Untitled",
      content: body.content || "",
      emoji: body.emoji,
      color: body.color,
      userId: session.user.id,
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json(note);
}
