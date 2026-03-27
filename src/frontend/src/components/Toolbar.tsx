import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  FileDown,
  FileText,
  FileUp,
  FolderOpen,
  Highlighter,
  ImagePlus,
  Merge,
  MessageSquare,
  MousePointer2,
  PenTool,
  Pencil,
  RotateCw,
  ScanText,
  Scissors,
  Shield,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import { useCallback } from "react";
import { toast } from "sonner";
import type {
  ActiveTool,
  Annotation,
  CommentAnnotation,
  CurrentFile,
  DrawAnnotation,
  HighlightAnnotation,
  SignatureAnnotation,
  TextAnnotation,
} from "../types/pdf";

const DRAW_COLORS = [
  "#e84c22",
  "#3b7ef8",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#000000",
  "#ffffff",
];

interface ToolbarProps {
  hasFile: boolean;
  fileName?: string;
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onOpenFile: () => void;
  onOpenModal: (modal: string) => void;
  annotations: Annotation[];
  currentFile: CurrentFile | null;
  drawColor: string;
  drawWidth: number;
  onDrawColorChange: (color: string) => void;
  onDrawWidthChange: (width: number) => void;
  onUndoAnnotation: () => void;
  onRotatePage: () => void;
}

const DRAW_TOOLS: {
  id: ActiveTool;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "highlight", icon: Highlighter, label: "Highlight" },
  { id: "draw", icon: Pencil, label: "Draw / Freehand" },
  { id: "text", icon: Type, label: "Add Text" },
  { id: "comment", icon: MessageSquare, label: "Add Comment" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
];

export default function Toolbar({
  hasFile,
  fileName,
  activeTool,
  onToolChange,
  zoom,
  onZoomChange,
  currentPage,
  pageCount,
  onPageChange,
  onOpenFile,
  onOpenModal,
  annotations,
  currentFile,
  drawColor,
  drawWidth,
  onDrawColorChange,
  onDrawWidthChange,
  onUndoAnnotation,
  onRotatePage,
}: ToolbarProps) {
  const handleDownload = useCallback(async () => {
    if (!currentFile) return;
    try {
      const pdfDoc = await PDFDocument.load(currentFile.buffer.slice(0));
      const pages = pdfDoc.getPages();

      for (const ann of annotations) {
        const page = pages[ann.pageNum - 1];
        if (!page) continue;
        const { width, height } = page.getSize();

        if (ann.type === "highlight") {
          const a = ann as HighlightAnnotation;
          // Parse color if present
          let r = 1;
          let g = 0.95;
          let b = 0.2;
          if (a.color?.startsWith("#") && a.color.length === 7) {
            r = Number.parseInt(a.color.slice(1, 3), 16) / 255;
            g = Number.parseInt(a.color.slice(3, 5), 16) / 255;
            b = Number.parseInt(a.color.slice(5, 7), 16) / 255;
          }
          try {
            page.drawRectangle({
              x: (a.rect.x / 100) * width,
              y: height - (a.rect.y / 100) * height - (a.rect.h / 100) * height,
              width: (a.rect.w / 100) * width,
              height: (a.rect.h / 100) * height,
              color: rgb(r, g, b),
              opacity: 0.4,
            });
          } catch {}
        }

        if (ann.type === "draw") {
          const a = ann as DrawAnnotation;
          if (a.points.length < 2) continue;
          let r = 0.91;
          let g = 0.3;
          let b = 0.13;
          if (a.color?.startsWith("#") && a.color.length === 7) {
            r = Number.parseInt(a.color.slice(1, 3), 16) / 255;
            g = Number.parseInt(a.color.slice(3, 5), 16) / 255;
            b = Number.parseInt(a.color.slice(5, 7), 16) / 255;
          }
          try {
            for (let i = 1; i < a.points.length; i++) {
              const p1 = a.points[i - 1];
              const p2 = a.points[i];
              page.drawLine({
                start: {
                  x: (p1.x / 100) * width,
                  y: height - (p1.y / 100) * height,
                },
                end: {
                  x: (p2.x / 100) * width,
                  y: height - (p2.y / 100) * height,
                },
                thickness: a.width ?? 2,
                color: rgb(r, g, b),
              });
            }
          } catch {}
        }

        if (ann.type === "signature") {
          const a = ann as SignatureAnnotation;
          try {
            const res = await fetch(a.dataUrl);
            const ab = await res.arrayBuffer();
            const imgBytes = new Uint8Array(ab);
            let embeddedImage: Awaited<ReturnType<typeof pdfDoc.embedPng>>;
            if (
              a.dataUrl.startsWith("data:image/png") ||
              a.dataUrl.includes(";base64,iVBOR")
            ) {
              embeddedImage = await pdfDoc.embedPng(imgBytes);
            } else {
              embeddedImage = await pdfDoc.embedJpg(imgBytes);
            }
            const imgWidth = (a.rect.w / 100) * width;
            const imgHeight = (a.rect.h / 100) * height;
            const imgX = (a.rect.x / 100) * width;
            const imgY = height - (a.rect.y / 100) * height - imgHeight;
            page.drawImage(embeddedImage, {
              x: imgX,
              y: imgY,
              width: imgWidth,
              height: imgHeight,
            });
          } catch (err) {
            console.warn("Could not embed signature:", err);
          }
        }

        if (ann.type === "comment") {
          const a = ann as CommentAnnotation;
          if (!a.text) continue;
          try {
            page.drawText(a.text, {
              x: (a.pos.x / 100) * width,
              y: height - (a.pos.y / 100) * height,
              size: 10,
              color: rgb(0, 0, 0),
            });
          } catch {}
        }

        if (ann.type === "text") {
          const a = ann as TextAnnotation;
          if (!a.text) continue;
          try {
            page.drawText(a.text, {
              x: (a.pos.x / 100) * width,
              y: height - (a.pos.y / 100) * height,
              size: 10,
              color: rgb(0, 0, 0),
            });
          } catch {}
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentFile.name.replace(/\.pdf$/i, "")}_annotated.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded with annotations");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save PDF");
    }
  }, [currentFile, annotations]);

  const ToolBtn = useCallback(
    ({
      icon: Icon,
      label,
      onClick,
      active,
      disabled,
    }: {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      onClick: () => void;
      active?: boolean;
      disabled?: boolean;
    }) => (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`tool-btn ${active ? "active" : ""}`}
              onClick={disabled ? undefined : onClick}
              disabled={disabled}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    [],
  );

  return (
    <header
      className="flex items-center gap-1 px-3 h-14 shrink-0 border-b border-border gradient-border-top"
      style={{ background: "oklch(var(--toolbar-bg))" }}
      data-ocid="toolbar.section"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: "linear-gradient(135deg, #e84c22, #c0360e)" }}
        >
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm hidden md:block gradient-text tracking-tight">
          SmartAcro
        </span>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* File actions */}
      <div className="flex items-center gap-0.5">
        <ToolBtn icon={FolderOpen} label="Open PDF" onClick={onOpenFile} />
        {hasFile && (
          <ToolBtn
            icon={Download}
            label="Download with Annotations"
            onClick={handleDownload}
          />
        )}
      </div>

      {hasFile && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          {/* Annotation tools */}
          <div className="flex items-center gap-0.5">
            {DRAW_TOOLS.map((t) => (
              <ToolBtn
                key={t.id}
                icon={t.icon}
                label={t.label}
                onClick={() => onToolChange(t.id)}
                active={activeTool === t.id}
              />
            ))}
            {/* Undo */}
            <ToolBtn
              icon={Undo2}
              label="Undo Last Annotation (Ctrl+Z)"
              onClick={onUndoAnnotation}
              disabled={annotations.length === 0}
            />
            {/* Rotate */}
            <ToolBtn
              icon={RotateCw}
              label="Rotate Page 90°"
              onClick={onRotatePage}
            />
            {/* Color palette popover */}
            <TooltipProvider delayDuration={300}>
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="tool-btn"
                        aria-label="Draw Color & Width"
                        data-ocid="toolbar.toggle"
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: drawColor,
                            border: "2px solid rgba(255,255,255,0.3)",
                            boxShadow: `0 0 6px ${drawColor}80`,
                          }}
                        />
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Draw Color & Width
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-52 p-3"
                  style={{
                    background: "oklch(14% 0.012 250)",
                    borderColor: "oklch(28% 0.02 250)",
                  }}
                >
                  <p
                    className="text-xs font-medium mb-2"
                    style={{ color: "oklch(65% 0.01 250)" }}
                  >
                    Draw Color
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {DRAW_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Color ${c}`}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: c,
                          border:
                            drawColor === c
                              ? "2px solid white"
                              : "2px solid transparent",
                          boxShadow:
                            drawColor === c ? `0 0 8px ${c}` : undefined,
                          cursor: "pointer",
                        }}
                        onClick={() => onDrawColorChange(c)}
                      />
                    ))}
                  </div>
                  <p
                    className="text-xs font-medium mb-2"
                    style={{ color: "oklch(65% 0.01 250)" }}
                  >
                    Thickness: {drawWidth.toFixed(1)}px
                  </p>
                  <Slider
                    min={1}
                    max={8}
                    step={0.5}
                    value={[drawWidth]}
                    onValueChange={([v]) => onDrawWidthChange(v)}
                    className="w-full"
                  />
                </PopoverContent>
              </Popover>
            </TooltipProvider>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <ToolBtn
              icon={ZoomOut}
              label="Zoom Out"
              onClick={() => onZoomChange(Math.max(0.5, zoom - 0.2))}
            />
            <span
              className="text-xs tabular-nums w-10 text-center"
              style={{ color: "oklch(60% 0.01 250)" }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <ToolBtn
              icon={ZoomIn}
              label="Zoom In"
              onClick={() => onZoomChange(Math.min(3, zoom + 0.2))}
            />
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />
          {/* Page nav */}
          <div className="flex items-center gap-0.5">
            <ToolBtn
              icon={ChevronLeft}
              label="Previous Page"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            />
            <span
              className="text-xs tabular-nums whitespace-nowrap px-1"
              style={{ color: "oklch(60% 0.01 250)" }}
            >
              {currentPage} / {pageCount}
            </span>
            <ToolBtn
              icon={ChevronRight}
              label="Next Page"
              onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage >= pageCount}
            />
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />
          {/* Tool actions */}
          <div className="flex items-center gap-0.5">
            <ToolBtn
              icon={PenTool}
              label="E-Signature"
              onClick={() => onOpenModal("sign")}
            />
            <ToolBtn
              icon={ScanText}
              label="OCR Extract Text"
              onClick={() => onOpenModal("ocr")}
            />
            <ToolBtn
              icon={Merge}
              label="Merge PDFs"
              onClick={() => onOpenModal("merge")}
            />
            <ToolBtn
              icon={Scissors}
              label="Split PDF"
              onClick={() => onOpenModal("split")}
            />
            <ToolBtn
              icon={Shield}
              label="Password Protect"
              onClick={() => onOpenModal("protect")}
            />
            <ToolBtn
              icon={ImagePlus}
              label="Create from Images"
              onClick={() => onOpenModal("create-images")}
            />
            <ToolBtn
              icon={FileDown}
              label="PDF → Word"
              onClick={() => onOpenModal("pdf-to-word")}
            />
          </div>
        </>
      )}

      {/* Word to PDF always accessible */}
      <ToolBtn
        icon={FileUp}
        label="Word → PDF"
        onClick={() => onOpenModal("word-to-pdf")}
      />

      {/* Filename pill */}
      {fileName && (
        <div className="ml-auto flex items-center">
          <span
            className="text-xs truncate max-w-48 px-3 py-1 rounded-full border"
            style={{
              background: "oklch(14% 0.012 250)",
              borderColor: "oklch(22% 0.02 250)",
              color: "oklch(62% 0.01 250)",
            }}
            title={fileName}
          >
            {fileName}
          </span>
        </div>
      )}
    </header>
  );
}
