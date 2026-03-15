import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const note = await prisma.note.findFirst({
    where: { id, userId: session.user.id },
    include: { tags: { include: { tag: true } } },
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();

    // Explicitly whitelist every field that can be updated.
    // This prevents unknown/computed fields from reaching Prisma and causing
    // PrismaClientValidationError when the frontend sends extra data.
    const {
      title,
      content,
      emoji,
      color,
      coverImage,
      isPinned,
      isArchived,
      isTrashed,
      isShared,
      tagIds,
    } = body;

    // Build the update payload with only defined fields
    const data: Record<string, unknown> = {};
    if (title       !== undefined) data.title       = title;
    if (emoji       !== undefined) data.emoji       = emoji;
    if (color       !== undefined) data.color       = color;
    if (coverImage  !== undefined) data.coverImage  = coverImage;
    if (isPinned    !== undefined) data.isPinned    = isPinned;
    if (isArchived  !== undefined) data.isArchived  = isArchived;
    if (isTrashed   !== undefined) data.isTrashed   = isTrashed;
    if (isShared    !== undefined) data.isShared    = isShared;

    // Derive wordCount from content on the server — never trust the client value
    if (content !== undefined) {
      data.content   = content;
      data.wordCount = content.replace(/<[^>]*>/g, "").trim()
        ? content.replace(/<[^>]*>/g, "").trim().split(/\s+/).length
        : 0;
    }

    const note = await prisma.note.update({
      where: { id, userId: session.user.id },
      data: {
        ...data,
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId: string) => ({ tagId })),
          },
        }),
      },
      include: { tags: { include: { tag: true } } },
    });

    return NextResponse.json(note);
  } catch (e: any) {
    console.error("PATCH note error:", JSON.stringify(e, null, 2));
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.note.delete({ where: { id, userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
