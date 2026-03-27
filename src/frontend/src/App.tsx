import { Toaster } from "@/components/ui/sonner";
import {
  FileDown,
  FileText,
  FileUp,
  ImagePlus,
  Layers,
  Merge,
  PenTool,
  ScanText,
  Scissors,
  Shield,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import { PDFDocument, degrees } from "pdf-lib";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import PDFViewer from "./components/PDFViewer";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import Toolbar from "./components/Toolbar";
import ConvertToPdfModal from "./components/modals/ConvertToPdfModal";
import ConvertToWordModal from "./components/modals/ConvertToWordModal";
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
  const [drawColor, setDrawColor] = useState("#e84c22");
  const [drawWidth, setDrawWidth] = useState(2.5);
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

  const handleUndoAnnotation = useCallback(() => {
    setAnnotations((prev) => prev.slice(0, -1));
  }, []);

  const handleSignatureInsert = useCallback((dataUrl: string) => {
    setPendingSignatureDataUrl(dataUrl);
    setActiveTool("signature");
    setActiveModal(null);
    toast.info("Click on the PDF page to place your signature");
  }, []);

  const handleRotatePage = useCallback(async () => {
    if (!currentFile) return;
    try {
      const pdfDoc = await PDFDocument.load(currentFile.buffer.slice(0));
      const page = pdfDoc.getPage(currentPage - 1);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + 90));
      const pdfBytes = await pdfDoc.save();
      const newBuffer = pdfBytes.buffer as ArrayBuffer;
      setCurrentFile({ name: currentFile.name, buffer: newBuffer });
      toast.success(`Page ${currentPage} rotated`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to rotate page");
    }
  }, [currentFile, currentPage]);

  // Ctrl+Z / Meta+Z undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndoAnnotation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndoAnnotation]);

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
        drawColor={drawColor}
        drawWidth={drawWidth}
        onDrawColorChange={setDrawColor}
        onDrawWidthChange={setDrawWidth}
        onUndoAnnotation={handleUndoAnnotation}
        onRotatePage={handleRotatePage}
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
            drawColor={drawColor}
            drawWidth={drawWidth}
          />
        ) : (
          <Dashboard
            onDrop={handleDrop}
            onOpenFile={() => fileInputRef.current?.click()}
            onOpenModal={setActiveModal}
          />
        )}
      </div>

      <StatusBar
        activeTool={activeTool}
        fileName={currentFile?.name}
        currentPage={currentPage}
        pageCount={pageCount}
        zoom={zoom}
      />

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
      {activeModal === "pdf-to-word" && (
        <ConvertToWordModal
          onClose={() => setActiveModal(null)}
          currentBuffer={currentFile?.buffer}
          fileName={currentFile?.name}
        />
      )}
      {activeModal === "word-to-pdf" && (
        <ConvertToPdfModal onClose={() => setActiveModal(null)} />
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
    color: "#3b7ef8",
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
    icon: FileDown,
    label: "PDF → Word",
    desc: "Export text to DOCX",
    modal: "pdf-to-word",
    color: "#2563eb",
  },
  {
    icon: FileUp,
    label: "Word → PDF",
    desc: "Convert DOCX to PDF",
    modal: "word-to-pdf",
    color: "#16a34a",
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
        {/* Hero */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: "linear-gradient(135deg, #e84c22, #c0360e)",
                boxShadow: "0 0 20px #e84c2240",
              }}
            >
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight gradient-text">
              SmartAcroReader
            </h1>
          </div>
          <p style={{ color: "oklch(55% 0.02 250)" }} className="text-sm">
            Professional PDF Editor — All tools free, no account required
          </p>
        </motion.div>

        {/* Drop zone */}
        <motion.button
          type="button"
          className="w-full rounded-2xl p-14 text-center cursor-pointer transition-all mb-10 relative overflow-hidden"
          style={{
            background: dragOver
              ? "oklch(14% 0.02 250)"
              : "oklch(11% 0.015 250)",
            boxShadow: dragOver
              ? "0 0 0 1px #3b7ef860, 0 0 32px #3b7ef818"
              : "0 0 0 1px oklch(22% 0.02 250)",
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
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.998 }}
          data-ocid="dashboard.dropzone"
        >
          <div
            className="absolute inset-0 rounded-2xl dropzone-animated opacity-60"
            style={{ pointerEvents: "none" }}
          />
          <div className="relative z-10">
            <div className="pulse-icon inline-block">
              <Upload
                className="w-12 h-12 mx-auto mb-4"
                style={{
                  color: dragOver ? "#3b7ef8" : "#e84c22",
                  filter: dragOver
                    ? "drop-shadow(0 0 8px #3b7ef860)"
                    : "drop-shadow(0 0 6px #e84c2240)",
                  transition: "color 0.2s, filter 0.2s",
                }}
              />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">
              Drop a PDF here or click to upload
            </p>
            <p style={{ color: "oklch(55% 0.02 250)" }} className="text-sm">
              Annotate, sign, OCR, merge, split and more — all in your browser
            </p>
          </div>
        </motion.button>

        {/* Feature cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {FEATURE_CARDS.map((card, idx) => (
            <motion.button
              type="button"
              key={card.label}
              onClick={() => card.modal && onOpenModal(card.modal)}
              className="rounded-xl p-4 text-left cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, oklch(14% 0.012 250), oklch(11% 0.015 250))",
                border: "1px solid oklch(22% 0.02 250)",
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              whileHover={{
                scale: 1.02,
                y: -2,
                boxShadow: `0 0 16px ${card.color}30, 0 0 0 1px ${card.color}20`,
              }}
              whileTap={{ scale: 0.98 }}
              data-ocid="dashboard.card"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${card.color}18` }}
              >
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <p className="font-semibold text-xs text-foreground mb-0.5 leading-snug">
                {card.label}
              </p>
              <p
                className="text-xs leading-snug"
                style={{ color: "oklch(52% 0.01 250)" }}
              >
                {card.desc}
              </p>
            </motion.button>
          ))}
        </div>

        <div
          className="mt-12 text-center text-xs"
          style={{ color: "oklch(38% 0.01 250)" }}
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
