import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "No content" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured in Vercel env vars" }, { status: 500 });

  const prompts: Record<string, string> = {
    summarize: `Summarize this note in 2-3 sentences. Return only the summary:\n\n${content}`,
    expand: `Expand this with more detail. Return only the expanded text:\n\n${content}`,
    rewrite: `Rewrite this more clearly. Return only the rewritten text:\n\n${content}`,
    bullets: `Convert to bullet points. Return only the bullets:\n\n${content}`,
    continue: `Continue writing from here. Return only the continuation:\n\n${content}`,
    fix: `Fix grammar and spelling. Return only the corrected text:\n\n${content}`,
    cleanup: `Clean up this voice transcription. Fix punctuation, remove filler words. Return only the cleaned text:\n\n${content}`,
  };

  const prompt = prompts[action];
  if (!prompt) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message || "Anthropic error" }, { status: 500 });
    const text = data.content?.[0]?.text?.trim();
    if (!text) return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    return NextResponse.json({ result: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
