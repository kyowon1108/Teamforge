"use client";

import { useEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Sanitizers
// ─────────────────────────────────────────────────────────────────

function sanitizeMermaidCode(raw: string): string {
  return raw
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (/^style\s+/.test(t)) return false;
      if (/^classDef\s+/.test(t)) return false;
      if (/^class\s+/.test(t)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

// ─────────────────────────────────────────────────────────────────
// MermaidCanvas — renders diagram + zoom/pan interactions
// ─────────────────────────────────────────────────────────────────

interface MermaidCanvasProps {
  code: string;
  className?: string;
}

function MermaidCanvas({ code, className = "" }: MermaidCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panAreaRef = useRef<HTMLDivElement>(null);
  const [renderStatus, setRenderStatus] = useState<"loading" | "ok" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const reactId = useId();

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Keep refs in sync for use inside non-reactive event handlers
  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);
  const isDraggingRef = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { translateRef.current = translate; }, [translate]);

  // ── Mermaid render ──────────────────────────────────────────────
  useEffect(() => {
    if (!code || !containerRef.current) return;
    let cancelled = false;
    setRenderStatus("loading");

    const run = async () => {
      let mermaid;
      try {
        mermaid = (await import("mermaid")).default;
      } catch {
        if (!cancelled) setRenderStatus("error");
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
      const id = `mmd${reactId.replace(/:/g, "")}-${retryCount}-${Date.now()}`;

      try {
        const { svg, bindFunctions } = await mermaid.render(
          id,
          sanitized,
          containerRef.current!,
        );
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = sanitizeSvg(svg);
          bindFunctions?.(containerRef.current);
          setRenderStatus("ok");
        }
      } catch {
        if (!cancelled) setRenderStatus("error");
      }
    };

    run();
    return () => { cancelled = true; };
  }, [code, retryCount, reactId]);

  // ── Wheel: trackpad scroll (pan) + pinch (zoom) ─────────────────
  useEffect(() => {
    const el = panAreaRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch-to-zoom or Ctrl+scroll
        const factor = Math.exp(-e.deltaY * 0.008);
        setScale((s) => Math.max(0.2, Math.min(6, s * factor)));
      } else {
        // Two-finger trackpad scroll → pan
        setTranslate((t) => ({ x: t.x - e.deltaX, y: t.y - e.deltaY }));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Touch: single-finger drag (pan) + two-finger pinch (zoom) ───
  useEffect(() => {
    const el = panAreaRef.current;
    if (!el) return;

    let lastPinchDist: number | null = null;

    const getPinchDist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastPinchDist = getPinchDist(e.touches);
      } else if (e.touches.length === 1) {
        isDraggingRef.current = true;
        setIsDragging(true);
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          tx: translateRef.current.x,
          ty: translateRef.current.y,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && lastPinchDist !== null) {
        const dist = getPinchDist(e.touches);
        const ratio = dist / lastPinchDist;
        setScale((s) => Math.max(0.2, Math.min(6, s * ratio)));
        lastPinchDist = dist;
      } else if (e.touches.length === 1 && isDraggingRef.current) {
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        setTranslate({ x: dragStart.current.tx + dx, y: dragStart.current.ty + dy });
      }
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      lastPinchDist = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // ── Mouse drag ──────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: translateRef.current.x,
      ty: translateRef.current.y,
    };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDraggingRef.current) return;
    setTranslate({
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    });
  }

  function onMouseUp() {
    isDraggingRef.current = false;
    setIsDragging(false);
  }

  function resetView() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }

  return (
    <div className={`relative overflow-hidden bg-[var(--tf-bg-neutral-weak)] ${className}`}>
      {/* Pannable / zoomable area */}
      <div
        ref={panAreaRef}
        className="w-full h-full"
        style={{ cursor: isDragging ? "grabbing" : "grab", userSelect: "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "50% 20%",
            willChange: "transform",
            transition: isDragging ? "none" : "transform 0.06s ease-out",
          }}
        >
          {/* Container must always be in the DOM for mermaid to render into */}
          <div
            ref={containerRef}
            className="p-4 [&_svg]:max-w-full [&_svg]:h-auto"
            style={{ visibility: renderStatus === "loading" ? "hidden" : "visible" }}
          />
        </div>
      </div>

      {/* Loading spinner */}
      {renderStatus === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-5 h-5 border-2 border-[var(--tf-fg-brand)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {renderStatus === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
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
        </div>
      )}

      {/* Zoom controls (top-right overlay, shown when rendered) */}
      {renderStatus === "ok" && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5">
          <button
            onClick={() => setScale((s) => Math.max(0.2, s / 1.25))}
            aria-label="축소"
            className="w-7 h-7 rounded-r1 flex items-center justify-center bg-[var(--tf-bg-layer-default)]/90 border border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)] hover:text-[var(--tf-fg-brand)] transition-colors cursor-pointer backdrop-blur-sm"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScale((s) => Math.min(6, s * 1.25))}
            aria-label="확대"
            className="w-7 h-7 rounded-r1 flex items-center justify-center bg-[var(--tf-bg-layer-default)]/90 border border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)] hover:text-[var(--tf-fg-brand)] transition-colors cursor-pointer backdrop-blur-sm"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            aria-label="뷰 초기화"
            className="w-7 h-7 rounded-r1 flex items-center justify-center bg-[var(--tf-bg-layer-default)]/90 border border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)] hover:text-[var(--tf-fg-brand)] transition-colors cursor-pointer backdrop-blur-sm"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Scale indicator */}
      {renderStatus === "ok" && scale !== 1 && (
        <div className="absolute bottom-2 right-2 z-10 text-[10px] px-1.5 py-0.5 rounded bg-[var(--tf-bg-layer-default)]/80 text-[var(--tf-fg-muted)] tabular-nums backdrop-blur-sm">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DiagramViewer — public component: update pulse + fullscreen
// ─────────────────────────────────────────────────────────────────

interface DiagramViewerProps {
  code: string;
  /** Extra classes for the outer wrapper */
  className?: string;
}

export default function DiagramViewer({ code, className = "" }: DiagramViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const prevCode = useRef<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Detect code changes and trigger pulse (skip the very first render)
  useEffect(() => {
    if (prevCode.current !== null && prevCode.current !== code) {
      setJustUpdated(true);
      const t = setTimeout(() => setJustUpdated(false), 2500);
      return () => clearTimeout(t);
    }
    prevCode.current = code;
  }, [code]);

  // ESC closes fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  return (
    <>
      {/* ── Panel card ─────────────────────────────────────────── */}
      <div
        className={`rounded-r2 overflow-hidden flex flex-col transition-all duration-300 ${
          justUpdated
            ? "ring-2 ring-[var(--tf-stroke-brand)] shadow-[0_0_0_4px_var(--tf-bg-brand-weak)]"
            : ""
        } ${className}`}
      >
        {/* Card header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--tf-bg-layer-default)] border-b border-[var(--tf-stroke-neutral)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {justUpdated ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--tf-bg-brand-weak)] text-[var(--tf-fg-brand)] font-medium animate-pulse shrink-0">
                방금 업데이트
              </span>
            ) : (
              <span className="text-[11px] text-[var(--tf-fg-subtle)] truncate">
                드래그 이동 · Ctrl+스크롤 확대
              </span>
            )}
          </div>
          <button
            onClick={() => setIsFullscreen(true)}
            aria-label="전체화면으로 보기"
            className="w-7 h-7 rounded-r1 flex items-center justify-center text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] hover:text-[var(--tf-fg-brand)] transition-colors cursor-pointer shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Canvas — grows to fill available height */}
        <MermaidCanvas code={code} className="flex-1 min-h-[240px]" />
      </div>

      {/* ── Fullscreen portal ───────────────────────────────────── */}
      {mounted &&
        isFullscreen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/75 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <div
              className="bg-[var(--tf-bg-layer-default)] rounded-r3 flex flex-col shadow-2xl overflow-hidden"
              style={{ width: "92vw", height: "90vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fullscreen header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--tf-stroke-neutral)] shrink-0">
                <span className="text-[15px] font-semibold text-[var(--tf-fg-default)]">
                  프로젝트 다이어그램
                </span>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:block text-[11px] text-[var(--tf-fg-subtle)]">
                    핀치 / Ctrl+스크롤로 확대 · 드래그로 이동 · ESC로 닫기
                  </span>
                  <button
                    onClick={() => setIsFullscreen(false)}
                    aria-label="전체화면 닫기"
                    className="w-8 h-8 rounded-r2 flex items-center justify-center text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] hover:text-[var(--tf-fg-default)] transition-colors cursor-pointer"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Fullscreen canvas — fresh render, full height */}
              <MermaidCanvas code={code} className="flex-1" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
