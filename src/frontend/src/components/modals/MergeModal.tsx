import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GripVertical, Merge, Upload, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface PDFEntry {
  name: string;
  buffer: ArrayBuffer;
}

interface MergeModalProps {
  onClose: () => void;
}

export default function MergeModal({ onClose }: MergeModalProps) {
  const [files, setFiles] = useState<PDFEntry[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf",
    );
    if (!arr.length) {
      toast.error("Please select PDF files");
      return;
    }
    Promise.all(
      arr.map(
        (f) =>
          new Promise<PDFEntry>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) =>
              resolve({
                name: f.name,
                buffer: e.target!.result as ArrayBuffer,
              });
            reader.readAsArrayBuffer(f);
          }),
      ),
    ).then((entries) => setFiles((prev) => [...prev, ...entries]));
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const moveUp = (i: number) => {
    if (i === 0) return;
    setFiles((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    setFiles((prev) => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast.error("Add at least 2 PDFs");
      return;
    }
    setIsMerging(true);
    try {
      const merged = await PDFDocument.create();
      for (const entry of files) {
        const doc = await PDFDocument.load(entry.buffer.slice(0));
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        for (const p of pages) merged.addPage(p);
      }
      const bytes = await merged.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDFs merged and downloaded!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to merge PDFs");
    } finally {
      setIsMerging(false);
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
        data-ocid="merge.dialog"
      >
        <DialogHeader
          className="flex flex-row items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "oklch(22% 0.02 250)" }}
        >
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Merge className="w-4 h-4" style={{ color: "#8b5cf6" }} />
            Merge PDFs
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
          <button
            type="button"
            className="w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
            style={{
              borderColor: dragOver ? "#8b5cf6" : "oklch(28% 0.02 250)",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              const inp = document.createElement("input");
              inp.type = "file";
              inp.accept = "application/pdf";
              inp.multiple = true;
              inp.onchange = (e) =>
                addFiles((e.target as HTMLInputElement).files!);
              inp.click();
            }}
            data-ocid="merge.dropzone"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop PDFs here or click to select
            </p>
          </button>

          {files.length > 0 && (
            <ul
              className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin"
              data-ocid="merge.list"
            >
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={{ background: "oklch(18% 0.015 250)" }}
                  data-ocid={`merge.item.${i + 1}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveUp(i)}
                      className="text-muted-foreground hover:text-foreground text-xs leading-none"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(i)}
                      className="text-muted-foreground hover:text-foreground text-xs leading-none"
                    >
                      ▼
                    </button>
                  </div>
                  <GripVertical className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs flex-1 truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    data-ocid={`merge.delete_button.${i + 1}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-ocid="merge.cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={isMerging || files.length < 2}
              className="flex-1 text-white"
              style={{ background: "#3b7ef8" }}
              data-ocid="merge.submit_button"
            >
              {isMerging ? "Merging..." : `Merge ${files.length} PDFs`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
