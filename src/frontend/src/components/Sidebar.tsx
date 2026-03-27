import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, FileText, FolderOpen, Layers } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
      className="w-64 shrink-0 flex flex-col border-r"
      style={{
        background: "oklch(var(--sidebar))",
        borderColor: "oklch(var(--sidebar-border))",
      }}
      data-ocid="sidebar.section"
    >
      {/* Tab bar — pill-style active indicator */}
      <div
        className="flex p-2 gap-1 border-b"
        style={{ borderColor: "oklch(var(--sidebar-border))" }}
      >
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all duration-150"
          style={
            activeTab === "files"
              ? {
                  background: "oklch(62% 0.22 250 / 0.15)",
                  color: "oklch(72% 0.22 250)",
                }
              : { color: "oklch(55% 0.02 250)" }
          }
          onClick={() => onTabChange("files")}
          data-ocid="sidebar.files.tab"
        >
          <Clock className="w-3 h-3" />
          Recent
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all duration-150"
          style={
            activeTab === "thumbs"
              ? {
                  background: "oklch(62% 0.22 250 / 0.15)",
                  color: "oklch(72% 0.22 250)",
                }
              : { color: "oklch(55% 0.02 250)" }
          }
          onClick={() => onTabChange("thumbs")}
          data-ocid="sidebar.thumbs.tab"
        >
          <Layers className="w-3 h-3" />
          Pages
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <AnimatePresence mode="wait">
            {activeTab === "files" && (
              <motion.div
                key="files"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="p-2"
              >
                {recentFiles.length === 0 ? (
                  <div
                    className="text-center py-10"
                    data-ocid="sidebar.files.empty_state"
                  >
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-25" />
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
                      <li
                        key={f.name}
                        data-ocid={`sidebar.files.item.${i + 1}`}
                      >
                        <button
                          type="button"
                          className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-secondary/50 transition-colors group"
                          onClick={onOpenFile}
                        >
                          <div className="flex items-start gap-2">
                            <FileText
                              className="w-3.5 h-3.5 mt-0.5 shrink-0"
                              style={{ color: "#3b7ef8" }}
                            />
                            <div className="min-w-0">
                              <p
                                className="text-xs font-medium text-foreground truncate leading-tight"
                                title={f.name}
                              >
                                {f.name}
                              </p>
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: "oklch(50% 0.01 250)" }}
                              >
                                {formatSize(f.size)} ·{" "}
                                {formatDate(f.lastOpened)}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}

            {activeTab === "thumbs" && (
              <motion.div
                key="thumbs"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="p-2"
              >
                {thumbnails.length === 0 ? (
                  <div
                    className="text-center py-10"
                    data-ocid="sidebar.thumbs.empty_state"
                  >
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-25" />
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
                          className="w-full rounded-lg overflow-hidden border-2 transition-all relative group"
                          style={{
                            borderColor:
                              currentPage === i + 1 ? "#3b7ef8" : "transparent",
                            boxShadow:
                              currentPage === i + 1
                                ? "0 0 0 1px #3b7ef840, 0 0 8px #3b7ef825"
                                : "none",
                          }}
                          onClick={() => onPageSelect(i + 1)}
                        >
                          <img
                            src={thumb}
                            alt={`Page ${i + 1}`}
                            className="w-full block"
                          />
                          {/* Page number badge overlay */}
                          <span
                            className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none"
                            style={{
                              background: "rgba(0,0,0,0.65)",
                              color: "#fff",
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            {i + 1}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Gradient fade at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent, oklch(11% 0.015 250))",
          }}
        />
      </div>
    </aside>
  );
}
