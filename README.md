# Anya OS

A web desktop environment portfolio — Windows 7 silhouette, kawaii Frutiger Aero
skin. React + TypeScript + Vite.

```bash
npm install
npm run dev      # http://127.0.0.1:5178
npm run build
```

`PRODUCT.md` holds product truth. `DESIGN.md` holds the visual system — read it
before adding a surface.

## Where the swappable content lives

| What | File |
|---|---|
| Featured projects + the rest of the repos | `src/content/projects.ts` |
| Backend setup: notes inbox + aquarium (Supabase SQL) | `README-NOTES.md` |
| Fish silhouettes and stock fish patterns | `src/aquarium/` |
| Desktop sticky-note fragments | `src/content/notes.ts` |
| App registry (titles, icons, default window sizes) | `src/os/registry.tsx` |
| Desktop icons and their order | `src/os/Desktop.tsx` |
| Palette, type, radii, shadows, easing | `src/styles/tokens.css` |
