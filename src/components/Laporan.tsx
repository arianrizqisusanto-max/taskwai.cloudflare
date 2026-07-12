import React, { useState } from "react";
import { DailyProfit, Restaurant } from "../types";
import { formatRupiah, formatIndoDate } from "../lib/utils";
import { FileText, Download, Calendar, Filter, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { useToast } from "./Toast";
import { motion } from "motion/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTranslation } from "../lib/LanguageContext";

interface LaporanProps {
  profits: DailyProfit[];
  restaurant: Restaurant | null;
}

type FilterType = "hari" | "minggu" | "bulan";

export default function Laporan({ profits, restaurant }: LaporanProps) {
  const { showToast } = useToast();
  const { lang, t } = useTranslation();
  const [filter, setFilter] = useState<FilterType>("bulan");
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  const todayStr = new Date().toISOString().split("T")[0];

  // Helper: check if date is within past N days
  const isWithinPastDays = (dateStr: string, days: number): boolean => {
    const entryDate = new Date(dateStr);
    const today = new Date();
    // Zero out hours
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - entryDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays < days;
  };

  // Filtered profits by Date and selected Branch
  const filteredProfits = profits.filter((p) => {
    let matchesDate = true;
    if (filter === "hari") {
      matchesDate = p.date === todayStr;
    } else if (filter === "minggu") {
      matchesDate = isWithinPastDays(p.date, 7);
    } else if (filter === "bulan") {
      const currentMonthPrefix = todayStr.substring(0, 7);
      matchesDate = p.date.startsWith(currentMonthPrefix);
    }

    let matchesBranch = true;
    if (selectedBranch) {
      matchesBranch = p.branchName === selectedBranch;
    }

    return matchesDate && matchesBranch;
  });

  // Calculate statistics
  const totalDays = filteredProfits.length;
  const totalProfit = filteredProfits.reduce((acc, curr) => acc + curr.profit, 0);
  const averageProfit = totalDays > 0 ? totalProfit / totalDays : 0;
  
  const maxProfitEntry = totalDays > 0 ? [...filteredProfits].sort((a, b) => b.profit - a.profit)[0] : null;
  const minProfitEntry = totalDays > 0 ? [...filteredProfits].sort((a, b) => a.profit - b.profit)[0] : null;

  const handleExportPDF = () => {
    if (filteredProfits.length === 0) {
      showToast(t("laporan.exportNoData", "Tidak ada data untuk diekspor"), "error");
      return;
    }

    showToast(t("laporan.exportPreparing", "Sedang menyiapkan dokumen {type}...").replace("{type}", "PDF"), "info");

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        // Set premium theme color: emerald (16, 185, 129)
        const primaryColor: [number, number, number] = [16, 185, 129];

        // ── Header Branding ──────────────────────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(16, 185, 129); // Emerald-500
        doc.text(t("laporan.pdfBranding", "Taskwai.com - Dashboard Usaha Anda"), 14, 12);

        // Thin top accent line
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(0.8);
        doc.line(14, 14, 196, 14);

        // ── Main Title ───────────────────────────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(t("laporan.pdfTitle", "LAPORAN KEUANGAN"), 14, 24);

        doc.setFontSize(10);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(`${t("laporan.businessName", "Nama Usaha")}: ${restaurant?.name || t("laporan.notSet", "Belum Diatur")}`, 14, 30);
        
        let filterLabel = filter === "hari" ? t("laporan.filterHari", "Harian") : filter === "minggu" ? t("laporan.filterMinggu", "Mingguan") : t("laporan.filterBulan", "Bulanan");
        doc.text(`${t("laporan.periodFilter", "Filter Periode")}: ${filterLabel}`, 14, 35);
        doc.text(`${t("laporan.printDate", "Tanggal Cetak")}: ${formatIndoDate(todayStr, lang)}`, 14, 40);

        // Divider Line
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setLineWidth(0.5);
        doc.line(14, 44, 196, 44);

        // ── Summary Section ──────────────────────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text(t("laporan.summaryTitle", "Ringkasan Statistik"), 14, 52);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85); // Slate-700

        const labelX = 14;
        const colonX = 48;
        const valueX = 51;

        doc.text(t("laporan.totalLogs", "Total Log Transaksi"), labelX, 59);
        doc.text(":", colonX, 59);
        doc.text(`${totalDays} ${t("laporan.daysUnit", "hari")}`, valueX, 59);

        doc.text(t("laporan.totalProfit", "Total Profit"), labelX, 65);
        doc.text(":", colonX, 65);
        doc.text(formatRupiah(totalProfit), valueX, 65);

        doc.text(t("laporan.averageProfit", "Rata-rata Profit"), labelX, 71);
        doc.text(":", colonX, 71);
        doc.text(formatRupiah(averageProfit), valueX, 71);

        doc.text(t("laporan.highestProfit", "Profit Tertinggi"), labelX, 77);
        doc.text(":", colonX, 77);
        doc.text(maxProfitEntry ? formatRupiah(maxProfitEntry.profit) : formatRupiah(0), valueX, 77);

        doc.text(t("laporan.lowestProfit", "Profit Terendah"), labelX, 83);
        doc.text(":", colonX, 83);
        doc.text(minProfitEntry ? formatRupiah(minProfitEntry.profit) : formatRupiah(0), valueX, 83);

        // ── Table ────────────────────────────────────────────
        const headers = [[
          t("laporan.tableNo", "No"), 
          t("laporan.tableDate", "Tanggal"), 
          t("laporan.tableDay", "Hari"), 
          t("laporan.tableGrossProfit", "Laba Kotor / Profit"), 
          "Cabang",
          "Penginput",
          t("laporan.tableNotes", "Catatan")
        ]];
        const tableData = filteredProfits.map((p, index) => {
          const dateObj = new Date(p.date);
          const weekday = dateObj.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { weekday: "long" });
          return [
            (index + 1).toString(),
            p.date,
            weekday,
            formatRupiah(p.profit),
            p.branchName || "-",
            p.inputterName || "-",
            p.notes || "-"
          ];
        });

        autoTable(doc, {
          startY: 90,
          head: headers,
          body: tableData,
          theme: "striped",
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: "bold"
          },
          styles: {
            fontSize: 9,
            font: "Helvetica",
            cellPadding: 3
          },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 24 },
            2: { cellWidth: 24 },
            3: { cellWidth: 35, halign: "right" },
            4: { cellWidth: 30 },
            5: { cellWidth: 25 },
            6: { cellWidth: "auto" }
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252] // Slate-50
          },

          didDrawPage: (data) => {
            // ── Page footer ──────────────────────────────────
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175); // Gray-400
            const pageH = doc.internal.pageSize.height;
            const pageW = doc.internal.pageSize.width;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(14, pageH - 12, pageW - 14, pageH - 12);
            doc.text(t("laporan.pdfBranding", "Taskwai.com - Dashboard Usaha Anda"), 14, pageH - 8);
            doc.text(t("laporan.pdfPage", "Halaman {num}").replace("{num}", String(data.pageNumber)), pageW - 25, pageH - 8);
          }
        });

        // Save File
        doc.save(`Laporan_Keuangan_${filter}_${todayStr}.pdf`);
        showToast(t("laporan.pdfExportSuccess", "Laporan PDF berhasil diunduh!"), "success");
      } catch (error) {
        console.error("Export Error:", error);
        showToast(t("laporan.exportError", "Terjadi kesalahan saat mengunduh dokumen."), "error");
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Upper bar: Filters and Exports */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        {/* Left: filter toggle & branch selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
            <div className="flex bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/80 p-1 rounded-xl">
              {(["hari", "minggu", "bulan"] as FilterType[]).map((type) => {
                let label = type === "hari" ? t("laporan.filterHari", "Harian") : type === "minggu" ? t("laporan.filterMinggu", "Mingguan") : t("laporan.filterBulan", "Bulanan");
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      filter === type
                        ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-sm"
                        : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Branch filter dropdown */}
          {restaurant && restaurant.branches && restaurant.branches.length > 0 && (
            <div className="flex items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/80 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <span className="mr-2 opacity-50 uppercase tracking-widest text-[9px] font-black">Cabang:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer pr-1 font-bold text-zinc-800 dark:text-zinc-200 focus:ring-0 focus:outline-none"
              >
                <option value="" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-250">Semua Cabang</option>
                {restaurant.branches.map((b) => (
                  <option key={b} value={b} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-250">{b}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t("laporan.exportPdf", "Ekspor PDF")}</span>
          </button>
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total profit */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("laporan.totalProfitFiltered", "Total Profit Terfilter")}</span>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight">
            {formatRupiah(totalProfit)}
          </span>
        </div>

        {/* Average */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("laporan.averageProfit", "Rata-rata Profit")}</span>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight">
            {formatRupiah(averageProfit)}
          </span>
        </div>

        {/* Highest profit */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("laporan.highestProfit", "Profit Tertinggi")}</span>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight flex items-center gap-1.5">
            {maxProfitEntry ? formatRupiah(maxProfitEntry.profit) : formatRupiah(0)}
            {maxProfitEntry && <ArrowUpRight className="w-5 h-5 text-emerald-600 shrink-0" />}
          </span>
        </div>

        {/* Lowest profit */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("laporan.lowestProfit", "Profit Terendah")}</span>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight flex items-center gap-1.5">
            {minProfitEntry ? formatRupiah(minProfitEntry.profit) : formatRupiah(0)}
            {minProfitEntry && <ArrowDownRight className="w-5 h-5 text-rose-600 shrink-0" />}
          </span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider mb-4">{t("laporan.detailedReportTitle", "Laporan Keuangan Rinci")}</h3>

        <div className="overflow-x-auto">
          {filteredProfits.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4">{t("laporan.tableDate", "Tanggal")}</th>
                  <th className="py-3 px-4">{t("laporan.tableDay", "Hari")}</th>
                  <th className="py-3 px-4">{t("laporan.tableGrossProfitShort", "Laba Kotor")}</th>
                  <th className="py-3 px-4">Cabang</th>
                  <th className="py-3 px-4">Penginput</th>
                  <th className="py-3 px-4">{t("laporan.tableNotes", "Catatan")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredProfits.map((p) => {
                  const dateObj = new Date(p.date);
                  const weekday = dateObj.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { weekday: "long" });
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 text-sm transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-500 dark:text-zinc-400 text-xs">{p.date}</td>
                      <td className="py-3.5 px-4 font-bold text-zinc-800 dark:text-zinc-200">{weekday}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-zinc-950 dark:text-zinc-50">{formatRupiah(p.profit)}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{p.branchName || "-"}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{p.inputterName || "-"}</td>
                      <td className="py-3.5 px-4 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs truncate italic font-medium">
                        {p.notes ? `"${p.notes}"` : "-"}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
              <Calendar className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-2" />
              {(() => {
                let filterLabel = filter === "hari" ? t("laporan.filterHari", "Harian") : filter === "minggu" ? t("laporan.filterMinggu", "Mingguan") : t("laporan.filterBulan", "Bulanan");
                return (
                  <>
                    <p className="text-xs font-bold text-zinc-500">
                      {t("laporan.noLogsForFilter", 'Tidak ditemukan log profit untuk filter "{filter}".').replace("{filter}", filterLabel)}
                    </p>
                    <p className="text-[10px] mt-1 font-medium text-zinc-400">
                      {t("laporan.noLogsForFilterDesc", "Silakan tambahkan data profit atau ubah rentang filter di atas.")}
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
