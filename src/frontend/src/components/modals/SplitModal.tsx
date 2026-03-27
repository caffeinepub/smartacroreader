import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useState } from "react";
import { toast } from "sonner";

interface SplitModalProps {
  onClose: () => void;
  buffer: ArrayBuffer;
  fileName: string;
  pageCount: number;
}

function parseRanges(input: string, maxPage: number): [number, number][] {
  const ranges: [number, number][] = [];
  const parts = input.split(",").map((s) => s.trim());
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((s) => Number.parseInt(s.trim()));
      if (
        !Number.isNaN(a) &&
        !Number.isNaN(b) &&
        a >= 1 &&
        b <= maxPage &&
        a <= b
      ) {
        ranges.push([a, b]);
      }
    } else {
      const n = Number.parseInt(part);
      if (!Number.isNaN(n) && n >= 1 && n <= maxPage) ranges.push([n, n]);
    }
  }
  return ranges;
}

export default function SplitModal({
  onClose,
  buffer,
  fileName,
  pageCount,
}: SplitModalProps) {
  const [rangeInput, setRangeInput] = useState("");
  const [splitAll, setSplitAll] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);

  const baseName = fileName.replace(/\.pdf$/i, "");

  const downloadPart = async (doc: PDFDocument, name: string) => {
    const bytes = await doc.save();
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSplit = async () => {
    setIsSplitting(true);
    try {
      const srcDoc = await PDFDocument.load(buffer.slice(0));
      if (splitAll) {
        for (let i = 0; i < pageCount; i++) {
          const newDoc = await PDFDocument.create();
          const [page] = await newDoc.copyPages(srcDoc, [i]);
          newDoc.addPage(page);
          await downloadPart(newDoc, `${baseName}_page${i + 1}.pdf`);
          await new Promise((r) => setTimeout(r, 200));
        }
        toast.success(`Split into ${pageCount} individual pages`);
      } else {
        const ranges = parseRanges(rangeInput, pageCount);
        if (!ranges.length) {
          toast.error("Invalid page ranges");
          return;
        }
        for (const [start, end] of ranges) {
          const newDoc = await PDFDocument.create();
          const indices = Array.from(
            { length: end - start + 1 },
            (_, i) => start - 1 + i,
          );
          const pages = await newDoc.copyPages(srcDoc, indices);
          for (const p of pages) newDoc.addPage(p);
          await downloadPart(newDoc, `${baseName}_pages${start}-${end}.pdf`);
          await new Promise((r) => setTimeout(r, 200));
        }
        toast.success(`Split into ${ranges.length} file(s)`);
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to split PDF");
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-md rounded-2xl shadow-2xl border p-0 overflow-hidden"
        style={{
          background: "oklch(14% 0.012 250)",
          borderColor: "oklch(22% 0.02 250)",
        }}
        data-ocid="split.dialog"
      >
        <DialogHeader
          className="flex flex-row items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "oklch(22% 0.02 250)" }}
        >
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Scissors className="w-4 h-4" style={{ color: "#f59e0b" }} />
            Split PDF
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
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{fileName}</strong> —{" "}
            {pageCount} pages
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!splitAll}
                onChange={() => setSplitAll(false)}
                className="accent-primary"
                data-ocid="split.ranges.radio"
              />
              <span className="text-sm">Split by page ranges</span>
            </label>

            {!splitAll && (
              <div className="ml-5">
                <Label className="text-xs mb-1 block">
                  Page ranges (e.g. 1-3, 4-6, 7)
                </Label>
                <Input
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="1-3, 4-6, 7"
                  className="h-8 text-sm"
                  style={{ background: "oklch(11% 0.015 250)" }}
                  data-ocid="split.ranges.input"
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={splitAll}
                onChange={() => setSplitAll(true)}
                className="accent-primary"
                data-ocid="split.all.radio"
              />
              <span className="text-sm">
                Split each page into individual files
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-ocid="split.cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSplit}
              disabled={isSplitting || (!splitAll && !rangeInput.trim())}
              className="flex-1 text-white"
              style={{ background: "#3b7ef8" }}
              data-ocid="split.submit_button"
            >
              {isSplitting ? "Splitting..." : "Split & Download"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
