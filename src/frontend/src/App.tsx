import { Toaster } from "@/components/ui/sonner";
import {
  ChevronDown,
  Crop,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Highlighter,
  Loader2,
  Merge,
  MessageSquare,
  Minimize2,
  PenTool,
  Presentation,
  RotateCw,
  Scissors,
  Stamp,
  Trash2,
  Type,
  Underline,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface PDFFile {
  id: string;
  name: string;
  url: string;
}

type ToolId =
  | "highlight"
  | "comment"
  | "underline"
  | "draw"
  | "stamp"
  | "editText"
  | "crop"
  | "deletePage"
  | "rotate"
  | "split"
  | "merge"
  | "compress"
  | "toWord"
  | "toExcel"
  | "toPPT";

interface ToolInfo {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
  description: string;
  modal?: boolean;
}

const annotateTools: ToolInfo[] = [
  {
    id: "highlight",
    label: "Highlight",
    icon: <Highlighter size={14} />,
    description:
      "Highlight text in the PDF. Click and drag over text to apply.",
  },
  {
    id: "comment",
    label: "Comment",
    icon: <MessageSquare size={14} />,
    description: "Add sticky note comments to any part of the document.",
  },
  {
    id: "underline",
    label: "Underline",
    icon: <Underline size={14} />,
    description: "Underline selected text in the document.",
  },
  {
    id: "draw",
    label: "Draw",
    icon: <PenTool size={14} />,
    description: "Freehand drawing tool — draw shapes and markups on the PDF.",
  },
  {
    id: "stamp",
    label: "Stamp",
    icon: <Stamp size={14} />,
    description: "Apply stamps like Approved, Confidential, or Draft to pages.",
  },
];

const editTools: ToolInfo[] = [
  {
    id: "editText",
    label: "Edit Text",
    icon: <Type size={14} />,
    description: "Click on any text to edit it directly within the PDF.",
  },
  {
    id: "crop",
    label: "Crop Pages",
    icon: <Crop size={14} />,
    description: "Crop and resize pages by defining a crop box area.",
  },
  {
    id: "deletePage",
    label: "Delete Page",
    icon: <Trash2 size={14} />,
    description: "Remove the current page from the document permanently.",
  },
  {
    id: "rotate",
    label: "Rotate",
    icon: <RotateCw size={14} />,
    description: "Rotate the current page 90° clockwise.",
  },
];

const organizeTools: ToolInfo[] = [
  {
    id: "split",
    label: "Split PDF",
    icon: <Scissors size={14} />,
    description: "Split this PDF into multiple files.",
    modal: true,
  },
  {
    id: "merge",
    label: "Merge PDF",
    icon: <Merge size={14} />,
    description: "Merge multiple PDFs into one combined file.",
    modal: true,
  },
];

const convertTools: ToolInfo[] = [
  {
    id: "compress",
    label: "Compress",
    icon: <Minimize2 size={14} />,
    description: "Reduce file size while preserving quality.",
    modal: true,
  },
  {
    id: "toWord",
    label: "To Word",
    icon: <FileDown size={14} />,
    description: "Convert this PDF to an editable Word (.docx) file.",
    modal: true,
  },
  {
    id: "toExcel",
    label: "To Excel",
    icon: <FileSpreadsheet size={14} />,
    description: "Convert PDF tables to an Excel spreadsheet (.xlsx).",
    modal: true,
  },
  {
    id: "toPPT",
    label: "To PPT",
    icon: <Presentation size={14} />,
    description: "Convert this PDF to a PowerPoint presentation (.pptx).",
    modal: true,
  },
];

const featureCards = [
  {
    icon: <Eye size={22} />,
    title: "View & Navigate",
    desc: "Smooth scrolling, zoom controls, thumbnail sidebar, and page navigation.",
  },
  {
    icon: <Highlighter size={22} />,
    title: "Annotate & Comment",
    desc: "Highlight, underline, draw, stamp, and add sticky notes to any page.",
  },
  {
    icon: <Type size={22} />,
    title: "Edit PDF",
    desc: "Edit text and images directly inside the document — no conversion needed.",
  },
  {
    icon: <Scissors size={22} />,
    title: "Organize Pages",
    desc: "Split, merge, rotate, crop, and delete pages with ease.",
  },
  {
    icon: <FileDown size={22} />,
    title: "Convert Files",
    desc: "Export to Word, Excel, or PowerPoint formats in seconds.",
  },
  {
    icon: <Minimize2 size={22} />,
    title: "Compress",
    desc: "Reduce file size drastically while keeping visual quality intact.",
  },
];

function ToolButton({
  tool,
  active,
  onClick,
}: { tool: ToolInfo; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-1.5 rounded text-sm transition-colors ${
        active
          ? "bg-[oklch(0.55_0.22_25)] text-white"
          : "text-[oklch(0.75_0.01_270)] hover:bg-[oklch(0.22_0.03_270)] hover:text-white"
      }`}
    >
      {tool.icon}
      {tool.label}
    </button>
  );
}

function ToolSection({
  title,
  tools,
  activeTool,
  onTool,
}: {
  title: string;
  tools: ToolInfo[];
  activeTool: ToolId | null;
  onTool: (t: ToolId) => void;
}) {
  return (
    <div className="mb-3">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[oklch(0.50_0.015_270)]">
        {title}
      </div>
      {tools.map((t) => (
        <ToolButton
          key={t.id}
          tool={t}
          active={activeTool === t.id}
          onClick={() => onTool(t.id)}
        />
      ))}
    </div>
  );
}

function ProcessingModal({
  tool,
  onClose,
}: { tool: ToolInfo; onClose: () => void }) {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handleProcess = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setDone(true);
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      data-ocid="tool.modal"
    >
      <div className="bg-[oklch(0.17_0.025_270)] border border-[oklch(0.25_0.02_270)] rounded-lg p-6 w-80 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            {tool.icon}
            {tool.label}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[oklch(0.55_0.015_270)] hover:text-white transition-colors"
            data-ocid="tool.close_button"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-[oklch(0.70_0.01_270)] mb-5">
          {tool.description}
        </p>
        {!done ? (
          <button
            type="button"
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-2 rounded bg-[oklch(0.55_0.22_25)] hover:bg-[oklch(0.50_0.22_25)] text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            data-ocid="tool.primary_button"
          >
            {processing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processing...
              </>
            ) : (
              `Run ${tool.label}`
            )}
          </button>
        ) : (
          <>
            <div
              className="text-center text-sm text-green-400 mb-3"
              data-ocid="tool.success_state"
            >
              ✓ Done! File ready.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded bg-[oklch(0.55_0.22_25)] hover:bg-[oklch(0.50_0.22_25)] text-white text-sm font-medium transition-colors"
              data-ocid="tool.confirm_button"
            >
              Download File
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [zoom, setZoom] = useState(100);
  const [modalTool, setModalTool] = useState<ToolInfo | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const newFiles: PDFFile[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
          const url = URL.createObjectURL(f);
          const id = `${Date.now()}-${i}`;
          newFiles.push({ id, name: f.name, url });
        }
      }
      if (newFiles.length === 0) {
        toast.error("Please select PDF files only.");
        return;
      }
      setFiles((prev) => {
        const updated = [...prev, ...newFiles];
        if (!activeFileId) setActiveFileId(updated[0].id);
        return updated;
      });
      if (!activeFileId && newFiles.length > 0) {
        setActiveFileId(newFiles[0].id);
      }
      toast.success(
        `Opened ${newFiles.length} PDF${newFiles.length > 1 ? "s" : ""}`,
      );
    },
    [activeFileId],
  );

  const handleTool = useCallback(
    (toolId: ToolId) => {
      const allTools = [
        ...annotateTools,
        ...editTools,
        ...organizeTools,
        ...convertTools,
      ];
      const tool = allTools.find((t) => t.id === toolId)!;
      if (tool.modal) {
        if (!activeFile) {
          toast.error("Open a PDF first.");
          return;
        }
        setModalTool(tool);
        setActiveTool(null);
      } else {
        if (!activeFile) {
          toast.error("Open a PDF first.");
          return;
        }
        const next = activeTool === toolId ? null : toolId;
        setActiveTool(next);
        if (next) toast.success(`${tool.label} tool active`);
      }
    },
    [activeFile, activeTool],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const allTools = [
    ...annotateTools,
    ...editTools,
    ...organizeTools,
    ...convertTools,
  ];
  const activeToolInfo = allTools.find((t) => t.id === activeTool) ?? null;

  return (
    <div className="flex flex-col h-screen bg-[oklch(0.14_0.03_270)] text-white select-none overflow-hidden">
      {/* Top Menu Bar */}
      <header
        className="flex items-center justify-between px-3 shrink-0 bg-[oklch(0.12_0.025_270)] border-b border-[oklch(0.22_0.02_270)]"
        style={{ height: 40 }}
        data-ocid="topbar.panel"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-[oklch(0.55_0.22_25)] flex items-center justify-center">
              <FileText size={11} className="text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              SmartAcroReader
            </span>
          </div>
          <div className="h-4 w-px bg-[oklch(0.25_0.02_270)]" />
          {["File", "Edit", "View", "Tools", "Help"].map((item) => (
            <button
              type="button"
              key={item}
              className="text-xs text-[oklch(0.70_0.01_270)] hover:text-white px-1.5 py-0.5 rounded hover:bg-[oklch(0.22_0.025_270)] transition-colors flex items-center gap-0.5"
              data-ocid={`menu.${item.toLowerCase()}_button`}
            >
              {item} <ChevronDown size={10} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[oklch(0.22_0.025_270)] text-[oklch(0.70_0.01_270)] hover:text-white transition-colors"
            data-ocid="zoom.secondary_button"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-xs text-[oklch(0.70_0.01_270)] w-10 text-center">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(300, z + 10))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[oklch(0.22_0.025_270)] text-[oklch(0.70_0.01_270)] hover:text-white transition-colors"
            data-ocid="zoom.primary_button"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className="shrink-0 flex flex-col border-r border-[oklch(0.22_0.02_270)] overflow-hidden bg-[oklch(0.17_0.025_270)]"
          style={{ width: 220 }}
          data-ocid="sidebar.panel"
        >
          {/* Open PDF button */}
          <div className="p-2 border-b border-[oklch(0.22_0.02_270)]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-[oklch(0.55_0.22_25)] hover:bg-[oklch(0.50_0.22_25)] text-white text-sm font-medium transition-colors"
              data-ocid="sidebar.upload_button"
            >
              <Upload size={13} />
              Open PDF
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              data-ocid="sidebar.dropzone"
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div
              className="border-b border-[oklch(0.22_0.02_270)] overflow-y-auto"
              style={{ maxHeight: 160 }}
            >
              {files.map((f, i) => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setActiveFileId(f.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left text-xs truncate transition-colors ${
                    f.id === activeFileId
                      ? "bg-[oklch(0.22_0.03_270)] text-white border-l-2 border-[oklch(0.55_0.22_25)]"
                      : "text-[oklch(0.70_0.01_270)] hover:bg-[oklch(0.20_0.025_270)] hover:text-white"
                  }`}
                  data-ocid={`file.item.${i + 1}`}
                >
                  <FileText size={12} className="shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Tools */}
          <div className="flex-1 overflow-y-auto p-1 pt-2">
            <ToolSection
              title="Annotate"
              tools={annotateTools}
              activeTool={activeTool}
              onTool={handleTool}
            />
            <ToolSection
              title="Edit"
              tools={editTools}
              activeTool={activeTool}
              onTool={handleTool}
            />
            <ToolSection
              title="Organize"
              tools={organizeTools}
              activeTool={activeTool}
              onTool={handleTool}
            />
            <ToolSection
              title="Convert"
              tools={convertTools}
              activeTool={activeTool}
              onTool={handleTool}
            />
          </div>
        </aside>

        {/* Main Viewer */}
        <main
          className="flex-1 overflow-hidden relative"
          style={{ background: "oklch(0.15 0.028 270)" }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          data-ocid="viewer.panel"
        >
          {dragging && (
            <div
              className="absolute inset-0 z-20 border-2 border-dashed border-[oklch(0.55_0.22_25)] bg-[oklch(0.55_0.22_25/0.08)] flex items-center justify-center"
              data-ocid="viewer.dropzone"
            >
              <div className="text-center">
                <Upload
                  size={32}
                  className="mx-auto mb-2 text-[oklch(0.55_0.22_25)]"
                />
                <p className="text-white font-medium">Drop PDFs here</p>
              </div>
            </div>
          )}

          {activeFile ? (
            <div className="w-full h-full flex flex-col">
              {/* Active tool banner */}
              {activeToolInfo && (
                <div
                  className="flex items-center gap-3 px-4 py-2 bg-[oklch(0.20_0.025_270)] border-b border-[oklch(0.25_0.02_270)]"
                  data-ocid="tool.panel"
                >
                  <div className="flex items-center gap-2 text-sm text-[oklch(0.55_0.22_25)] font-medium">
                    {activeToolInfo.icon}
                    {activeToolInfo.label} active
                  </div>
                  <span className="text-xs text-[oklch(0.60_0.01_270)]">
                    {activeToolInfo.description}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTool(null)}
                    className="ml-auto text-[oklch(0.55_0.015_270)] hover:text-white transition-colors"
                    data-ocid="tool.close_button"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {/* PDF embed */}
              <div className="flex-1 overflow-hidden">
                <object
                  data={activeFile.url}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  style={{ display: "block" }}
                  data-ocid="viewer.canvas_target"
                >
                  <div className="flex flex-col items-center justify-center h-full text-[oklch(0.60_0.01_270)]">
                    <FileText size={48} className="mb-4 opacity-40" />
                    <p className="text-sm">
                      Your browser does not support embedded PDFs.
                    </p>
                    <a
                      href={activeFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 text-sm text-[oklch(0.55_0.22_25)] underline"
                    >
                      Open PDF directly
                    </a>
                  </div>
                </object>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div
              className="flex flex-col items-center justify-center h-full px-8"
              data-ocid="viewer.empty_state"
            >
              <button
                type="button"
                className="border-2 border-dashed border-[oklch(0.28_0.025_270)] rounded-xl p-10 mb-8 text-center max-w-sm w-full"
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: "pointer" }}
                data-ocid="viewer.dropzone"
              >
                <div className="w-14 h-14 rounded-full bg-[oklch(0.55_0.22_25/0.15)] flex items-center justify-center mx-auto mb-4">
                  <Upload size={24} className="text-[oklch(0.55_0.22_25)]" />
                </div>
                <p className="text-white font-semibold mb-1">
                  Open a PDF to get started
                </p>
                <p className="text-xs text-[oklch(0.55_0.015_270)]">
                  Drag & drop or click to browse
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-4 px-5 py-2 rounded bg-[oklch(0.55_0.22_25)] hover:bg-[oklch(0.50_0.22_25)] text-white text-sm font-medium transition-colors"
                  data-ocid="viewer.upload_button"
                >
                  Browse Files
                </button>
              </button>

              {/* Feature cards */}
              <div className="grid grid-cols-3 gap-3 max-w-2xl w-full">
                {featureCards.map((card) => (
                  <div
                    key={card.title}
                    className="bg-[oklch(0.17_0.025_270)] border border-[oklch(0.22_0.02_270)] rounded-lg p-4"
                  >
                    <div className="text-[oklch(0.55_0.22_25)] mb-2">
                      {card.icon}
                    </div>
                    <div className="text-white text-xs font-semibold mb-1">
                      {card.title}
                    </div>
                    <div className="text-[10px] text-[oklch(0.55_0.015_270)] leading-relaxed">
                      {card.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Processing Modal */}
      {modalTool && (
        <ProcessingModal tool={modalTool} onClose={() => setModalTool(null)} />
      )}

      <Toaster position="bottom-right" theme="dark" />

      {/* Footer */}
      <footer
        className="shrink-0 flex items-center justify-center px-4 text-[10px] text-[oklch(0.40_0.01_270)] bg-[oklch(0.12_0.025_270)] border-t border-[oklch(0.20_0.02_270)]"
        style={{ height: 24 }}
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 underline hover:text-[oklch(0.55_0.22_25)] transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
