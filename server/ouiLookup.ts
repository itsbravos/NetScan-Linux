// Imported (not read via fs) so esbuild inlines the table into the bundled
// server — this must keep working in the packaged Electron app, whose
// electron-builder `files` list only ships `dist/**/*`, not the `server/`
// source directory.
import ouiTable from "./ouiTable.json";

// Looks up the vendor name from the first 3 octets (OUI) of a MAC address.
// Curated table with common vendors; unknown prefixes fall back to "Desconhecido".
export function lookupVendor(mac: string): string {
  const prefix = mac.replace(/[:-]/g, "").toUpperCase().slice(0, 6);
  return (ouiTable as Record<string, string>)[prefix] || "Desconhecido";
}
