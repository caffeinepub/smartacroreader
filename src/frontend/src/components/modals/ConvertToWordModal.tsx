import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDown, Loader2, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Worker is already set at module level in PDFViewer.tsx — do not reassign here

interface ConvertToWordModalProps {
  onClose: () => void;
  currentBuffer?: ArrayBuffer;
  fileName?: string;
}

export default function ConvertToWordModal({
  onClose,
  currentBuffer,
  fileName,
}: ConvertToWordModalProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    if (!currentBuffer) return;
    pdfjsLib
      .getDocument({ data: currentBuffer.slice(0) })
      .promise.then((doc) => setPageCount(doc.numPages))
      .catch(() => {});
  }, [currentBuffer]);

  const handleConvert = async () => {
    if (!currentBuffer) return;
    setIsConverting(true);
    try {
      const doc = await pdfjsLib.getDocument({ data: currentBuffer.slice(0) })
        .promise;
      const allText: string[] = [];

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        allText.push(`--- Page ${i} ---\n${pageText}`);
      }

      const { Document, Packer, Paragraph, TextRun, HeadingLevel } =
        await import("docx");

      const children = allText.flatMap((pageText, idx) => [
        new Paragraph({
          text: `Page ${idx + 1}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: idx === 0 ? 0 : 400, after: 200 },
        }),
        ...pageText
          .split("\n")
          .slice(1)
          .map(
            (line) =>
              new Paragraph({
                children: [new TextRun({ text: line, size: 22 })],
                spacing: { after: 80 },
              }),
          ),
      ]);

      const wordDoc = new Document({
        sections: [{ children }],
      });

      const blob = await Packer.toBlob(wordDoc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = fileName?.replace(/\.pdf$/i, "") ?? "document";
      a.download = `${baseName}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Converted to Word document");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Conversion failed");
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
        data-ocid="pdf-to-word.dialog"
      >
        <DialogHeader
          className="flex flex-row items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "oklch(22% 0.02 250)" }}
        >
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FileDown className="w-4 h-4" style={{ color: "#2563eb" }} />
            PDF → Word Converter
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
              background: "oklch(18% 0.02 250)",
              border: "1px solid oklch(28% 0.025 250)",
              color: "oklch(65% 0.01 250)",
            }}
          >
            ⚠️ Basic conversion — text only. Original formatting and layout will
            not be preserved.
          </div>

          {currentBuffer ? (
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: "oklch(11% 0.015 250)",
                border: "1px solid oklch(22% 0.02 250)",
              }}
            >
              <FileDown
                className="w-10 h-10 mx-auto mb-2"
                style={{ color: "#2563eb" }}
              />
              <p className="text-sm font-medium text-foreground">
                {fileName ?? "Current PDF"}
              </p>
              {pageCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {pageCount} page{pageCount !== 1 ? "s" : ""} will be extracted
                </p>
              )}
            </div>
          ) : (
            <div
              className="rounded-xl p-6 text-center"
              style={{
                background: "oklch(11% 0.015 250)",
                border: "1px solid oklch(22% 0.02 250)",
              }}
              data-ocid="pdf-to-word.error_state"
            >
              <p className="text-sm text-muted-foreground">
                No PDF is currently open. Please open a PDF first.
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConverting}
              data-ocid="pdf-to-word.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={!currentBuffer || isConverting}
              className="text-white"
              style={{ background: "#3b7ef8" }}
              data-ocid="pdf-to-word.submit_button"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                "Convert to Word"
              )}
            </Button>
          </div>

          {isConverting && (
            <p
              className="text-xs text-center text-muted-foreground"
              data-ocid="pdf-to-word.loading_state"
            >
              Extracting text from all pages...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
