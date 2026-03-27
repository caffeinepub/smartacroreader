interface StatusBarProps {
  activeTool: string;
  fileName?: string;
  currentPage: number;
  pageCount: number;
  zoom: number;
}

const TOOL_LABELS: Record<string, string> = {
  select: "Select",
  highlight: "Highlight",
  draw: "Draw",
  comment: "Comment",
  eraser: "Eraser",
  signature: "Signature",
};

export default function StatusBar({
  activeTool,
  fileName,
  currentPage,
  pageCount,
  zoom,
}: StatusBarProps) {
  return (
    <footer
      className="h-7 shrink-0 flex items-center justify-between px-4 border-t text-xs select-none"
      style={{
        background: "oklch(6% 0.01 250)",
        borderColor: "oklch(22% 0.02 250)",
        color: "oklch(50% 0.015 250)",
      }}
      data-ocid="statusbar.section"
    >
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: "#3b7ef8" }}
        />
        {TOOL_LABELS[activeTool] ?? activeTool}
      </span>

      {fileName && (
        <span
          className="truncate max-w-[280px] text-center"
          title={fileName}
          style={{ color: "oklch(58% 0.015 250)" }}
        >
          {fileName}
        </span>
      )}

      <span className="tabular-nums">
        {pageCount > 0 ? `Page ${currentPage} / ${pageCount}` : "—"}
        {" | "}
        {Math.round(zoom * 100)}%
      </span>
    </footer>
  );
}
