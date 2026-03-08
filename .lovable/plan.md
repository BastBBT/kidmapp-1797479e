

## Diagnostic

The Leaflet map internally uses `z-index` values in the hundreds (tiles at ~200, popups at ~700). The `ProposeLocationModal` uses `z-50` (Tailwind = `z-index: 50`), so the map renders on top of the modal overlay and content.

## Fix

In `src/components/ProposeLocationModal.tsx`, bump the z-index on both the backdrop overlay and the modal content panel from `z-50` to `z-[1000]` to guarantee they sit above all Leaflet layers.

- **Line 82**: Change `className="fixed inset-0 z-50"` to `className="fixed inset-0 z-[1000]"`
- **Line 91**: Change `className="fixed bottom-0 left-0 right-0 z-50 ..."` to `className="fixed bottom-0 left-0 right-0 z-[1000] ..."`

Two lines changed, no other files affected.

