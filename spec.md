# SmartAcroReader

## Current State
The project has a React/TypeScript frontend with shadcn/ui components. Previous versions had persistent issues with PDF.js worker loading, causing PDFs not to open. The UI was an Adobe Acrobat-style dark theme but features were either shells or broken due to missing/misconfigured packages.

## Requested Changes (Diff)

### Add
- Complete rebuild of all frontend UI with new dark professional theme (Adobe Acrobat-style)
- PDF viewer using PDF.js with worker loaded from CDN (unpkg) — this is the critical fix
- Dashboard landing page with feature overview
- Left sidebar: file library, page thumbnails panel
- Top toolbar: all tools accessible
- Right panel: context-sensitive tool options
- Features:
  - Upload and open PDFs (core, must work reliably)
  - Highlight / draw / comment annotations on canvas overlay
  - E-signatures (draw or type, embed into page)
  - OCR using Tesseract.js (extract text from scanned PDFs)
  - Merge multiple PDFs (pdf-lib)
  - Split PDF into pages or ranges (pdf-lib)
  - Create PDF from images (pdf-lib)
  - Password protect PDF (pdf-lib encryption)
  - Fill form fields
  - Version history (localStorage-based)
  - Responsive layout for desktop/tablet/mobile
- "Not available" labels on: Convert to Word/Excel/PPT, Create from Word/Excel

### Modify
- App.tsx: full replacement with new layout and routing
- index.css: new dark theme design tokens

### Remove
- All old viewer components and broken PDF rendering code
- Auth hooks usage in main app flow
- Any Stripe references in UI

## Implementation Plan
1. Replace index.css with dark Acrobat-style design tokens (OKLCH dark palette)
2. Create App.tsx with dashboard + viewer layout
3. Create PDFViewer component — loads pdfjs-dist, sets worker via CDN URL from unpkg, renders each page to canvas
4. Create AnnotationLayer component — SVG/canvas overlay for highlights, drawings, comments
5. Create Toolbar component — all tool buttons, upload trigger
6. Create Sidebar component — file library list, page thumbnails
7. Create tools: SignatureModal, OCRModal, MergeModal, SplitModal, ProtectModal, CreateFromImagesModal
8. Wire localStorage for version history and file library
9. Install packages: pdfjs-dist, pdf-lib, tesseract.js
10. Validate build passes
