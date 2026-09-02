const STEP_PROGRESS: Record<string, number> = {
  Init: 5,
  VKWebAppInit: 25,
  VKWebAppGetUserInfo: 55,
  "verify-launch": 80,
  "Loading club": 95,
};

export function SplashScreen({ step }: { step: string }) {
  const progress = STEP_PROGRESS[step] ?? 10;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* "Ставь 5!" бейдж */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: "radial-gradient(circle, #ff3ec8 0%, #7b0f4a 70%)",
          border: "3px solid #ffd700",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: 13,
          textAlign: "center",
          transform: "rotate(-8deg)",
          boxShadow: "0 0 18px rgba(255,62,200,0.7)",
        }}
      >
        <span>Ставь 5!</span>
        <span style={{ fontSize: 12, letterSpacing: 1 }}>★★★★★</span>
      </div>

      {/* Заголовок */}
      <h1
        style={{
          fontSize: 56,
          fontWeight: 900,
          fontStyle: "italic",
          color: "var(--neon-magenta)",
          textShadow:
            "0 0 10px rgba(255,62,200,0.9), 0 0 24px rgba(255,62,200,0.6), 0 0 40px rgba(255,62,200,0.3)",
          margin: "0 0 12px",
          letterSpacing: 1,
        }}
      >
        В Клубе
      </h1>

      {/* DJ-силуэт — временная CSS-заглушка, заменим на настоящую иллюстрацию */}
      <div
        style={{
          position: "relative",
          width: 260,
          height: 220,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 30%, rgba(123,47,247,0.55), transparent 65%)",
          }}
        />
        <svg viewBox="0 0 200 180" style={{ width: "100%", height: "100%", position: "relative" }}>
          {/* очень грубый силуэт диджея с поднятыми руками — плейсхолдер */}
          <path
            d="M100 40 
               C 85 40 75 52 75 66 
               C 75 78 82 86 90 90
               L 60 30 L 50 10
               M 90 90 L 40 130
               M 110 90 L 150 30 L 160 10
               M 110 90 C 118 86 125 78 125 66
               C 125 52 115 40 100 40
               M 90 92 C 80 100 74 116 74 140 L 74 175
               M 110 92 C 120 100 126 116 126 140 L 126 175"
            stroke="#ff3ec8"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />
        </svg>
        {/* летающие лайки вокруг */}
        {[
          { top: "10%", left: "-4%" }, { top: "30%", left: "-14%" }, { top: "55%", left: "-6%" },
          { top: "15%", right: "-4%" }, { top: "35%", right: "-14%" }, { top: "60%", right: "-6%" },
        ].map((pos, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              fontSize: 20,
              opacity: 0.85,
              animation: `smoke-rise 2.4s ease-in-out ${i * 0.3}s infinite`,
              ...pos,
            }}
          >
            👍
          </span>
        ))}
      </div>

      {/* прогресс-бар загрузки — настоящий, привязан к реальному шагу инициализации */}
      <div style={{ width: "70%", maxWidth: 420, height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta))",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
