import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePlus, Upload, X } from "lucide-react";
import { PDFDocument, type PDFImage } from "pdf-lib";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ImageEntry {
  name: string;
  dataUrl: string;
  file: File;
}

interface CreateFromImagesModalProps {
  onClose: () => void;
}

export default function CreateFromImagesModal({
  onClose,
}: CreateFromImagesModalProps) {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addImages = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) {
      toast.error("Please select image files");
      return;
    }
    Promise.all(
      arr.map(
        (f) =>
          new Promise<ImageEntry>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) =>
              resolve({
                name: f.name,
                dataUrl: e.target!.result as string,
                file: f,
              });
            reader.readAsDataURL(f);
          }),
      ),
    ).then((entries) => setImages((prev) => [...prev, ...entries]));
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addImages(e.dataTransfer.files);
  };

  const removeImage = (i: number) =>
    setImages((prev) => prev.filter((_, idx) => idx !== i));

  const handleCreate = async () => {
    if (!images.length) {
      toast.error("Add at least one image");
      return;
    }
    setIsCreating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      for (const img of images) {
        const arrayBuf = await img.file.arrayBuffer();
        let embedded: PDFImage;
        if (img.file.type === "image/png") {
          embedded = await pdfDoc.embedPng(arrayBuf);
        } else {
          embedded = await pdfDoc.embedJpg(arrayBuf);
        }
        const { width, height } = embedded.scale(1);
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embedded, { x: 0, y: 0, width, height });
      }
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "created_from_images.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Created PDF from ${images.length} image(s)!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create PDF");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-lg"
        style={{
          background: "oklch(18% 0 0)",
          border: "1px solid oklch(28% 0 0)",
        }}
        data-ocid="create_images.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5" style={{ color: "#06b6d4" }} />
            Create PDF from Images
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <button
            type="button"
            className="w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
            style={{ borderColor: dragOver ? "#06b6d4" : "oklch(35% 0 0)" }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              const inp = document.createElement("input");
              inp.type = "file";
              inp.accept = "image/*";
              inp.multiple = true;
              inp.onchange = (e) =>
                addImages((e.target as HTMLInputElement).files!);
              inp.click();
            }}
            data-ocid="create_images.dropzone"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop images here or click to select
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG supported
            </p>
          </button>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
              {images.map((img, i) => (
                <div
                  key={`${img.name}-${i}`}
                  className="relative group rounded overflow-hidden"
                  data-ocid={`create_images.item.${i + 1}`}
                >
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="w-full h-24 object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.7)" }}
                    onClick={() => removeImage(i)}
                    data-ocid={`create_images.delete_button.${i + 1}`}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  <p
                    className="text-xs text-center py-0.5 truncate px-1"
                    style={{ color: "oklch(62% 0 0)" }}
                  >
                    {img.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-ocid="create_images.cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !images.length}
              className="flex-1"
              style={{ background: "#06b6d4", color: "#fff" }}
              data-ocid="create_images.submit_button"
            >
              {isCreating
                ? "Creating..."
                : `Create PDF (${images.length} images)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
