"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";

const FLOATING_NOTES = [
  { text: "Meeting notes\nQ4 planning...", x: 8, y: 12, rotate: -3, delay: 0 },
  { text: "Ideas 💡\n— redesign header\n— add dark mode", x: 72, y: 8, rotate: 2, delay: 0.3 },
  { text: "Daily journal\nToday was...", x: 15, y: 62, rotate: -2, delay: 0.6 },
  { text: "Shopping list\n✓ Milk\n✓ Bread\n○ Eggs", x: 68, y: 58, rotate: 3, delay: 0.9 },
  { text: "Book notes\n\"The key insight...\"", x: 40, y: 75, rotate: -1, delay: 1.2 },
];

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0e0d0b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>

      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", left: "30%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)", transform: "translate(-50%,-50%)" }} />
      </div>

      {/* Floating note cards */}
      {mounted && FLOATING_NOTES.map((note, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${note.x}%`,
          top: `${note.y}%`,
          transform: `rotate(${note.rotate}deg)`,
          background: "#1a1916",
          border: "1px solid #2a2825",
          borderRadius: "10px",
          padding: "14px 16px",
          width: "160px",
          opacity: mounted ? 0.5 : 0,
          animation: `floatNote 6s ease-in-out infinite`,
          animationDelay: `${note.delay}s`,
          pointerEvents: "none",
          backdropFilter: "blur(4px)",
        }}>
          <pre style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#5a5752", lineHeight: "1.6", whiteSpace: "pre-wrap", margin: 0 }}>{note.text}</pre>
        </div>
      ))}

      {/* Center card */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: "400px",
        padding: "0 24px",
        animation: mounted ? "fadeUp 0.6s ease forwards" : "none",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "48px" }}>
          <div style={{ width: "36px", height: "36px", background: "#ffffff", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#0e0d0b", fontWeight: 600 }}>n</span>
          </div>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "24px", color: "#ffffff", letterSpacing: "0.04em" }}>nota</span>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "38px", fontWeight: 400, color: "#ffffff", lineHeight: "1.15", marginBottom: "16px" }}>
            Think clearly.<br />
            <span style={{ color: "#5a5752" }}>Write freely.</span>
          </h1>
          <p style={{ color: "#3a3835", fontSize: "15px", lineHeight: "1.7" }}>
            A minimal space for your thoughts,<br />ideas, and everything in between.
          </p>
        </div>

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "14px 24px",
            background: "#ffffff",
            border: "none",
            borderRadius: "12px",
            color: "#0e0d0b",
            fontSize: "15px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            cursor: loading ? "wait" : "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#f0ede8")}
          onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}
        >
          {loading ? (
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #ccc", borderTopColor: "#333", animation: "spin 0.8s linear infinite" }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        <p style={{ textAlign: "center", marginTop: "20px", color: "#2a2825", fontSize: "12px" }}>
          Free forever · No credit card required
        </p>

        {/* Features row */}
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "40px" }}>
          {["Rich editor", "Dark mode", "Export"].map(f => (
            <span key={f} style={{ fontSize: "11px", color: "#2a2825", letterSpacing: "0.05em" }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes floatNote {
          0%, 100% { transform: translateY(0px) rotate(var(--r, 0deg)); }
          50% { transform: translateY(-8px) rotate(var(--r, 0deg)); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
