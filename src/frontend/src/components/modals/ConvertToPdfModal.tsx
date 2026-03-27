import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import mammoth from "mammoth";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ConvertToPdfModalProps {
  onClose: () => void;
}

export default function ConvertToPdfModal({ onClose }: ConvertToPdfModalProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    e.target.value = "";
  };

  const handleConvert = async () => {
    if (!selectedFile) return;
    setIsConverting(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const text = tempDiv.innerText || tempDiv.textContent || "";

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = 14;
      const lines = doc.splitTextToSize(text, maxWidth);

      let y = margin;
      for (const line of lines) {
        if (y + lineHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }

      const baseName = selectedFile.name.replace(/\.docx?$/i, "");
      const pdfName = `${baseName}.pdf`;
      doc.save(pdfName);
      toast.success(`Converted to ${pdfName}`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Conversion failed — ensure the file is a valid .docx");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-lg rounded-2xl shadow-2xl border p-0 overflow-hidden"
        style={{
          background: "oklch(14% 0.012 250)",
          borderColor: "oklch(22% 0.02 250)",
        }}
        data-ocid="word-to-pdf.dialog"
      >
        <DialogHeader
          className="flex flex-row items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "oklch(22% 0.02 250)" }}
        >
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FileUp className="w-4 h-4" style={{ color: "#16a34a" }} />
            Word → PDF Converter
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
          <div
            className="rounded-xl p-3 text-sm"
            style={{
              background: "oklch(18% 0.025 45)",
              border: "1px solid oklch(30% 0.04 45)",
              color: "oklch(65% 0.01 250)",
            }}
          >
            ⚠️ Basic conversion — text and simple formatting only. Complex
            layouts, tables, and images may differ.
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleFileSelect}
          />

          <button
            type="button"
            className="w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary"
            style={{ borderColor: "oklch(28% 0.02 250)" }}
            onClick={() => fileInputRef.current?.click()}
            data-ocid="word-to-pdf.upload_button"
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileUp className="w-5 h-5" style={{ color: "#16a34a" }} />
                <span className="text-sm font-medium text-foreground">
                  {selectedFile.name}
                </span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload a .docx file
                </p>
              </>
            )}
          </button>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConverting}
              data-ocid="word-to-pdf.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={!selectedFile || isConverting}
              className="text-white"
              style={{ background: "#3b7ef8" }}
              data-ocid="word-to-pdf.submit_button"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                "Convert to PDF"
              )}
            </Button>
          </div>

          {isConverting && (
            <p
              className="text-xs text-center text-muted-foreground"
              data-ocid="word-to-pdf.loading_state"
            >
              Processing document, please wait...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
