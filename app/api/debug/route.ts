import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasGroq: !!process.env.GROQ_API_KEY,
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    groqPrefix: process.env.GROQ_API_KEY?.slice(0, 8) || "not set",
  });
}
