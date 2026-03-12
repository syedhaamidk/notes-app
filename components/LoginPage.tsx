"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a1916 0%, #2d2a24 100%)" }}>
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-24 left-16 w-64 h-64 rounded-full"
            style={{ background: "radial-gradient(circle, #2d6a4f, transparent)" }} />
          <div className="absolute bottom-24 right-16 w-48 h-48 rounded-full"
            style={{ background: "radial-gradient(circle, #8b5e3c, transparent)" }} />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent)" }}>
              <span style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "16px" }}>n</span>
            </div>
            <span style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "20px", letterSpacing: "0.02em" }}>nota</span>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "52px", lineHeight: "1.1", fontWeight: 400 }}>
              Your thoughts,<br />
              <em style={{ color: "#a8d5b8" }}>beautifully</em><br />
              organized.
            </h1>
            <p className="mt-6" style={{ color: "#8a8880", fontSize: "17px", lineHeight: "1.7", maxWidth: "380px" }}>
              A minimalist notes app built for clarity. Write freely, organize effortlessly, and export with style.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: "✦", text: "Rich markdown editor" },
              { icon: "◈", text: "Tags & smart organization" },
              { icon: "⬡", text: "Beautiful export templates" },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3">
                <span style={{ color: "var(--accent)", fontSize: "12px" }}>{item.icon}</span>
                <span style={{ color: "#8a8880", fontSize: "15px" }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p style={{ color: "#4a4844", fontSize: "13px" }}>
            Free forever. No credit card required.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--text)" }}>
              <span style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "16px" }}>n</span>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.02em" }}>nota</span>
          </div>

          <div className="mb-10">
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "30px", fontWeight: 500, marginBottom: "8px" }}>
              Welcome back
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
              Sign in to access your notes
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl border transition-all hover:shadow-md active:scale-[0.99]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontSize: "15px",
              fontFamily: "var(--font-body)",
              cursor: loading ? "wait" : "pointer",
              boxShadow: "var(--shadow-sm)",
            }}>
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--text)" }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="text-center mt-6" style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            By signing in, you agree to our{" "}
            <span style={{ color: "var(--text-secondary)", cursor: "pointer" }}>Terms</span>
            {" & "}
            <span style={{ color: "var(--text-secondary)", cursor: "pointer" }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
