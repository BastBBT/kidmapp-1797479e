

## Problem

The ContributionModal's submit button is hidden behind the bottom navigation bar. The modal uses `z-50` which may not be above the BottomNav, and the bottom safe area doesn't account for it.

## Fix

Two changes in `src/components/ContributionModal.tsx`:

1. **Bump z-index** on both the backdrop overlay (line 138) and modal panel (line 147) from `z-50` to `z-[1000]` — same fix as ProposeLocationModal — so the modal renders above the BottomNav and Leaflet map.

2. **Add bottom padding** to the submit button container (line 197): change `padding: '16px 20px 24px'` to `padding: '16px 20px env(safe-area-inset-bottom, 24px)'` or simply increase to `paddingBottom: '40px'` to ensure the button clears any bottom nav overlap.

No other files affected.

