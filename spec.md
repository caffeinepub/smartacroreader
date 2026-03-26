# SmartAcroReader - Complete Rebuild

## Current State
The app has persistent React error #185 (infinite re-render loop) caused by complex state management, pdfjs-dist library integration, unnecessary auth providers, and unstable hook references across multiple versions.

## Requested Changes (Diff)

### Add
- Brand new, minimal App.tsx with simple useState only (no context providers, no complex hooks)
- PDF rendered via native `<object>` or `<iframe>` tag using browser's built-in PDF viewer (zero risk of React errors)
- Adobe Acrobat-style layout: dark left sidebar, top toolbar, main viewer area
- File upload via click or drag-and-drop
- Sidebar shows list of opened PDF files with thumbnails (file name + icon)
- Toolbar with all feature buttons: Highlight, Comment, Draw, Stamp, Edit Text, Crop Pages, Delete Page, Split PDF, Merge PDF, Compress, Convert (to Word/Excel/PPT), Rotate, Zoom in/out
- Feature panels that slide in when a tool is activated (simple show/hide state)
- Toast notifications for actions

### Modify
- Delete ALL existing page components (Dashboard, ViewerPage, LandingPage, PaymentSuccess, PaymentFailure)
- Delete PDFViewer.tsx, ProfileSetupModal.tsx, UpgradeModal.tsx, all hooks (useActor, useFileStore, useInternetIdentity, useQueries)
- Delete store/fileStore.ts, utils/StorageClient.ts
- main.tsx: Remove ALL providers, render <App /> directly with no wrappers

### Remove
- All auth/login flows
- All Stripe/payment flows  
- All backend API calls
- pdfjs-dist usage
- React Router (use simple state-based view switching)

## Implementation Plan
1. Rewrite main.tsx to render <App /> with zero providers
2. Rewrite App.tsx as self-contained single component managing:
   - `files`: array of {id, name, url} (blob URLs)
   - `activeFile`: currently selected file id
   - `activeTool`: currently active toolbar tool
3. Build AcrobatLayout inside App.tsx or as sibling component (no providers needed)
4. Use `<object data={url} type="application/pdf">` for PDF rendering
5. All feature tool buttons show a bottom panel or right panel when clicked
6. Delete unused files to keep codebase clean
