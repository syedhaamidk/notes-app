import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as Blob;
    if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

    const groqForm = new FormData();
    groqForm.append("file", audio, "recording.webm");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}` },
      body: groqForm,
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message || "Transcription failed" }, { status: 500 });
    return NextResponse.json({ text: data.text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
