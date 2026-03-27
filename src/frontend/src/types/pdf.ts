export type ActiveTool =
  | "select"
  | "highlight"
  | "draw"
  | "comment"
  | "eraser"
  | "signature"
  | "text";

export interface HighlightAnnotation {
  id: string;
  pageNum: number;
  type: "highlight";
  rect: { x: number; y: number; w: number; h: number };
  color?: string;
}

export interface DrawAnnotation {
  id: string;
  pageNum: number;
  type: "draw";
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface CommentAnnotation {
  id: string;
  pageNum: number;
  type: "comment";
  pos: { x: number; y: number };
  text: string;
}

export interface SignatureAnnotation {
  id: string;
  pageNum: number;
  type: "signature";
  dataUrl: string;
  rect: { x: number; y: number; w: number; h: number };
}

export interface TextAnnotation {
  id: string;
  pageNum: number;
  type: "text";
  pos: { x: number; y: number };
  text: string;
}

export type Annotation =
  | HighlightAnnotation
  | DrawAnnotation
  | CommentAnnotation
  | SignatureAnnotation
  | TextAnnotation;

export interface RecentFile {
  name: string;
  size: number;
  lastOpened: number;
}

export interface CurrentFile {
  name: string;
  buffer: ArrayBuffer;
}
