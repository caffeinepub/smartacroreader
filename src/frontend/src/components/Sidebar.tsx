import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, FolderOpen, Layers } from "lucide-react";
import type { RecentFile } from "../types/pdf";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface SidebarProps {
  activeTab: "files" | "thumbs";
  onTabChange: (tab: "files" | "thumbs") => void;
  recentFiles: RecentFile[];
  thumbnails: string[];
  currentPage: number;
  onPageSelect: (page: number) => void;
  onOpenFile: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  recentFiles,
  thumbnails,
  currentPage,
  onPageSelect,
  onOpenFile,
}: SidebarProps) {
  return (
    <aside
      className="w-52 shrink-0 flex flex-col border-r border-border"
      style={{ background: "oklch(var(--sidebar))" }}
      data-ocid="sidebar.section"
    >
      <div className="flex border-b border-border">
        <button
          type="button"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "files"
              ? "text-foreground border-b-2"
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={activeTab === "files" ? { borderBottomColor: "#e84c22" } : {}}
          onClick={() => onTabChange("files")}
          data-ocid="sidebar.files.tab"
        >
          <Clock className="w-3 h-3" />
          Recent
        </button>
        <button
          type="button"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "thumbs"
              ? "text-foreground border-b-2"
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={activeTab === "thumbs" ? { borderBottomColor: "#e84c22" } : {}}
          onClick={() => onTabChange("thumbs")}
          data-ocid="sidebar.thumbs.tab"
        >
          <Layers className="w-3 h-3" />
          Pages
        </button>
      </div>

      <ScrollArea className="flex-1">
        {activeTab === "files" && (
          <div className="p-2">
            {recentFiles.length === 0 ? (
              <div
                className="text-center py-10"
                data-ocid="sidebar.files.empty_state"
              >
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs text-muted-foreground mb-3">
                  No recent files
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={onOpenFile}
                  data-ocid="sidebar.open_file.button"
                >
                  Open PDF
                </Button>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {recentFiles.map((f, i) => (
                  <li key={f.name} data-ocid={`sidebar.files.item.${i + 1}`}>
                    <button
                      type="button"
                      className="w-full text-left rounded px-2 py-2 hover:bg-secondary/50"
                      onClick={onOpenFile}
                    >
                      <p
                        className="text-xs font-medium text-foreground truncate"
                        title={f.name}
                      >
                        {f.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(f.size)} · {formatDate(f.lastOpened)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "thumbs" && (
          <div className="p-2">
            {thumbnails.length === 0 ? (
              <div
                className="text-center py-10"
                data-ocid="sidebar.thumbs.empty_state"
              >
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs text-muted-foreground">
                  Open a PDF to see pages
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {thumbnails.map((thumb, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: thumbnail index is stable
                  <li key={i} data-ocid={`sidebar.thumbs.item.${i + 1}`}>
                    <button
                      type="button"
                      className={`w-full rounded overflow-hidden border-2 transition-all ${
                        currentPage === i + 1
                          ? "border-primary"
                          : "border-transparent hover:border-muted"
                      }`}
                      style={
                        currentPage === i + 1 ? { borderColor: "#e84c22" } : {}
                      }
                      onClick={() => onPageSelect(i + 1)}
                    >
                      <img
                        src={thumb}
                        alt={`Page ${i + 1}`}
                        className="w-full"
                      />
                      <p className="text-center text-xs py-0.5 text-muted-foreground">
                        {i + 1}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
