# SmartAcroReader

## Current State
Full PDF editor with dark Acrobat-style theme. Features: PDF.js rendering (CDN worker), highlight/draw/comment/eraser/signature annotation tools, OCR via Tesseract.js (image-only), merge/split/protect via pdf-lib, PDF→Word (docx) and Word→PDF (mammoth+jspdf) conversions. Annotations are stored in React state; highlights and draw paths are embedded in downloaded PDF, but signatures and comments are NOT embedded.

## Requested Changes (Diff)

### Add
- **Color palette for draw/highlight tools** — floating popover near toolbar showing 8 preset colors + opacity control. Store selected color in App state, pass to AnnotationLayer and use when creating draw/highlight annotations.
- **Text annotation tool** — new `text` ActiveTool. Click on PDF to drop a draggable, resizable text box. Text boxes are rendered as HTML overlays (like comments). On PDF download, embed as text via pdf-lib `drawText`.
- **Rotate page tool** — button in toolbar (only visible when PDF open). Rotate current page 90° CW using pdf-lib, update the buffer in state, re-render.
- **Undo last annotation** — Ctrl+Z keyboard shortcut and undo button in toolbar. Pop the last annotation from the annotations array.
- **OCR from current PDF page** — In OCRModal, add a second tab "Current Page" alongside "Upload Image". Render the currentPage canvas from pdfDocRef using PDF.js (same worker), export to PNG blob, feed to Tesseract. The `currentBuffer` and `currentPage` props are already wired — just need to be used.
- **Signature embedded in PDF download** — In Toolbar `handleDownload`, use `pdf-lib` `embedPng`/`embedJpg` to draw signature images onto pages. Signatures already have `rect` in % coords.
- **Comment text embedded in PDF download** — In Toolbar `handleDownload`, use pdf-lib `drawText` to embed comment text at the % coords on the page.
- **Draw stroke width control** — add a thickness slider (1–8px) in the color palette popover. Pass to AnnotationLayer.

### Modify
- **AnnotationLayer** — accept `drawColor: string` and `drawWidth: number` props instead of hardcoded values. Use these when creating new draw/highlight annotations.
- **Toolbar `handleDownload`** — extend to embed signatures (embedPng) and comments (drawText) in the PDF bytes before download.
- **OCRModal** — make `currentBuffer` and `currentPage` actually used: add "Current Page" tab that renders the page, exports to blob, then runs Tesseract on it.
- **App.tsx** — add `drawColor` and `drawWidth` state, pass to Toolbar and PDFViewer→AnnotationLayer. Add keyboard listener for Ctrl+Z undo. Add `onUndoAnnotation` callback.
- **ConvertToWordModal** — remove duplicate `pdfjsLib.GlobalWorkerOptions.workerSrc` assignment (already set in PDFViewer, setting it again may cause conflicts; use the same pattern or skip re-assignment).

### Remove
- Hardcoded `color: "#e84c22"` and `width: 2.5` in AnnotationLayer draw annotation creation — replaced by props.
