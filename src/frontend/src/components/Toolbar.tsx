import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  FileText,
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
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import { useCallback } from "react";
import { toast } from "sonner";
import type {
  ActiveTool,
  Annotation,
  CurrentFile,
  DrawAnnotation,
  HighlightAnnotation,
} from "../types/pdf";

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
}

const DRAW_TOOLS: {
  id: ActiveTool;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "highlight", icon: Highlighter, label: "Highlight" },
  { id: "draw", icon: Pencil, label: "Draw / Freehand" },
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
          page.drawRectangle({
            x: (a.rect.x / 100) * width,
            y: height - (a.rect.y / 100) * height - (a.rect.h / 100) * height,
            width: (a.rect.w / 100) * width,
            height: (a.rect.h / 100) * height,
            color: rgb(1, 0.95, 0.2),
            opacity: 0.4,
          });
        }

        if (ann.type === "draw") {
          const a = ann as DrawAnnotation;
          if (a.points.length < 2) continue;
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
              thickness: 2,
              color: rgb(0.91, 0.3, 0.13),
            });
          }
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
      unavailable,
    }: {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      onClick: () => void;
      active?: boolean;
      disabled?: boolean;
      unavailable?: boolean;
    }) => (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`tool-btn ${active ? "active" : ""} ${unavailable ? "disabled-feature" : ""}`}
              onClick={unavailable || disabled ? undefined : onClick}
              disabled={disabled}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {unavailable ? `${label} (requires server)` : label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    [],
  );

  return (
    <header
      className="flex items-center gap-1 px-3 h-12 shrink-0 border-b border-border"
      style={{ background: "oklch(var(--toolbar-bg))" }}
      data-ocid="toolbar.section"
    >
      <div className="flex items-center gap-2 mr-3">
        <div
          className="w-7 h-7 rounded flex items-center justify-center shrink-0"
          style={{ background: "#e84c22" }}
        >
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span
          className="font-semibold text-sm hidden md:block"
          style={{ color: "#e84c22" }}
        >
          SmartAcro
        </span>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolBtn icon={FolderOpen} label="Open PDF" onClick={onOpenFile} />
      {hasFile && (
        <ToolBtn
          icon={Download}
          label="Download with Annotations"
          onClick={handleDownload}
        />
      )}

      {hasFile && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          {DRAW_TOOLS.map((t) => (
            <ToolBtn
              key={t.id}
              icon={t.icon}
              label={t.label}
              onClick={() => onToolChange(t.id)}
              active={activeTool === t.id}
            />
          ))}

          <Separator orientation="vertical" className="h-6 mx-1" />
          <ToolBtn
            icon={ZoomOut}
            label="Zoom Out"
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.2))}
          />
          <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <ToolBtn
            icon={ZoomIn}
            label="Zoom In"
            onClick={() => onZoomChange(Math.min(3, zoom + 0.2))}
          />

          <Separator orientation="vertical" className="h-6 mx-1" />
          <ToolBtn
            icon={ChevronLeft}
            label="Previous Page"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          />
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {currentPage} / {pageCount}
          </span>
          <ToolBtn
            icon={ChevronRight}
            label="Next Page"
            onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
          />

          <Separator orientation="vertical" className="h-6 mx-1" />
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
            icon={RotateCw}
            label="Convert to Word"
            onClick={() => {}}
            unavailable
          />
        </>
      )}

      {fileName && (
        <div className="ml-auto flex items-center">
          <span
            className="text-xs text-muted-foreground truncate max-w-48"
            title={fileName}
          >
            {fileName}
          </span>
        </div>
      )}
    </header>
  );
}
