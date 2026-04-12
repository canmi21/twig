/* src/lib/geo-tile.ts */

// Static world-grid dimensions matching the footer map canvas.
const HEAT_COLS = 48
const HEAT_ROWS = 14

/** Map a geographic coordinate to a fixed world-grid tile index (0–671).
 *  The grid covers the full globe: 48 columns × 14 rows.
 *  Used by both the DO (server, to store per-tile counts) and the
 *  map component (client, to match rendered tiles to heat data). */
export function geoToTileIndex(lon: number, lat: number): number {
  const col =
    Math.floor((((((lon + 180) % 360) + 360) % 360) / 360) * HEAT_COLS) %
    HEAT_COLS
  const row = Math.min(
    HEAT_ROWS - 1,
    Math.max(0, Math.floor(((90 - lat) / 180) * HEAT_ROWS)),
  )
  return row * HEAT_COLS + col
}
