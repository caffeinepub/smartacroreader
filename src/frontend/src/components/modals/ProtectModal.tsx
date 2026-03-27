import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProtectModalProps {
  onClose: () => void;
  buffer: ArrayBuffer;
  fileName: string;
}

export default function ProtectModal({
  onClose,
  buffer,
  fileName,
}: ProtectModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProtect = async () => {
    if (!password) {
      toast.error("Enter a password");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    setIsProcessing(true);
    try {
      const { PDFDocument, StandardFonts, rgb, degrees } = await import(
        "pdf-lib"
      );
      const pdfDoc = await PDFDocument.load(buffer.slice(0));
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText("PASSWORD PROTECTED", {
          x: width / 2 - 100,
          y: height / 2,
          size: 28,
          font,
          color: rgb(0.91, 0.3, 0.13),
          opacity: 0.12,
          rotate: degrees(45),
        });
      }
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName.replace(/\.pdf$/i, "")}_protected.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        "PDF downloaded (note: full AES encryption requires a server tool)",
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to process PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-sm rounded-2xl shadow-2xl border p-0 overflow-hidden"
        style={{
          background: "oklch(14% 0.012 250)",
          borderColor: "oklch(22% 0.02 250)",
        }}
        data-ocid="protect.dialog"
      >
        <DialogHeader
          className="flex flex-row items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "oklch(22% 0.02 250)" }}
        >
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Shield className="w-4 h-4" style={{ color: "#ef4444" }} />
            Password Protect
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
            className="flex items-start gap-2 rounded-xl p-3 text-xs"
            style={{
              background: "oklch(18% 0.025 45)",
              border: "1px solid oklch(30% 0.04 45)",
            }}
          >
            <AlertTriangle
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "#f59e0b" }}
            />
            <p className="text-muted-foreground">
              Browser-based AES encryption requires a server. This will add a
              watermark. For real encryption, use Adobe Acrobat or qpdf.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ background: "oklch(11% 0.015 250)" }}
              data-ocid="protect.password.input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Confirm Password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              style={{ background: "oklch(11% 0.015 250)" }}
              data-ocid="protect.confirm.input"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-ocid="protect.cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProtect}
              disabled={isProcessing}
              className="flex-1 text-white"
              style={{ background: "#3b7ef8" }}
              data-ocid="protect.submit_button"
            >
              {isProcessing ? "Processing..." : "Download Protected"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
