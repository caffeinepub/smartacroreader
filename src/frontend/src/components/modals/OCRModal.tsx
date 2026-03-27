import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ScanText, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Tesseract from "tesseract.js";

interface OCRModalProps {
  onClose: () => void;
  currentBuffer?: ArrayBuffer;
  currentPage: number;
}

export default function OCRModal({ onClose }: OCRModalProps) {
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

  const runOCR = async (source: File | string) => {
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

  const copyText = () => {
    navigator.clipboard.writeText(extractedText);
    toast.success("Text copied to clipboard");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-2xl"
        style={{
          background: "oklch(18% 0 0)",
          border: "1px solid oklch(28% 0 0)",
        }}
        data-ocid="ocr.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="w-5 h-5" style={{ color: "#10b981" }} />
            OCR — Extract Text from Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <button
            type="button"
            className="w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground transition-colors"
            style={{ borderColor: "oklch(35% 0 0)" }}
            onClick={() => fileInputRef.current?.click()}
            data-ocid="ocr.dropzone"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="OCR source"
                className="max-h-40 mx-auto rounded"
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
                  background: "oklch(14% 0 0)",
                  borderColor: "oklch(32% 0 0)",
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
