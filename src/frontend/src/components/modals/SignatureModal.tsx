import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useRef, useState } from "react";

interface SignatureModalProps {
  onClose: () => void;
  onInsert: (dataUrl: string) => void;
}

export default function SignatureModal({
  onClose,
  onInsert,
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState("");
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPos.current = pos;
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const insertDrawn = () => {
    const canvas = canvasRef.current!;
    onInsert(canvas.toDataURL("image/png"));
  };

  const insertTyped = () => {
    if (!typedName.trim()) return;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "italic 56px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 200, 60);
    onInsert(canvas.toDataURL("image/png"));
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-lg"
        style={{
          background: "oklch(18% 0 0)",
          border: "1px solid oklch(28% 0 0)",
        }}
        data-ocid="signature.dialog"
      >
        <DialogHeader>
          <DialogTitle>Add Signature</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="draw">
          <TabsList className="w-full">
            <TabsTrigger
              value="draw"
              className="flex-1"
              data-ocid="signature.draw.tab"
            >
              Draw
            </TabsTrigger>
            <TabsTrigger
              value="type"
              className="flex-1"
              data-ocid="signature.type.tab"
            >
              Type
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <canvas
              ref={canvasRef}
              width={460}
              height={160}
              className="w-full rounded border cursor-crosshair"
              style={{
                border: "1px solid oklch(35% 0 0)",
                background: "white",
              }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
              data-ocid="signature.canvas_target"
            />
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="flex-1"
                data-ocid="signature.clear.button"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={insertDrawn}
                className="flex-1"
                style={{ background: "#e84c22" }}
                data-ocid="signature.insert.button"
              >
                Insert Signature
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1 block">Type your name</Label>
                <Input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Your full name"
                  className="text-base"
                  style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                  data-ocid="signature.name.input"
                />
              </div>
              {typedName && (
                <div
                  className="w-full h-20 flex items-center justify-center rounded"
                  style={{
                    border: "1px solid oklch(35% 0 0)",
                    fontFamily: "Georgia, serif",
                    fontStyle: "italic",
                    fontSize: "2rem",
                    color: "#1a1a1a",
                    background: "white",
                  }}
                >
                  {typedName}
                </div>
              )}
              <Button
                size="sm"
                className="w-full"
                style={{ background: "#e84c22" }}
                onClick={insertTyped}
                disabled={!typedName.trim()}
                data-ocid="signature.insert_typed.button"
              >
                Insert Signature
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="mt-2"
          data-ocid="signature.close.button"
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
