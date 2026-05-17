// Palette state moved to a context provider so the server-rendered
// `data-palette` (from the cookie) and the client agree — no flash, no
// hydration mismatch. This re-export keeps existing `@/hooks/usePalette`
// imports working.
export { usePalette } from "@/lib/palette";
