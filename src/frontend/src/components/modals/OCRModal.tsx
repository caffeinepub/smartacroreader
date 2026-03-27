import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Copy, FileText, ScanText, Upload, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Tesseract from "tesseract.js";

interface OCRModalProps {
  onClose: () => void;
  currentBuffer?: ArrayBuffer;
  currentPage: number;
}

export default function OCRModal({
  onClose,
  currentBuffer,
  currentPage,
}: OCRModalProps) {
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    runOCR(file);
  };

  const runOCR = async (source: File | Blob | string) => {
    setIsProcessing(true);
    setProgress(0);
    setExtractedText("");
    try {
      const result = await Tesseract.recognize(source, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      setExtractedText(result.data.text);
      toast.success("OCR complete");
    } catch (err) {
      console.error(err);
      toast.error("OCR failed — try a clearer image");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleOCRCurrentPage = async () => {
    if (!currentBuffer) {
      toast.error("No PDF is open");
      return;
    }
    setIsProcessing(true);
    setProgress(0);
    setExtractedText("");
    try {
      const doc = await pdfjsLib.getDocument({ data: currentBuffer.slice(0) })
        .promise;
      const page = await doc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("toBlob failed"));
        }, "image/png");
      });
      await runOCR(blob);
    } catch (err) {
      console.error(err);
      toast.error("Failed to render PDF page for OCR");
      setIsProcessing(false);
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(extractedText);
    toast.success("Text copied to clipboard");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-2xl rounded-2xl shadow-2xl border p-0 overflow-hidden"
        style={{
          background: "oklch(14% 0.012 250)",
          borderColor: "oklch(22% 0.02 250)",
        }}
        data-ocid="ocr.dialog"
      >
        <DialogHeader
          className="flex flex-row items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "oklch(22% 0.02 250)" }}
        >
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ScanText className="w-4 h-4" style={{ color: "#10b981" }} />
            OCR — Extract Text
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-secondary/60"
            style={{ color: "oklch(55% 0.02 250)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <Tabs defaultValue="upload">
            <TabsList
              className="mb-4"
              style={{ background: "oklch(11% 0.015 250)" }}
            >
              <TabsTrigger value="upload" data-ocid="ocr.tab">
                <Upload className="w-3 h-3 mr-1.5" />
                Upload Image
              </TabsTrigger>
              <TabsTrigger value="current-page" data-ocid="ocr.tab">
                <FileText className="w-3 h-3 mr-1.5" />
                Current Page
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                className="w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary"
                style={{ borderColor: "oklch(28% 0.02 250)" }}
                onClick={() => fileInputRef.current?.click()}
                data-ocid="ocr.dropzone"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="OCR source"
                    className="max-h-40 mx-auto rounded-lg"
                  />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload an image (JPG, PNG, etc.)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports printed text, handwriting, and scanned documents
                    </p>
                  </>
                )}
              </button>
            </TabsContent>

            <TabsContent value="current-page" className="mt-0">
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  background: "oklch(11% 0.015 250)",
                  border: "1px solid oklch(22% 0.02 250)",
                }}
              >
                {currentBuffer ? (
                  <>
                    <FileText
                      className="w-10 h-10 mx-auto mb-3"
                      style={{ color: "#10b981" }}
                    />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Extract text from Page {currentPage}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      The page will be rendered at high resolution and scanned
                      for text
                    </p>
                    <Button
                      onClick={handleOCRCurrentPage}
                      disabled={isProcessing}
                      style={{ background: "#10b981" }}
                      className="text-white"
                      data-ocid="ocr.primary_button"
                    >
                      <ScanText className="w-4 h-4 mr-2" />
                      Extract text from page {currentPage}
                    </Button>
                  </>
                ) : (
                  <p
                    className="text-sm text-muted-foreground"
                    data-ocid="ocr.error_state"
                  >
                    No PDF is currently open. Please open a PDF first.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {isProcessing && (
            <div data-ocid="ocr.loading_state">
              <p className="text-xs text-muted-foreground mb-1">
                Processing... {progress}%
              </p>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {extractedText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Extracted Text</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyText}
                  className="h-7 text-xs"
                  data-ocid="ocr.copy.button"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="min-h-40 text-sm font-mono"
                style={{
                  background: "oklch(11% 0.015 250)",
                  borderColor: "oklch(28% 0.02 250)",
                }}
                data-ocid="ocr.textarea"
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="ocr.close.button"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
