import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
