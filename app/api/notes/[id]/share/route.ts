import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const note = await prisma.note.update({
    where: { id, userId: session.user.id },
    data: { isShared: body.isShared },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json({ shareId: note.shareId, isShared: note.isShared });
}
