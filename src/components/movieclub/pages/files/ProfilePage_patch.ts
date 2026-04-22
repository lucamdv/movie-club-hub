// @ts-nocheck
// ══════════════════════════════════════════════════════════════
//  PROFILEPAGE.TSX — PATCH FOR CSV EXPORT
//  Apply these 4 changes to src/components/movieclub/pages/ProfilePage.tsx
// ══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
//  CHANGE 1: Add Download to imports (top of file)
//  Find the existing lucide-react import block and add Download:
// ─────────────────────────────────────────────────────────

/*
  import {
    Film,
    ClipboardList,
    Star,
    Users,
    Pencil,
    Link2,
    X,
    UserRound,
    Bookmark,
    Upload,
    Download,       // ← ADD THIS
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronLeft,
    Settings,
    Grid3X3,
    List,
    UserPlus,
    UserCheck,
    LogOut,
  } from "lucide-react";
*/

// ─────────────────────────────────────────────────────────
//  CHANGE 2: Add exportRatingsCSV helper function
//  Add this function right before the ImportDataModal component 
//  (around line 60, before "function ImportDataModal"):
// ─────────────────────────────────────────────────────────

function exportRatingsCSV(ratings, displayName = "user") {
  if (!ratings || ratings.length === 0) {
    toast.info("Nenhuma avaliação para exportar ainda!");
    return;
  }
  const headers = ["Título", "Nota (1-5)", "Review", "Data"];
  const rows = ratings.map((r) => {
    const title = (r.title || "Desconhecido").replace(/"/g, '""');
    const rating = Number(r.rating).toFixed(1);
    const review = (r.review || "").replace(/"/g, '""');
    const date = r.updated_at
      ? new Date(r.updated_at).toLocaleDateString("pt-BR")
      : "";
    return `"${title}","${rating}","${review}","${date}"`;
  });
  const csvContent = [headers.join(","), ...rows].join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `movieclub-avaliacoes-${displayName.replace(/\s+/g, "-").toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`${ratings.length} avaliação${ratings.length !== 1 ? "ões" : ""} exportada${ratings.length !== 1 ? "s" : ""}!`);
}

// ─────────────────────────────────────────────────────────
//  CHANGE 3: MOBILE — Add export button to settings sheet
//  In ProfilePageMobile, find the settings actions array:
//    { icon: <Upload size={18} />, label: "Importar Dados (Letterboxd)", ... }
//  Add this item RIGHT AFTER it:
// ─────────────────────────────────────────────────────────

/*
  {
    icon: <Download size={18} />,
    label: "Exportar Avaliações (CSV)",
    action: () => {
      exportRatingsCSV(ratings, displayName);
      setShowSettings(false);
    },
  },
*/

// ─────────────────────────────────────────────────────────
//  CHANGE 4: DESKTOP — Add export button to action buttons
//  In ProfilePageDesktop, find this Btn:
//    <Btn variant="ghost" size="sm" onClick={() => setShowImportModal(true)}>
//      <Upload size={13} /> Importar Dados
//    </Btn>
//  Add this Btn RIGHT AFTER it:
// ─────────────────────────────────────────────────────────

/*
  <Btn
    variant="ghost"
    size="sm"
    onClick={() => exportRatingsCSV(ratings, displayName)}
  >
    <Download size={13} /> Exportar CSV
  </Btn>
*/

// ──────────────────────────────────────────────────────────
//  FULL CONTEXT for CHANGE 3 (mobile settings sheet):
//  The actions array in ProfilePageMobile looks like this:
//
//  const settingsActions = [
//    { icon: <Pencil size={18} />,  label: "Editar Perfil", action: ... },
//    { icon: <Upload size={18} />,  label: "Importar Dados (Letterboxd)", action: ... },
//    // ← INSERT HERE
//    { icon: <Link2 size={18} />,   label: "Compartilhar Perfil", action: ... },
//  ]
// ──────────────────────────────────────────────────────────
