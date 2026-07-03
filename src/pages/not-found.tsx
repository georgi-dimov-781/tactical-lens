import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        fontFamily: "Inter, sans-serif",
        color: "white",
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 800, color: "rgba(255,255,255,0.06)", letterSpacing: "-0.04em" }}>404</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Page not found</div>
      <button
        onClick={() => setLocation("/")}
        style={{
          marginTop: 8,
          padding: "10px 20px",
          borderRadius: 8,
          border: "1px solid rgba(74,222,128,0.3)",
          background: "rgba(74,222,128,0.08)",
          color: "#4ade80",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "Inter, sans-serif",
        }}
      >
        ← Back to matches
      </button>
    </div>
  );
}
