import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "No content" }, { status: 400 });

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!groqKey && !geminiKey && !anthropicKey) {
    return NextResponse.json({ error: "API key not configured in Vercel env vars" }, { status: 500 });
  }

  const prompts: Record<string, string> = {
    summarize: `Summarize this note in 2-3 sentences. Return only the summary:\n\n${content}`,
    expand: `Expand this with more detail. Return only the expanded text:\n\n${content}`,
    rewrite: `Rewrite this more clearly. Return only the rewritten text:\n\n${content}`,
    bullets: `Convert to bullet points. Return only the bullets:\n\n${content}`,
    continue: `Continue writing from here. Return only the continuation:\n\n${content}`,
    fix: `Fix grammar and spelling. Return only the corrected text:\n\n${content}`,
    cleanup: `Clean up this voice transcription. Fix punctuation, remove filler words. Return only cleaned text:\n\n${content}`,
  };

  const prompt = prompts[action];
  if (!prompt) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({ model: "llama-3.1-8b-instant", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return NextResponse.json({ result: data.choices[0].message.content.trim() });
      }
      console.error("Groq error:", data);
    } catch (e) { console.error("Groq fetch error:", e); }
  }

  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return NextResponse.json({ result: data.candidates[0].content.parts[0].text.trim() });
      }
    } catch {}
  }

  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      if (res.ok && data.content?.[0]?.text) {
        return NextResponse.json({ result: data.content[0].text.trim() });
      }
    } catch {}
  }

  return NextResponse.json({ error: "AI request failed. Check Vercel function logs for details." }, { status: 500 });
}
