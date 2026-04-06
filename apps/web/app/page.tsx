const screens = [
  "Screen 1 Login",
  "Screen 2 Role Select",
  "Screen 3 Team Create / Join",
  "Screen 4 Skill Assessment",
  "Screen 5 Personal Result",
  "Screen 6 Team Dashboard",
  "Screen 7 Topic Decision",
  "Screen 8-A System Framing",
  "Screen 8-B Technical Narrowing",
  "Screen 9 Handoff Layer",
  "Screen 10 Contract Gate",
  "Screen 11 Meeting Hub"
];

export default function HomePage() {
  return (
    <main
      style={{
        display: "grid",
        gap: "2rem",
        minHeight: "100vh",
        padding: "3rem 1.5rem",
        background:
          "radial-gradient(circle at top left, color-mix(in oklab, var(--tf-accent-primary) 14%, transparent), transparent 28%), linear-gradient(180deg, var(--tf-surface-background), hsl(145 28% 94%))"
      }}
    >
      <section
        style={{
          margin: "0 auto",
          width: "100%",
          maxWidth: "72rem",
          display: "grid",
          gap: "1.5rem"
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            padding: "2rem",
            border: "1px solid var(--tf-border-subtle)",
            borderRadius: "1.5rem",
            background: "var(--tf-surface-card)"
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--tf-accent-primary)",
              fontSize: "0.875rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase"
            }}
          >
            TeamForge Workspace
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(2.5rem, 6vw, 4.75rem)" }}>
            Claude Code can start from structure, not guesswork.
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: "46rem",
              color: "var(--tf-text-muted)",
              fontSize: "1.05rem",
              lineHeight: 1.7
            }}
          >
            This bootstrap page exists so the web app compiles immediately while
            the real kickoff flow is implemented screen by screen from the docs.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem"
          }}
        >
          {screens.map((screen) => (
            <article
              key={screen}
              style={{
                padding: "1rem 1.1rem",
                border: "1px solid var(--tf-border-subtle)",
                borderRadius: "1rem",
                background: "color-mix(in oklab, var(--tf-surface-card) 88%, white)"
              }}
            >
              <strong>{screen}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
