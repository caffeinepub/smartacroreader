import { useCallback, useRef, useState } from "react";
import type {
  ActiveTool,
  Annotation,
  CommentAnnotation,
  DrawAnnotation,
  HighlightAnnotation,
  SignatureAnnotation,
} from "../types/pdf";

interface AnnotationLayerProps {
  pageNum: number;
  width: number;
  height: number;
  annotations: Annotation[];
  activeTool: ActiveTool;
  onAnnotationAdd: (ann: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  pendingSignatureDataUrl: string | null;
  onSignaturePlaced: () => void;
}

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AnnotationLayer({
  pageNum,
  width,
  height,
  annotations,
  activeTool,
  onAnnotationAdd,
  onAnnotationDelete,
  pendingSignatureDataUrl,
  onSignaturePlaced,
}: AnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawingPoints, setDrawingPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [highlightRect, setHighlightRect] = useState<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [editingComment, setEditingComment] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const isDrawing = useRef(false);

  const toPercent = useCallback(
    (x: number, y: number) => ({ x: (x / width) * 100, y: (y / height) * 100 }),
    [width, height],
  );

  const getPos = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === "select" || activeTool === "eraser") return;
    e.preventDefault();
    const pos = getPos(e);

    if (activeTool === "signature" && pendingSignatureDataUrl) {
      const pct = toPercent(pos.x, pos.y);
      const sigAnn: SignatureAnnotation = {
        id: uuid(),
        pageNum,
        type: "signature",
        dataUrl: pendingSignatureDataUrl,
        rect: { x: pct.x, y: pct.y, w: 20, h: 8 },
      };
      onAnnotationAdd(sigAnn);
      onSignaturePlaced();
      return;
    }

    if (activeTool === "comment") {
      const pct = toPercent(pos.x, pos.y);
      const id = uuid();
      const ann: CommentAnnotation = {
        id,
        pageNum,
        type: "comment",
        pos: pct,
        text: "",
      };
      onAnnotationAdd(ann);
      setEditingComment({ id, text: "" });
      return;
    }

    if (activeTool === "highlight") {
      isDrawing.current = true;
      setHighlightRect({
        startX: pos.x,
        startY: pos.y,
        x: pos.x,
        y: pos.y,
        w: 0,
        h: 0,
      });
      return;
    }

    if (activeTool === "draw") {
      isDrawing.current = true;
      const pct = toPercent(pos.x, pos.y);
      setDrawingPoints([pct]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing.current) return;
    const pos = getPos(e);
    if (activeTool === "highlight" && highlightRect) {
      const x = Math.min(pos.x, highlightRect.startX);
      const y = Math.min(pos.y, highlightRect.startY);
      const w = Math.abs(pos.x - highlightRect.startX);
      const h = Math.abs(pos.y - highlightRect.startY);
      setHighlightRect({ ...highlightRect, x, y, w, h });
    }
    if (activeTool === "draw") {
      const pct = toPercent(pos.x, pos.y);
      setDrawingPoints((prev) => [...prev, pct]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (
      activeTool === "highlight" &&
      highlightRect &&
      highlightRect.w > 5 &&
      highlightRect.h > 5
    ) {
      const r = toPercent(highlightRect.x, highlightRect.y);
      const rw = (highlightRect.w / width) * 100;
      const rh = (highlightRect.h / height) * 100;
      const ann: HighlightAnnotation = {
        id: uuid(),
        pageNum,
        type: "highlight",
        rect: { x: r.x, y: r.y, w: rw, h: rh },
      };
      onAnnotationAdd(ann);
      setHighlightRect(null);
    }
    if (activeTool === "draw" && drawingPoints.length > 2) {
      const ann: DrawAnnotation = {
        id: uuid(),
        pageNum,
        type: "draw",
        points: drawingPoints,
        color: "#e84c22",
        width: 2.5,
      };
      onAnnotationAdd(ann);
      setDrawingPoints([]);
    }
  };

  const eraseOnClick = (
    e: React.MouseEvent | React.KeyboardEvent,
    id: string,
  ) => {
    e.stopPropagation();
    if (activeTool === "eraser") onAnnotationDelete(id);
  };

  const isInteractive = activeTool !== "select";

  return (
    <>
      <svg
        ref={svgRef}
        aria-hidden="true"
        role="img"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${width}px`,
          height: `${height}px`,
          pointerEvents: isInteractive ? "all" : "none",
          userSelect: "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {annotations
          .filter((a) => a.type === "highlight")
          .map((ann) => {
            const a = ann as HighlightAnnotation;
            return (
              <rect
                key={a.id}
                x={`${a.rect.x}%`}
                y={`${a.rect.y}%`}
                width={`${a.rect.w}%`}
                height={`${a.rect.h}%`}
                className="annotation-highlight"
                onClick={(e) => eraseOnClick(e, a.id)}
                onKeyDown={(e) => e.key === "Delete" && eraseOnClick(e, a.id)}
                style={{
                  cursor: activeTool === "eraser" ? "pointer" : "default",
                }}
              />
            );
          })}

        {annotations
          .filter((a) => a.type === "draw")
          .map((ann) => {
            const a = ann as DrawAnnotation;
            const pts = a.points
              .map((p) => `${(p.x / 100) * width},${(p.y / 100) * height}`)
              .join(" ");
            return (
              <polyline
                key={a.id}
                points={pts}
                fill="none"
                stroke={a.color}
                strokeWidth={a.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                onClick={(e) => eraseOnClick(e, a.id)}
                onKeyDown={(e) => e.key === "Delete" && eraseOnClick(e, a.id)}
                style={{
                  cursor: activeTool === "eraser" ? "pointer" : "default",
                }}
              />
            );
          })}

        {highlightRect && highlightRect.w > 2 && (
          <rect
            x={highlightRect.x}
            y={highlightRect.y}
            width={highlightRect.w}
            height={highlightRect.h}
            className="annotation-highlight"
            style={{ pointerEvents: "none" }}
          />
        )}

        {drawingPoints.length > 1 && (
          <polyline
            points={drawingPoints
              .map((p) => `${(p.x / 100) * width},${(p.y / 100) * height}`)
              .join(" ")}
            fill="none"
            stroke="#e84c22"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: "none" }}
          />
        )}
      </svg>

      {annotations
        .filter((a) => a.type === "signature")
        .map((ann) => {
          const a = ann as SignatureAnnotation;
          return (
            <img
              key={a.id}
              src={a.dataUrl}
              alt="Placed signature"
              style={{
                position: "absolute",
                left: `${a.rect.x}%`,
                top: `${a.rect.y}%`,
                width: `${a.rect.w}%`,
                height: `${a.rect.h}%`,
                objectFit: "contain",
                cursor: activeTool === "eraser" ? "pointer" : "default",
                pointerEvents: activeTool === "eraser" ? "all" : "none",
              }}
              onClick={(e) => eraseOnClick(e, a.id)}
              onKeyDown={(e) => e.key === "Delete" && eraseOnClick(e, a.id)}
            />
          );
        })}

      {annotations
        .filter((a) => a.type === "comment")
        .map((ann) => {
          const a = ann as CommentAnnotation;
          const isEditing = editingComment?.id === a.id;
          return (
            <article
              key={a.id}
              style={{
                position: "absolute",
                left: `${a.pos.x}%`,
                top: `${a.pos.y}%`,
                zIndex: 10,
                pointerEvents: "all",
              }}
            >
              {isEditing ? (
                <textarea
                  className="w-40 h-20 text-xs p-1 rounded border"
                  style={{
                    background: "oklch(95% 0.15 90)",
                    color: "#1a1a1a",
                    border: "1px solid oklch(75% 0.18 80)",
                    resize: "both",
                  }}
                  defaultValue={a.text}
                  onBlur={(e) => {
                    a.text = e.target.value;
                    setEditingComment(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingComment(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="max-w-40 text-xs p-2 rounded shadow-lg text-left"
                  style={{
                    background: "oklch(93% 0.15 90)",
                    color: "#1a1a1a",
                    border: "1px solid oklch(75% 0.18 80)",
                    cursor: activeTool === "eraser" ? "pointer" : "text",
                  }}
                  onClick={(e) => {
                    if (activeTool === "eraser") {
                      eraseOnClick(e, a.id);
                      return;
                    }
                    setEditingComment({ id: a.id, text: a.text });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Delete") eraseOnClick(e, a.id);
                    if (e.key === "Enter")
                      setEditingComment({ id: a.id, text: a.text });
                  }}
                >
                  {a.text || (
                    <span className="italic opacity-60">Click to edit</span>
                  )}
                </button>
              )}
            </article>
          );
        })}
    </>
  );
}
