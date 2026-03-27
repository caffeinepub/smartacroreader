import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveTool, Annotation } from "../types/pdf";
import AnnotationLayer from "./AnnotationLayer";

// CRITICAL: Set worker at module level before any usage
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PageDimensions {
  width: number;
  height: number;
}

interface PDFViewerProps {
  buffer: ArrayBuffer;
  activeTool: ActiveTool;
  annotations: Annotation[];
  onAnnotationAdd: (ann: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  zoom: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageCountChange: (count: number) => void;
  onThumbnailsReady: (thumbs: string[]) => void;
  pendingSignatureDataUrl: string | null;
  onSignaturePlaced: () => void;
}

export default function PDFViewer({
  buffer,
  activeTool,
  annotations,
  onAnnotationAdd,
  onAnnotationDelete,
  zoom,
  currentPage,
  onPageChange,
  onPageCountChange,
  onThumbnailsReady,
  pendingSignatureDataUrl,
  onSignaturePlaced,
}: PDFViewerProps) {
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions[]>([]);
  const [renderVersion, setRenderVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderTasksRef = useRef<Map<number, { cancel: () => void }>>(new Map());
  const bufferRef = useRef<ArrayBuffer | null>(null);
  // Stable refs to avoid effect re-runs
  const onPageCountChangeRef = useRef(onPageCountChange);
  const onThumbnailsReadyRef = useRef(onThumbnailsReady);
  onPageCountChangeRef.current = onPageCountChange;
  onThumbnailsReadyRef.current = onThumbnailsReady;

  const generateThumbnail = useCallback(
    async (pageNum: number): Promise<string | null> => {
      const doc = pdfDocRef.current;
      if (!doc) return null;
      try {
        const page = await doc.getPage(pageNum);
        const vp = page.getViewport({ scale: 0.2 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
        return canvas.toDataURL("image/jpeg", 0.7);
      } catch {
        return null;
      }
    },
    [],
  );

  // Load PDF when buffer changes
  useEffect(() => {
    if (!buffer || buffer === bufferRef.current) return;
    bufferRef.current = buffer;

    for (const t of renderTasksRef.current.values()) t.cancel();
    renderTasksRef.current.clear();

    const copy = buffer.slice(0);
    let cancelled = false;

    pdfjsLib
      .getDocument({ data: copy })
      .promise.then((doc) => {
        if (cancelled) return;
        pdfDocRef.current = doc;
        const count = doc.numPages;
        setPageCount(count);
        onPageCountChangeRef.current(count);
        pageRefs.current = new Array(count).fill(null);

        const dimPromises = Array.from({ length: count }, (_, i) =>
          doc.getPage(i + 1).then((page: PDFPageProxy) => {
            const vp = page.getViewport({ scale: 1 });
            return { width: vp.width, height: vp.height };
          }),
        );
        return Promise.all(dimPromises);
      })
      .then((dims) => {
        if (!dims || cancelled) return;
        setPageDimensions(dims);
        setRenderVersion((v) => v + 1);
        const thumbPromises = dims.map((_, i) => generateThumbnail(i + 1));
        Promise.all(thumbPromises).then((thumbs) => {
          if (!cancelled)
            onThumbnailsReadyRef.current(thumbs.filter(Boolean) as string[]);
        });
      })
      .catch((err) => {
        console.error("PDF load error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [buffer, generateThumbnail]);

  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement) => {
      const doc = pdfDocRef.current;
      if (!doc) return;

      const existing = renderTasksRef.current.get(pageNum);
      if (existing) existing.cancel();

      try {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        const renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        });
        renderTasksRef.current.set(pageNum, renderTask);
        await renderTask.promise;
        renderTasksRef.current.delete(pageNum);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name: string }).name === "RenderingCancelledException"
        )
          return;
        console.warn(`Page ${pageNum} render error:`, err);
      }
    },
    [zoom],
  );

  // Render all pages when version or zoom changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: renderVersion triggers re-render
  useEffect(() => {
    if (!pdfDocRef.current || pageCount === 0) return;
    for (let i = 0; i < pageCount; i++) {
      const canvas = pageRefs.current[i];
      if (canvas) renderPage(i + 1, canvas);
    }
  }, [renderVersion, zoom, pageCount, renderPage]);

  // Scroll to page on external change
  useEffect(() => {
    if (!containerRef.current) return;
    const pageEl = containerRef.current.querySelector(
      `[data-page="${currentPage}"]`,
    ) as HTMLElement;
    if (pageEl) pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPage]);

  // Track visible page via IntersectionObserver
  useEffect(() => {
    if (!containerRef.current || pageCount === 0) return;
    const root = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        let mostVisible = { page: 1, ratio: 0 };
        for (const entry of entries) {
          const page = Number.parseInt(
            (entry.target as HTMLElement).dataset.page || "1",
          );
          if (entry.intersectionRatio > mostVisible.ratio) {
            mostVisible = { page, ratio: entry.intersectionRatio };
          }
        }
        if (mostVisible.ratio > 0) onPageChange(mostVisible.page);
      },
      { root, threshold: [0.1, 0.5, 0.9] },
    );
    const pages = root.querySelectorAll("[data-page]");
    for (const el of pages) observer.observe(el);
    return () => observer.disconnect();
  }, [pageCount, onPageChange]);

  const getCursor = () => {
    switch (activeTool) {
      case "highlight":
        return "crosshair";
      case "draw":
        return "crosshair";
      case "comment":
        return "text";
      case "eraser":
        return "cell";
      case "signature":
        return "copy";
      default:
        return "default";
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin"
      style={{ background: "oklch(10% 0 0)", cursor: getCursor() }}
      data-ocid="viewer.canvas_target"
    >
      <div className="flex flex-col items-center py-6 gap-6">
        {Array.from({ length: pageCount }, (_, i) => {
          const dim = pageDimensions[i];
          const pageNum = i + 1;
          const pageAnnotations = annotations.filter(
            (a) => a.pageNum === pageNum,
          );
          return (
            <div
              key={pageNum}
              data-page={pageNum}
              className="relative"
              style={{
                width: dim ? `${dim.width * zoom}px` : "auto",
                boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
              }}
            >
              <canvas
                ref={(el) => {
                  pageRefs.current[i] = el;
                }}
                style={{ display: "block" }}
              />
              {dim && (
                <AnnotationLayer
                  pageNum={pageNum}
                  width={dim.width * zoom}
                  height={dim.height * zoom}
                  annotations={pageAnnotations}
                  activeTool={activeTool}
                  onAnnotationAdd={onAnnotationAdd}
                  onAnnotationDelete={onAnnotationDelete}
                  pendingSignatureDataUrl={pendingSignatureDataUrl}
                  onSignaturePlaced={onSignaturePlaced}
                />
              )}
            </div>
          );
        })}
        {pageCount === 0 && (
          <div
            className="flex items-center justify-center h-64 text-muted-foreground"
            data-ocid="viewer.loading_state"
          >
            <p>Loading PDF...</p>
          </div>
        )}
      </div>
    </div>
  );
}
