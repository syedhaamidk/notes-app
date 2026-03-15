"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

const FLOATING_NOTES = [
  { id: 1, text: "Meeting notes\nQ4 planning session...", x: 7, y: 10, rotate: -3 },
  { id: 2, text: "Ideas 💡\n— redesign header\n— add dark mode\n— ship it!", x: 70, y: 7, rotate: 2 },
  { id: 3, text: "Daily journal\nToday was productive...", x: 6, y: 58, rotate: -2 },
  { id: 4, text: "Shopping list\n✓ Milk\n✓ Bread\n○ Eggs\n○ Coffee", x: 72, y: 55, rotate: 3 },
  { id: 5, text: "Book notes\n\"Clarity comes\nfrom action.\"", x: 38, y: 80, rotate: -1 },
  { id: 6, text: "Recipe 🍜\nRamen broth:\n- Miso paste\n- Soy sauce", x: 80, y: 28, rotate: 4 },
  { id: 7, text: "Goals 2026\n★ Ship the app\n★ Read 24 books", x: 1, y: 30, rotate: -4 },
];

function FloatingCard({ note, index }: { note: typeof FLOATING_NOTES[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [floatY, setFloatY] = useState(0);
  const animRef = useRef<number>();
  const startTime = useRef(Date.now() + index * 800);

  useEffect(() => {
    const animate = () => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      setFloatY(Math.sin(elapsed * 0.6) * 6);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { setClicked(true); setTimeout(() => setClicked(false), 600); }}
      style={{
        position: "absolute",
        left: `${note.x}%`,
        top: `${note.y}%`,
        transform: `translateY(${hovered ? -12 : floatY}px) rotate(${hovered ? 0 : note.rotate}deg) scale(${clicked ? 0.95 : hovered ? 1.06 : 1})`,
        background: hovered ? "#252320" : "#1a1916",
        border: `1px solid ${hovered ? "#3a3835" : "#252320"}`,
        borderRadius: "12px",
        padding: "14px 16px",
        width: "165px",
        opacity: hovered ? 0.95 : 0.45,
        cursor: "pointer",
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease, background 0.2s ease, box-shadow 0.3s ease",
        boxShadow: hovered ? "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" : "none",
        zIndex: hovered ? 20 : 1,
      }}>
      <div style={{ position: "absolute", top: "10px", right: "10px", width: "6px", height: "6px", borderRadius: "50%", background: hovered ? "#4a4744" : "#2a2825", transition: "background 0.2s" }} />
      <pre style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "11px", color: hovered ? "#9a9690" : "#3a3835", lineHeight: "1.65", whiteSpace: "pre-wrap", margin: 0, transition: "color 0.2s" }}>{note.text}</pre>
      {hovered && (
        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #2a2825", display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "10px", color: "#4a4744" }}>✦</span>
          <span style={{ fontSize: "10px", color: "#4a4744", fontFamily: "'DM Sans',sans-serif" }}>nota</span>
        </div>
      )}
    </div>
  );
}

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleMouse = (e: MouseEvent) => setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouse);
    return () => { window.removeEventListener("resize", handleResize); window.removeEventListener("mousemove", handleMouse); };
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0e0d0b", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>

      {/* Mouse glow — desktop only */}
      {mounted && !isMobile && (
        <div style={{
          position: "absolute", width: "700px", height: "700px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 70%)",
          left: `${mousePos.x * 100}%`, top: `${mousePos.y * 100}%`,
          transform: "translate(-50%, -50%)", pointerEvents: "none",
          transition: "left 0.8s ease, top 0.8s ease",
        }} />
      )}

      {/* Floating cards — desktop only */}
      {mounted && !isMobile && FLOATING_NOTES.map((note, i) => (
        <FloatingCard key={note.id} note={note} index={i} />
      ))}

      {/* Mobile: subtle background pattern */}
      {mounted && isMobile && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {/* Soft radial glows */}
          <div style={{ position: "absolute", top: "10%", left: "20%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "20%", right: "10%", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)" }} />
          {/* Minimal grid lines */}
          <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
            {[...Array(8)].map((_, i) => (
              <line key={i} x1={`${i * 14}%`} y1="0" x2={`${i * 14}%`} y2="100%" stroke="white" strokeWidth="1" />
            ))}
            {[...Array(12)].map((_, i) => (
              <line key={i} x1="0" y1={`${i * 9}%`} x2="100%" y2={`${i * 9}%`} stroke="white" strokeWidth="1" />
            ))}
          </svg>
        </div>
      )}

      {/* Center content */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "380px", padding: "0 28px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: isMobile ? "40px" : "44px" }}>
          <div style={{ width: "36px", height: "36px", background: "#ffffff", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
            <span style={{ fontFamily: "Georgia,serif", fontSize: "18px", color: "#0e0d0b", fontWeight: 600 }}>n</span>
          </div>
          <span style={{ fontFamily: "Georgia,serif", fontSize: "22px", color: "#ffffff", letterSpacing: "0.06em" }}>nota</span>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: isMobile ? "34px" : "40px", fontWeight: 400, color: "#ffffff", lineHeight: "1.15", marginBottom: "14px", letterSpacing: "-0.01em" }}>
            Think clearly.<br />
            <span style={{ color: "#3a3835" }}>Write freely.</span>
          </h1>
          <p style={{ color: "#2e2c28", fontSize: "14px", lineHeight: "1.7" }}>
            A minimal space for your thoughts,<br />ideas, and everything in between.
          </p>
        </div>

        {/* Sign in */}
        <button
          onClick={handleSignIn} disabled={loading}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "15px 24px", background: "#ffffff", border: "none", borderRadius: "12px", color: "#0e0d0b", fontSize: "15px", fontFamily: "'DM Sans',sans-serif", fontWeight: 500, cursor: loading ? "wait" : "pointer", transition: "all 0.2s ease", boxShadow: "0 1px 0 rgba(255,255,255,0.1)" }}
          onMouseEnter={e => { if (!isMobile) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)"; }}}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.1)"; }}
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

        <p style={{ textAlign: "center", marginTop: "14px", color: "#1e1d1a", fontSize: "12px" }}>
          Free forever · No credit card required
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "32px", flexWrap: "wrap" }}>
          {["Rich editor", "Dark mode", "AI assistant", "Export"].map(f => (
            <span key={f} style={{ fontSize: "11px", color: "#2a2825", background: "#1a1916", border: "1px solid #252320", borderRadius: "999px", padding: "3px 10px" }}>{f}</span>
          ))}
        </div>

        {/* Mobile: mini note previews at bottom */}
        {isMobile && mounted && (
          <div style={{ marginTop: "48px", display: "flex", gap: "8px", justifyContent: "center", opacity: 0.3 }}>
            {["📋 Meeting notes", "💡 Ideas", "📔 Journal"].map(t => (
              <div key={t} style={{ background: "#1a1916", border: "1px solid #252320", borderRadius: "8px", padding: "6px 10px", fontSize: "10px", color: "#3a3835", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>{t}</div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
