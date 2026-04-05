"use client";

import { useEffect, useRef, useState, useId } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/** Strip lines that commonly cause mermaid parse errors */
function sanitizeMermaidCode(raw: string): string {
  return raw
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^style\s+/.test(trimmed)) return false;
      if (/^classDef\s+/.test(trimmed)) return false;
      if (/^class\s+/.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

/** Strip script/event handlers from SVG output for XSS protection */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export default function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const reactId = useId();

  useEffect(() => {
    if (!code || !containerRef.current) return;

    let cancelled = false;
    setStatus("loading");

    const renderDiagram = async () => {
      let mermaid;
      try {
        mermaid = (await import("mermaid")).default;
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }

      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        fontFamily: "Pretendard, sans-serif",
        flowchart: { useMaxWidth: true, htmlLabels: true },
        securityLevel: "loose",
      });

      const sanitized = sanitizeMermaidCode(code);
      const id = `mmd${reactId.replace(/:/g, "")}-${Date.now()}`;

      try {
        const { svg, bindFunctions } = await mermaid.render(
          id,
          sanitized,
          containerRef.current!,
        );
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = sanitizeSvg(svg);
          bindFunctions?.(containerRef.current);
          setStatus("ok");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, retryCount, reactId]);

  return (
    <div className="rounded-r2 bg-[var(--tf-bg-neutral-weak)] relative">
      {/* Container always in DOM so mermaid can render into it */}
      <div
        ref={containerRef}
        className={`p-4 overflow-auto [&_svg]:max-w-full ${status !== "ok" ? "min-h-[80px]" : ""}`}
        style={status === "loading" ? { visibility: "hidden", position: "absolute" } : undefined}
      />

      {status === "loading" && (
        <div className="p-6 flex items-center justify-center min-h-[80px]">
          <div className="w-5 h-5 border-2 border-[var(--tf-fg-brand)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {status === "error" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-[var(--tf-fg-warning)]">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[12px] font-medium">다이어그램 렌더링 실패</span>
          </div>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="h-7 px-3 rounded-r1 border border-[var(--tf-stroke-neutral)] text-[11px] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)] hover:text-[var(--tf-fg-brand)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            다시 시도
          </button>
          <details className="text-[11px]">
            <summary className="text-[var(--tf-fg-subtle)] cursor-pointer">원본 코드 보기</summary>
            <pre className="mt-2 text-[var(--tf-fg-default)] whitespace-pre-wrap font-mono bg-[var(--tf-bg-layer-default)] rounded-r1 p-2 max-h-[200px] overflow-auto">
              {code}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
