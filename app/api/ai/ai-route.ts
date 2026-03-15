import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "No content" }, { status: 400 });

  const prompts: Record<string, string> = {
    summarize: `Summarize this note concisely in 2-3 sentences. Return only the summary:\n\n${content}`,
    expand: `Expand and elaborate on this content with more detail and examples. Return only the expanded text:\n\n${content}`,
    rewrite: `Rewrite this more clearly and professionally. Return only the rewritten text:\n\n${content}`,
    bullets: `Convert this into a clear bullet-point list. Return only the bullet points:\n\n${content}`,
    continue: `Continue writing from where this left off, matching the style and tone. Return only the continuation:\n\n${content}`,
    fix: `Fix any grammar, spelling, and punctuation issues. Return only the corrected text:\n\n${content}`,
    cleanup: `Clean up this voice transcription. Fix punctuation, capitalization, remove filler words (um, uh, like). Return only the cleaned text:\n\n${content}`,
  };

  const prompt = prompts[action];
  if (!prompt) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    return NextResponse.json({ result: text });
  } catch (e) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 500 });
  }
}
