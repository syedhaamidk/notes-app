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
    return NextResponse.json({ error: "No AI API key configured." }, { status: 500 });
  }

  const prompts: Record<string, string> = {
    summarize: `Summarize this note in 2-3 sentences. Return only the summary:\n\n${content}`,
    expand: `Expand this with more detail and examples. Return only the expanded text:\n\n${content}`,
    rewrite: `Rewrite this more clearly and professionally. Return only the rewritten text:\n\n${content}`,
    bullets: `Convert this into a clear bullet-point list. Return only the bullet points:\n\n${content}`,
    continue: `Continue writing from where this left off. Return only the continuation:\n\n${content}`,
    fix: `Fix grammar, spelling, and punctuation. Return only the corrected text:\n\n${content}`,
    cleanup: `Clean up this voice transcription. Fix punctuation, remove filler words like um/uh. Return only the cleaned text:\n\n${content}`,
    template: `You are a note-taking assistant. Generate a well-structured note about: "${content}"

CRITICAL RULES - you MUST follow these exactly:
- Output ONLY raw HTML. No markdown. No backticks. No code blocks.
- Use ONLY these HTML tags: <h1> <h2> <h3> <p> <ul> <li> <ol> <strong> <em> <hr>
- Do NOT use #, ##, ###, *, **, or any markdown syntax
- Do NOT include \`\`\`html or \`\`\` or any code fences
- Do NOT include <html> <body> <head> <style> <script> tags
- Start directly with an HTML tag like <h1> or <p>
- Make it practical with 3-5 sections and placeholder content

Example of correct output format:
<h1>Meeting Notes</h1><h2>Attendees</h2><p>List attendees here.</p><h2>Agenda</h2><ul><li>Item one</li><li>Item two</li></ul>`,
  };

  const prompt = prompts[action];
  if (!prompt) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const errors: string[] = [];

  // Try Groq
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 1500,
          messages: [
            { role: "system", content: "You output only raw HTML. Never use markdown. Never use code fences. Start your response directly with an HTML tag." },
            { role: "user", content: prompt }
          ],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        let text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          // Strip any markdown code fences if model ignored instructions
          text = text.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          return NextResponse.json({ result: text });
        }
        errors.push(`Groq: empty response`);
      } else {
        errors.push(`Groq ${res.status}: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      errors.push(`Groq exception: ${e}`);
    }
  }

  // Try Gemini
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      if (res.ok) {
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          text = text.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          return NextResponse.json({ result: text });
        }
        errors.push(`Gemini: empty response`);
      } else {
        errors.push(`Gemini ${res.status}: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      errors.push(`Gemini exception: ${e}`);
    }
  }

  // Try Anthropic
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      if (res.ok) {
        let text = data.content?.[0]?.text?.trim();
        if (text) {
          text = text.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          return NextResponse.json({ result: text });
        }
        errors.push(`Anthropic: empty response`);
      } else {
        errors.push(`Anthropic ${res.status}: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      errors.push(`Anthropic exception: ${e}`);
    }
  }

  console.error("AI route failed. Errors:", errors);
  return NextResponse.json({ error: "All AI providers failed.", details: errors }, { status: 500 });
}
