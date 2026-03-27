import { Toaster } from "@/components/ui/sonner";
import {
  FileText,
  ImagePlus,
  Layers,
  Merge,
  PenTool,
  ScanText,
  Scissors,
  Shield,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import PDFViewer from "./components/PDFViewer";
import Sidebar from "./components/Sidebar";
import Toolbar from "./components/Toolbar";
import CreateFromImagesModal from "./components/modals/CreateFromImagesModal";
import MergeModal from "./components/modals/MergeModal";
import OCRModal from "./components/modals/OCRModal";
import ProtectModal from "./components/modals/ProtectModal";
import SignatureModal from "./components/modals/SignatureModal";
import SplitModal from "./components/modals/SplitModal";
import type {
  ActiveTool,
  Annotation,
  CurrentFile,
  RecentFile,
} from "./types/pdf";

const RECENT_KEY = "smartacroreader_recent";

function loadRecent(): RecentFile[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(file: { name: string; size: number }) {
  const list = loadRecent();
  const updated = [
    { name: file.name, size: file.size, lastOpened: Date.now() },
    ...list.filter((f) => f.name !== file.name),
  ].slice(0, 10);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export default function App() {
  const [currentFile, setCurrentFile] = useState<CurrentFile | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [zoom, setZoom] = useState(1.2);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecent);
  const [sidebarTab, setSidebarTab] = useState<"files" | "thumbs">("files");
  const [pendingSignatureDataUrl, setPendingSignatureDataUrl] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      setCurrentFile({ name: file.name, buffer });
      setAnnotations([]);
      setCurrentPage(1);
      saveRecent({ name: file.name, size: file.size });
      setRecentFiles(loadRecent());
      setSidebarTab("thumbs");
      toast.success(`Opened ${file.name}`);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === "application/pdf") openFile(file);
      else if (file) toast.error("Please select a PDF file");
      e.target.value = "";
    },
    [openFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") openFile(file);
      else toast.error("Please drop a PDF file");
    },
    [openFile],
  );

  const handleAddAnnotation = useCallback((ann: Annotation) => {
    setAnnotations((prev) => [...prev, ann]);
  }, []);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSignatureInsert = useCallback((dataUrl: string) => {
    setPendingSignatureDataUrl(dataUrl);
    setActiveTool("signature");
    setActiveModal(null);
    toast.info("Click on the PDF page to place your signature");
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Toaster theme="dark" position="bottom-right" />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Toolbar
        hasFile={!!currentFile}
        fileName={currentFile?.name}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        zoom={zoom}
        onZoomChange={setZoom}
        currentPage={currentPage}
        pageCount={pageCount}
        onPageChange={setCurrentPage}
        onOpenFile={() => fileInputRef.current?.click()}
        onOpenModal={setActiveModal}
        annotations={annotations}
        currentFile={currentFile}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          recentFiles={recentFiles}
          thumbnails={thumbnails}
          currentPage={currentPage}
          onPageSelect={setCurrentPage}
          onOpenFile={() => fileInputRef.current?.click()}
        />

        {currentFile ? (
          <PDFViewer
            buffer={currentFile.buffer}
            activeTool={activeTool}
            annotations={annotations}
            onAnnotationAdd={handleAddAnnotation}
            onAnnotationDelete={handleDeleteAnnotation}
            zoom={zoom}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageCountChange={setPageCount}
            onThumbnailsReady={setThumbnails}
            pendingSignatureDataUrl={pendingSignatureDataUrl}
            onSignaturePlaced={() => {
              setPendingSignatureDataUrl(null);
              setActiveTool("select");
            }}
          />
        ) : (
          <Dashboard
            onDrop={handleDrop}
            onOpenFile={() => fileInputRef.current?.click()}
            onOpenModal={setActiveModal}
          />
        )}
      </div>

      {activeModal === "sign" && (
        <SignatureModal
          onClose={() => setActiveModal(null)}
          onInsert={handleSignatureInsert}
        />
      )}
      {activeModal === "ocr" && (
        <OCRModal
          onClose={() => setActiveModal(null)}
          currentBuffer={currentFile?.buffer}
          currentPage={currentPage}
        />
      )}
      {activeModal === "merge" && (
        <MergeModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "split" && currentFile && (
        <SplitModal
          onClose={() => setActiveModal(null)}
          buffer={currentFile.buffer}
          fileName={currentFile.name}
          pageCount={pageCount}
        />
      )}
      {activeModal === "protect" && currentFile && (
        <ProtectModal
          onClose={() => setActiveModal(null)}
          buffer={currentFile.buffer}
          fileName={currentFile.name}
        />
      )}
      {activeModal === "create-images" && (
        <CreateFromImagesModal onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}

const FEATURE_CARDS = [
  {
    icon: PenTool,
    label: "Annotate & Highlight",
    desc: "Add highlights, drawings, and comments",
    color: "#e84c22",
  },
  {
    icon: FileText,
    label: "E-Signatures",
    desc: "Draw or type your signature",
    modal: "sign",
    color: "#3b82f6",
  },
  {
    icon: ScanText,
    label: "OCR Text Extract",
    desc: "Extract text from scanned documents",
    modal: "ocr",
    color: "#10b981",
  },
  {
    icon: Merge,
    label: "Merge PDFs",
    desc: "Combine multiple PDFs into one",
    modal: "merge",
    color: "#8b5cf6",
  },
  {
    icon: Scissors,
    label: "Split PDF",
    desc: "Split PDF into smaller files",
    modal: "split",
    color: "#f59e0b",
  },
  {
    icon: Shield,
    label: "Password Protect",
    desc: "Encrypt and protect your PDF",
    modal: "protect",
    color: "#ef4444",
  },
  {
    icon: ImagePlus,
    label: "Create from Images",
    desc: "Build a PDF from JPG/PNG files",
    modal: "create-images",
    color: "#06b6d4",
  },
  {
    icon: Layers,
    label: "All Features Free",
    desc: "No login, no payment required",
    color: "#e84c22",
  },
];

function Dashboard({
  onDrop,
  onOpenFile,
  onOpenModal,
}: {
  onDrop: (e: React.DragEvent) => void;
  onOpenFile: () => void;
  onOpenModal: (modal: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <main
      className="flex-1 overflow-y-auto scrollbar-thin p-8"
      data-ocid="dashboard.section"
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "#e84c22" }}
            >
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              SmartAcroReader
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Professional PDF Editor — All features free, no account required
          </p>
        </div>

        {/* Drop zone as button for a11y */}
        <button
          type="button"
          className={`w-full border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all mb-10 ${
            dragOver
              ? "border-primary"
              : "border-border hover:border-muted-foreground"
          }`}
          style={{
            background: dragOver
              ? "oklch(58% 0.22 30 / 0.05)"
              : "oklch(16% 0 0)",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            setDragOver(false);
            onDrop(e);
          }}
          onClick={onOpenFile}
          data-ocid="dashboard.dropzone"
        >
          <Upload
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "#e84c22" }}
          />
          <p className="text-lg font-semibold text-foreground mb-1">
            Drop a PDF here or click to upload
          </p>
          <p className="text-sm text-muted-foreground">
            Supports any PDF — annotate, sign, OCR, merge, split and more
          </p>
        </button>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURE_CARDS.map((card) => (
            <button
              type="button"
              key={card.label}
              onClick={() => card.modal && onOpenModal(card.modal)}
              className="rounded-lg p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: "oklch(18% 0 0)",
                border: "1px solid oklch(28% 0 0)",
              }}
              data-ocid={`dashboard.${card.label.toLowerCase().replace(/\s+/g, "-")}.card`}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${card.color}20` }}
              >
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <p className="font-semibold text-sm text-foreground mb-0.5">
                {card.label}
              </p>
              <p className="text-xs" style={{ color: "oklch(62% 0 0)" }}>
                {card.desc}
              </p>
            </button>
          ))}
        </div>

        <div
          className="mt-12 text-center text-xs"
          style={{ color: "oklch(45% 0 0)" }}
        >
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </div>
      </div>
    </main>
  );
}
