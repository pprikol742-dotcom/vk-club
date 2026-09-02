import type { ReactNode } from "react";

export function TealModal({
  title,
  onClose,
  children,
  footer,
  width = 420,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,2,12,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width,
          maxWidth: "92vw",
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          overflow: "hidden",
          background: "#1a1030",
          border: "1px solid var(--panel-border)",
          boxShadow: "0 0 40px rgba(51,255,240,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: "linear-gradient(90deg, #2fe0c9, #33fff0)",
            color: "#0a0715",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          <span>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#0a0715",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20, overflowY: "auto" }}>{children}</div>

        {footer && (
          <div style={{ padding: "10px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, borderTop: "1px solid var(--panel-border)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
