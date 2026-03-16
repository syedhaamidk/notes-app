"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

const FLOATING_NOTES = [
  { id: 1, text: "Meeting notes\nQ4 planning session...", x: 7, y: 10, rotate: -3 },
  { id: 2, text: "Ideas 💡\n— redesign header\n— add dark mode\n— ship it!", x: 70, y: 7, rotate: 2 },
  { id: 3, text: "Daily journal\nToday was a good day...", x: 6, y: 55, rotate: -2 },
  { id: 4, text: "Shopping list\n✓ Milk\n✓ Bread\n○ Eggs\n○ Coffee", x: 72, y: 52, rotate: 3 },
  { id: 5, text: "Book notes\n\"Clarity comes\nfrom action.\"", x: 38, y: 76, rotate: -1 },
  { id: 6, text: "Recipe 🍜\nRamen broth:\n- Miso paste\n- Soy sauce", x: 80, y: 28, rotate: 4 },
  { id: 7, text: "Goals 2026\n★ Ship the app\n★ Read 24 books", x: 1, y: 30, rotate: -4 },
];

// ── Floating card — original behaviour + typewriter on hover ───────────────
function FloatingCard({
  note,
  index,
}: {
  note: (typeof FLOATING_NOTES)[0];
  index: number;
}) {
  const [hovered, setHovered]         = useState(false);
  const [displayText, setDisplayText] = useState(note.text);
  const [floatY, setFloatY]           = useState(0);
  const animRef   = useRef<number>();
  const typeRef   = useRef<ReturnType<typeof setTimeout>>();
  const startTime = useRef(Date.now() + index * 800);
  const isTyping  = useRef(false);

  useEffect(() => {
    const animate = () => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      setFloatY(Math.sin(elapsed * 0.6) * 6);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const startTyping = () => {
    if (isTyping.current) return;
    isTyping.current = true;
    setDisplayText("");
    const txt = note.text;
    let idx = 0;
    const tick = () => {
      if (!isTyping.current) { setDisplayText(txt); return; }
      setDisplayText(txt.slice(0, idx++));
      if (idx <= txt.length) {
        typeRef.current = setTimeout(tick, 26 + Math.random() * 20);
      } else {
        setDisplayText(txt + "▍");
        typeRef.current = setTimeout(() => {
          setDisplayText(txt);
          isTyping.current = false;
        }, 500);
      }
    };
    tick();
  };

  const stopTyping = () => {
    isTyping.current = false;
    if (typeRef.current) clearTimeout(typeRef.current);
    setDisplayText(note.text);
  };

  useEffect(() => () => { if (typeRef.current) clearTimeout(typeRef.current); }, []);

  return (
    <div
      onMouseEnter={() => { setHovered(true);  startTyping(); }}
      onMouseLeave={() => { setHovered(false); stopTyping();  }}
      style={{
        position:     "absolute",
        left:         `${note.x}%`,
        top:          `${note.y}%`,
        transform:    hovered
          ? "translateY(-12px) rotate(0deg) scale(1.06)"
          : `translateY(${floatY}px) rotate(${note.rotate}deg)`,
        background:   hovered ? "#252320" : "#1a1916",
        border:       `1px solid ${hovered ? "#3a3835" : "#252220"}`,
        borderRadius: "12px",
        padding:      "14px 16px",
        width:        "165px",
        opacity:      hovered ? 1 : 0.55,
        cursor:       "pointer",
        transition:   "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease, background 0.2s ease, box-shadow 0.3s ease",
        boxShadow:    hovered
          ? "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)"
          : "none",
        zIndex: hovered ? 20 : 1,
      }}
    >
      <div style={{
        position:     "absolute",
        top:          "10px",
        right:        "10px",
        width:        "6px",
        height:       "6px",
        borderRadius: "50%",
        background:   hovered ? "#4a4744" : "#2a2825",
        transition:   "background 0.2s",
      }} />
      <pre style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize:   "11px",
        color:      hovered ? "#9a9690" : "#5a5653",
        lineHeight: "1.65",
        whiteSpace: "pre-wrap",
        margin:     0,
        minHeight:  "40px",
        transition: "color 0.2s",
      }}>
        {displayText}
      </pre>
      {hovered && (
        <div style={{
          marginTop:  "10px",
          paddingTop: "8px",
          borderTop:  "1px solid #2a2825",
          display:    "flex",
          alignItems: "center",
        }}>
          <span style={{ fontSize: "10px", color: "#4a4744" }}>✦ nota</span>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const [mounted, setMounted]           = useState(false);
  const [isMobile, setIsMobile]         = useState(false);
  const [mousePos, setMousePos]         = useState({ x: 0.5, y: 0.5 });
  const [signingIn, setSigningIn]       = useState(false);

  // Note card
  const [noteTitle, setNoteTitle]       = useState("");
  const [noteBody, setNoteBody]         = useState("");
  const [charCount, setCharCount]       = useState(0);
  const [cardFocused, setCardFocused]   = useState(false);

  // Login modal (shown after "Save note")
  const [showModal, setShowModal]       = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const onMouse = (e: MouseEvent) =>
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener("mousemove", onMouse);

    // Restore draft
    const t = localStorage.getItem("nota_draft_title") || "";
    const b = localStorage.getItem("nota_draft_body")  || "";
    if (t) setNoteTitle(t);
    if (b) { setNoteBody(b); setCharCount(b.length); }

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNoteTitle(e.target.value);
    localStorage.setItem("nota_draft_title", e.target.value);
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setNoteBody(v);
    setCharCount(v.length);
    localStorage.setItem("nota_draft_body", v);
  };

  const handleSaveNote = () => {
    if (!noteTitle.trim() && !noteBody.trim()) {
      titleRef.current?.focus();
      return;
    }
    setShowModal(true);
  };

  const handleModalSignIn = async () => {
    setModalLoading(true);
    localStorage.setItem("nota_pending_save", "true");
    await signIn("google", { callbackUrl: "/dashboard?new=1" });
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const modalTitle = noteTitle.trim()
    ? `"${noteTitle.slice(0, 30)}${noteTitle.length > 30 ? "…" : ""}"`
    : "your note";

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes nota-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nota-pop {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes nota-line {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .nota-t::placeholder { color: #3a3835; font-style: italic; }
        .nota-b::placeholder { color: #2e2b28; }
      `}</style>

      <div style={{
        minHeight:      "100vh",
        background:     "#0e0d0b",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        overflow:       "hidden",
        position:       "relative",
      }}>

        {/* ── Mouse glow ── */}
        {mounted && !isMobile && (
          <div style={{
            position:     "absolute",
            width:        "700px",
            height:       "700px",
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 70%)",
            left:         `${mousePos.x * 100}%`,
            top:          `${mousePos.y * 100}%`,
            transform:    "translate(-50%, -50%)",
            pointerEvents: "none",
            transition:   "left 0.8s ease, top 0.8s ease",
          }} />
        )}

        {/* ── Dot grid — desktop ── */}
        {mounted && !isMobile && (
          <div style={{
            position:        "absolute",
            inset:           0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize:  "28px 28px",
            pointerEvents:   "none",
          }} />
        )}

        {/* ── Floating cards — desktop ── */}
        {mounted && !isMobile && FLOATING_NOTES.map((n, i) => (
          <FloatingCard key={n.id} note={n} index={i} />
        ))}

        {/* ── Animated notebook lines — mobile ── */}
        {mounted && isMobile && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} style={{
                position:        "absolute",
                left:            0,
                right:           0,
                height:          "1px",
                top:             `${i * 28 + 60}px`,
                background:      "rgba(255,255,255,0.022)",
                transform:       "scaleX(0)",
                transformOrigin: "left",
                animation:       `nota-line 0.7s ease ${i * 0.045}s forwards`,
              }} />
            ))}
            <div style={{
              position: "absolute", top: "15%", left: "50%",
              transform: "translateX(-50%)", width: "400px", height: "400px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
            }} />
          </div>
        )}

        {/* ── Center content ── */}
        <div style={{
          position:  "relative",
          zIndex:    10,
          width:     "100%",
          maxWidth:  "480px",
          padding:   isMobile ? "0 22px" : "0 28px",
          opacity:   mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
        }}>

          {/* Logo */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "12px",
            marginBottom:   isMobile ? "28px" : "32px",
          }}>
            <div style={{
              width:        "40px",
              height:       "40px",
              background:   "#1a1916",
              borderRadius: "12px",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              boxShadow:    "0 4px 16px rgba(0,0,0,0.4)",
            }}>
              <span style={{
                fontFamily: "Georgia, serif",
                fontSize:   "20px",
                color:      "#ffffff",
                fontWeight: 500,
                fontStyle:  "italic",
              }}>n</span>
            </div>
            <span style={{
              fontFamily:    "Georgia, serif",
              fontSize:      "24px",
              color:         "#ffffff",
              letterSpacing: "-0.02em",
            }}>nota</span>
          </div>

          {/* ── New tagline ── */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? "24px" : "28px" }}>
            <h1 style={{
              fontFamily:    "Georgia, serif",
              fontSize:      isMobile ? "34px" : "46px",
              fontWeight:    400,
              color:         "#ffffff",
              lineHeight:    "1.18",
              margin:        0,
              letterSpacing: "-0.015em",
            }}>
              Your mind deserves
              <br />
              <em style={{ color: "#a09890" }}>a room of its own.</em>
            </h1>
          </div>

          {/* ── Note card — the hero CTA ── */}
          <div style={{
            background:   "#181614",
            border:       `1px solid ${cardFocused ? "#3a3835" : "#252220"}`,
            borderRadius: "18px",
            padding:      isMobile ? "18px 18px 16px" : "22px 24px 18px",
            marginBottom: "16px",
            boxShadow:    cardFocused
              ? "0 0 0 1px rgba(255,255,255,0.04), 0 12px 36px rgba(0,0,0,0.45)"
              : "0 4px 24px rgba(0,0,0,0.35)",
            transition:   "border-color 0.2s ease, box-shadow 0.2s ease",
          }}>

            {/* Card header */}
            <div style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "7px",
              marginBottom: "14px",
            }}>
              <div style={{
                width:        "6px",
                height:       "6px",
                borderRadius: "50%",
                background:   cardFocused ? "#3a3835" : "#252220",
                transition:   "background 0.2s",
              }} />
              <span style={{
                fontSize:      "10px",
                color:         cardFocused ? "#4a4744" : "#3a3835",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily:    "'DM Sans', sans-serif",
                transition:    "color 0.2s",
              }}>New note</span>
            </div>

            {/* Title */}
            <input
              ref={titleRef}
              value={noteTitle}
              onChange={handleTitleChange}
              onFocus={() => setCardFocused(true)}
              onBlur={() => setCardFocused(false)}
              placeholder="Title your note…"
              maxLength={60}
              className="nota-t"
              style={{
                width:        "100%",
                background:   "transparent",
                border:       "none",
                outline:      "none",
                color:        "#e8e3dc",
                fontFamily:   "Georgia, serif",
                fontSize:     isMobile ? "20px" : "22px",
                marginBottom: "10px",
                padding:      0,
                boxSizing:    "border-box",
              }}
            />

            {/* Body */}
            <textarea
              value={noteBody}
              onChange={handleBodyChange}
              onFocus={() => setCardFocused(true)}
              onBlur={() => setCardFocused(false)}
              placeholder="Start writing anything…"
              rows={isMobile ? 3 : 4}
              maxLength={400}
              className="nota-b"
              style={{
                width:      "100%",
                background: "transparent",
                border:     "none",
                outline:    "none",
                color:      "#9a9690",
                fontFamily: "'DM Sans', sans-serif",
                fontSize:   "14px",
                lineHeight: "1.72",
                resize:     "none",
                padding:    0,
                boxSizing:  "border-box",
              }}
            />

            {/* Footer */}
            <div style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              marginTop:      "14px",
              paddingTop:     "12px",
              borderTop:      "1px solid #1e1c1a",
            }}>
              <span style={{
                fontSize:   "11px",
                color:      charCount > 360 ? "#6a4035" : "#2e2b28",
                fontFamily: "'DM Sans', sans-serif",
                transition: "color 0.2s",
              }}>
                {charCount} / 400
              </span>

              <button
                onClick={handleSaveNote}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "7px",
                  padding:      "10px 20px",
                  background:   "#f5f2ee",
                  border:       "none",
                  borderRadius: "11px",
                  color:        "#0e0d0b",
                  fontSize:     "14px",
                  fontFamily:   "'DM Sans', sans-serif",
                  fontWeight:   500,
                  cursor:       "pointer",
                  transition:   "background 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.transform  = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#f5f2ee";
                  e.currentTarget.style.transform  = "translateY(0)";
                }}
                onTouchStart={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
                onTouchEnd={e   => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8.5L6 12.5L14 4" stroke="#0e0d0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Save note
              </button>
            </div>
          </div>

          {/* ── Sign in text link ── */}
          <p style={{
            textAlign:  "center",
            fontSize:   "14px",
            color:      "#5a5550",
            fontFamily: "'DM Sans', sans-serif",
            margin:     0,
          }}>
            Already have an account?{" "}
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              style={{
                background:     "none",
                border:         "none",
                padding:        0,
                color:          signingIn ? "#5a5550" : "#9a9288",
                fontSize:       "14px",
                fontFamily:     "'DM Sans', sans-serif",
                cursor:         signingIn ? "wait" : "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                transition:     "color 0.2s",
              }}
              onMouseEnter={e => { if (!signingIn) e.currentTarget.style.color = "#c8bfb2"; }}
              onMouseLeave={e => { e.currentTarget.style.color = signingIn ? "#5a5550" : "#9a9288"; }}
            >
              {signingIn ? "Signing in…" : "Sign in →"}
            </button>
          </p>

          {/* Mobile mini note previews — original */}
          {isMobile && mounted && (
            <div style={{
              display:        "flex",
              gap:            "8px",
              justifyContent: "center",
              marginTop:      "24px",
              opacity:        0.55,
            }}>
              {["📋 Meeting", "💡 Ideas", "📔 Journal"].map(t => (
                <div key={t} style={{
                  background:   "#1a1815",
                  border:       "1px solid #2a2825",
                  borderRadius: "10px",
                  padding:      "6px 12px",
                  fontSize:     "11px",
                  color:        "#5a5550",
                  fontFamily:   "'DM Sans', sans-serif",
                  whiteSpace:   "nowrap",
                }}>{t}</div>
              ))}
            </div>
          )}
        </div>

        {/* ── Save → login modal ── */}
        {showModal && (
          <div
            onClick={() => setShowModal(false)}
            style={{
              position:            "fixed",
              inset:               0,
              background:          "rgba(0,0,0,0.8)",
              zIndex:              200,
              display:             "flex",
              alignItems:          "center",
              justifyContent:      "center",
              padding:             "0 16px",
              backdropFilter:      "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background:   "#141311",
                border:       "1px solid #2e2c29",
                borderRadius: "22px",
                padding:      "30px 26px",
                width:        "100%",
                maxWidth:     "340px",
                animation:    "nota-pop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              {/* Logo */}
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            "10px",
                marginBottom:   "16px",
              }}>
                <div style={{
                  width:        "34px",
                  height:       "34px",
                  background:   "#1a1916",
                  borderRadius: "10px",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                }}>
                  <span style={{
                    fontFamily: "Georgia, serif",
                    fontSize:   "17px",
                    color:      "#fff",
                    fontStyle:  "italic",
                  }}>n</span>
                </div>
                <span style={{
                  fontFamily:    "Georgia, serif",
                  fontSize:      "20px",
                  color:         "#fff",
                  letterSpacing: "-0.02em",
                }}>nota</span>
              </div>

              <p style={{
                textAlign:    "center",
                color:        "#a09890",
                fontSize:     "14px",
                fontFamily:   "'DM Sans', sans-serif",
                lineHeight:   "1.55",
                marginBottom: "22px",
              }}>
                Sign in to save{" "}
                <em style={{ color: "#d4cbc2", fontFamily: "Georgia, serif" }}>
                  {modalTitle}
                </em>
                <br />
                <span style={{ fontSize: "12px", color: "#5a5550" }}>
                  Your note will be waiting for you.
                </span>
              </p>

              <button
                onClick={handleModalSignIn}
                disabled={modalLoading}
                style={{
                  width:         "100%",
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent: "center",
                  gap:           "11px",
                  padding:       "14px 20px",
                  background:    "#ffffff",
                  border:        "none",
                  borderRadius:  "13px",
                  color:         "#0e0d0b",
                  fontSize:      "15px",
                  fontFamily:    "'DM Sans', sans-serif",
                  fontWeight:    500,
                  cursor:        modalLoading ? "wait" : "pointer",
                  boxShadow:     "0 2px 12px rgba(0,0,0,0.3)",
                  transition:    "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={e => {
                  if (!modalLoading) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
                }}
              >
                {modalLoading ? (
                  <div style={{
                    width:          "18px",
                    height:         "18px",
                    borderRadius:   "50%",
                    border:         "2px solid #ccc",
                    borderTopColor: "#333",
                    animation:      "spin 0.8s linear infinite",
                  }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {modalLoading ? "Signing in…" : "Continue with Google"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                style={{
                  width:      "100%",
                  marginTop:  "10px",
                  padding:    "10px",
                  background: "transparent",
                  border:     "none",
                  color:      "#5a5550",
                  fontSize:   "13px",
                  fontFamily: "'DM Sans', sans-serif",
                  cursor:     "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#9a9690")}
                onMouseLeave={e => (e.currentTarget.style.color = "#5a5550")}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
