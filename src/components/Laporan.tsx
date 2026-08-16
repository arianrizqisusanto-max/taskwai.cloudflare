import React, { useState, useEffect } from "react";
import { DailyProfit, Restaurant } from "../types";
import { formatRupiah, formatIndoDate } from "../lib/utils";
import { FileText, Download, Calendar, ArrowUpRight, ArrowDownRight, Award, TrendingUp, DollarSign } from "lucide-react";
import { useToast } from "./Toast";
import { motion } from "motion/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTranslation } from "../lib/LanguageContext";
import { DataService } from "../lib/dataService";

import { calculateDailyProfitBreakdown, calculateTotalExpenses } from "../lib/financialMath";

interface LaporanProps {
  profits: DailyProfit[];
  restaurant: Restaurant | null;
  user: any | null;
}

export default function Laporan({ profits, restaurant, user }: LaporanProps) {
  const { showToast } = useToast();
  const { lang, t } = useTranslation();
  
  // Default to current month in Jakarta (WIB, UTC+7)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [monthlyExpenses, setMonthlyExpenses] = useState<any | null>(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setLoadingExpenses(true);
      const userId = user?.uid || "demo";
      DataService.getExpenses(userId, restaurant.id, selectedMonth)
        .then((data) => {
          setMonthlyExpenses(data);
        })
        .catch((err) => {
          console.error("Gagal mengambil biaya operasional:", err);
          setMonthlyExpenses(null);
        })
        .finally(() => {
          setLoadingExpenses(false);
        });
    } else {
      setMonthlyExpenses(null);
    }
  }, [selectedMonth, restaurant, user]);

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  const getMonthlyPerformanceRating = (netProfit: number, target: number) => {
    if (target <= 0) return { label: t("dashboard.statusActive", "Aktif"), color: "text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800/30", desc: t("dashboard.messageNoTarget", "Bisnis berjalan aktif tanpa target bulanan.") };
    
    const pct = (netProfit / target) * 100;
    if (pct >= 150) {
      return { 
        label: "Amazing! 🏆", 
        color: "text-amber-700 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/20 dark:border-amber-900/30", 
        desc: t("laporan.perfAmazing", "Laba melampaui target sangat jauh (>150%)!") 
      };
    }
    if (pct >= 120) {
      return { 
        label: "Excellent! ⭐", 
        color: "text-blue-700 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-950/20 border-blue-500/20 dark:border-blue-900/30", 
        desc: t("laporan.perfExcellent", "Laba melampaui target dengan sangat baik (>120%)!") 
      };
    }
    if (pct >= 100) {
      return { 
        label: t("laporan.statusBaik", "Baik (Aman) ✅"), 
        color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-900/30", 
        desc: t("laporan.perfBaik", "Laba berhasil mencapai atau melampaui target!") 
      };
    }
    if (pct >= 85) {
      return { 
        label: t("laporan.statusWaspada", "Waspada ⚠️"), 
        color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/20 dark:border-amber-900/30", 
        desc: t("laporan.perfWaspada", "Laba mendekati target tapi belum sepenuhnya tercapai (85%-99%).") 
      };
    }
    return { 
      label: t("laporan.statusBuruk", "Buruk (Bahaya) 🚨"), 
      color: "text-rose-700 dark:text-rose-455 bg-rose-500/10 dark:bg-rose-950/20 border-rose-500/20 dark:border-rose-900/30", 
      desc: t("laporan.perfBuruk", "Laba jauh di bawah target bulan ini (<85%).") 
    };
  };

  // Filtered profits strictly for the selected month
  const filteredProfits = profits.filter((p) => p.date && p.date.startsWith(selectedMonth));

  // Calculate statistics
  const totalDays = filteredProfits.length;
  const totalProfit = filteredProfits.reduce((acc, curr) => {
    const breakdown = calculateDailyProfitBreakdown(curr);
    return acc + breakdown.netProfit;
  }, 0);
  const averageProfit = totalDays > 0 ? Math.round(totalProfit / totalDays) : 0;
  
  const maxProfitEntry = totalDays > 0 ? [...filteredProfits].sort((a, b) => calculateDailyProfitBreakdown(b).netProfit - calculateDailyProfitBreakdown(a).netProfit)[0] : null;
  const minProfitEntry = totalDays > 0 ? [...filteredProfits].sort((a, b) => calculateDailyProfitBreakdown(a).netProfit - calculateDailyProfitBreakdown(b).netProfit)[0] : null;

  const totalBiayaVal = calculateTotalExpenses(monthlyExpenses);
  const netProfitMurni = Math.max(0, totalProfit - totalBiayaVal);
  const targetProfit = restaurant?.monthlyTargetProfit || 0;
  const achievementPct = targetProfit > 0 ? Math.round((netProfitMurni / targetProfit) * 100) : 0;
  const rating = getMonthlyPerformanceRating(netProfitMurni, targetProfit);

  // Month & Year display format
  const monthName = new Date(
    Number(selectedMonth.substring(0, 4)),
    Number(selectedMonth.substring(5, 7)) - 1,
    1
  ).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" });

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

        const primaryColor: [number, number, number] = [16, 185, 129];

        // ── Header Branding ──────────────────────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(16, 185, 129);
        doc.text(t("laporan.pdfBranding", "Taskwai.com - Dashboard Usaha Anda"), 14, 12);

        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(0.8);
        doc.line(14, 14, 196, 14);

        // ── Main Title ───────────────────────────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text(t("laporan.pdfTitle", "LAPORAN KEUANGAN BULANAN"), 14, 23);

        doc.setFontSize(9.5);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`${t("laporan.businessName", "Nama Usaha")}: ${restaurant?.name || t("laporan.notSet", "Belum Diatur")}`, 14, 29);
        doc.text(`Periode Bulan: ${monthName}`, 14, 34);
        doc.text(`${t("laporan.printDate", "Tanggal Cetak")}: ${formatIndoDate(todayStr, lang)}`, 14, 39);

        // Divider Line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 43, 196, 43);

        // ── Summary Section ──────────────────────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(t("laporan.summaryTitle", "Ringkasan Finansial Eksekutif"), 14, 50);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        const labelX = 14;
        const colonX = 52;
        const valueX = 55;

        doc.text("Laba Kotor (Omzet Bersih Harian)", labelX, 56);
        doc.text(":", colonX, 56);
        doc.text(formatRupiah(totalProfit), valueX, 56);

        doc.text("Total Biaya Operasional Tetap", labelX, 62);
        doc.text(":", colonX, 62);
        doc.text(`-${formatRupiah(totalBiayaVal)}`, valueX, 62);

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(16, 185, 129);
        doc.text("Laba Bersih Murni (Net Profit)", labelX, 68);
        doc.text(":", colonX, 68);
        doc.text(formatRupiah(netProfitMurni), valueX, 68);

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text("Target Laba Bulanan", labelX, 74);
        doc.text(":", colonX, 74);
        doc.text(targetProfit > 0 ? `${formatRupiah(targetProfit)} (${achievementPct}%)` : "Tidak Ditentukan", valueX, 74);

        doc.text("Rata-rata Profit Harian", labelX, 80);
        doc.text(":", colonX, 80);
        doc.text(`${formatRupiah(averageProfit)} (${totalDays} hari tercatat)`, valueX, 80);

        // ── Table ────────────────────────────────────────────
        const headers = [[
          t("laporan.tableNo", "No"), 
          t("laporan.tableDate", "Tanggal"), 
          t("laporan.tableDay", "Hari"), 
          t("laporan.tableGrossProfitShort", "Laba Kotor"), 
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
            p.inputterName || "Owner",
            p.notes || "-"
          ];
        });

        autoTable(doc, {
          startY: 86,
          head: headers,
          body: tableData,
          theme: "striped",
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: "bold"
          },
          styles: {
            fontSize: 8.5,
            font: "Helvetica",
            cellPadding: 3
          },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 26 },
            2: { cellWidth: 26 },
            3: { cellWidth: 38, halign: "right" },
            4: { cellWidth: 30 },
            5: { cellWidth: "auto" }
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          didDrawPage: (data) => {
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            const pageH = doc.internal.pageSize.height;
            const pageW = doc.internal.pageSize.width;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(14, pageH - 12, pageW - 14, pageH - 12);
            doc.text(t("laporan.pdfBranding", "Taskwai.com - Dashboard Usaha Anda"), 14, pageH - 8);
            doc.text(t("laporan.pdfPage", "Halaman {num}").replace("{num}", String(data.pageNumber)), pageW - 25, pageH - 8);
          }
        });

        const fileName = `taskwai.laporan.${selectedMonth}.pdf`;
        doc.save(fileName);
        showToast(t("laporan.pdfExportSuccess", "Laporan PDF berhasil diunduh!"), "success");
      } catch (error) {
        console.error("Export Error:", error);
        showToast(t("laporan.exportError", "Terjadi kesalahan saat mengunduh dokumen."), "error");
      }
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Upper bar: Month Selector & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        {/* Left: Month and Year Selector */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/10 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Periode Laporan Keuangan Bulanan
            </span>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedMonth.substring(5, 7)}
                onChange={(e) => {
                  const year = selectedMonth.substring(0, 4);
                  setSelectedMonth(`${year}-${e.target.value}`);
                }}
                className="pl-3 pr-8 py-1.5 text-xs font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
              >
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>

              <select
                value={selectedMonth.substring(0, 4)}
                onChange={(e) => {
                  const month = selectedMonth.substring(5, 7);
                  setSelectedMonth(`${e.target.value}-${month}`);
                }}
                className="pl-3 pr-8 py-1.5 text-xs font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Export PDF Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>{t("laporan.exportPdf", "Download Laporan PDF")}</span>
          </button>
        </div>
      </div>

      {/* Main Executive Financial Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Laba Bersih Murni (Hero Card) */}
        <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/40 dark:to-zinc-900 border border-emerald-500/20 dark:border-emerald-500/25 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
              Laba Bersih Murni
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
              Net Profit
            </span>
          </div>
          <span className="font-mono text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 block mt-2 tracking-tight">
            {formatRupiah(netProfitMurni)}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block font-medium">
            Omzet Bersih dikurangi Biaya Tetap
          </span>
        </div>

        {/* Total Laba Kotor */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
            Total Laba Kotor
          </span>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight">
            {formatRupiah(totalProfit)}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block font-medium">
            Akumulasi profit {totalDays} hari operasional
          </span>
        </div>

        {/* Total Biaya Operasional Tetap */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
            Biaya Operasional Tetap
          </span>
          <span className="font-mono text-2xl font-black text-rose-500 dark:text-rose-450 block mt-2 tracking-tight">
            -{formatRupiah(totalBiayaVal)}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block font-medium">
            Sewa, gaji, listrik & beban tetap
          </span>
        </div>

        {/* Target Laba Bulanan */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Target Laba Bulanan
            </span>
            {targetProfit > 0 && (
              <span className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400">
                {achievementPct}%
              </span>
            )}
          </div>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight">
            {targetProfit > 0 ? formatRupiah(targetProfit) : "Belum Diatur"}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block font-medium">
            {targetProfit > 0 ? `Tercapai ${achievementPct}% dari sasaran` : "Atur di menu Pengaturan"}
          </span>
        </div>
      </div>

      {/* Performance Rating & Cost Breakdown Dual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Column 1: Performance Rating & Financial Analysis (3 Cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider mb-1">
              {t("laporan.ratingTitle", "Analisis & Evaluasi Kinerja Bulanan")}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              Evaluasi performa usaha untuk periode {monthName}
            </p>
          </div>

          {/* Rating Badge Card */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${rating.color}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                Status Performa
              </span>
              <h4 className="text-lg font-black tracking-tight leading-tight">
                {rating.label}
              </h4>
              <p className="text-xs font-semibold opacity-90 leading-normal">
                {rating.desc}
              </p>
            </div>
            {targetProfit > 0 && (
              <div className="flex flex-col items-start sm:items-end bg-white/30 dark:bg-black/20 px-3.5 py-2 rounded-xl shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Pencapaian Target</span>
                <span className="text-lg font-black font-mono tracking-tight">{achievementPct}%</span>
              </div>
            )}
          </div>

          {/* Secondary Daily Stats (Average, High, Low) */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/50 rounded-xl">
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block tracking-wider">
                Rata-rata / Hari
              </span>
              <span className="font-mono text-sm font-bold text-zinc-850 dark:text-zinc-100 mt-1 block">
                {formatRupiah(averageProfit)}
              </span>
            </div>
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/50 rounded-xl">
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block tracking-wider">
                Laba Tertinggi
              </span>
              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-450 mt-1 block flex items-center gap-1">
                {maxProfitEntry ? formatRupiah(maxProfitEntry.profit) : formatRupiah(0)}
                {maxProfitEntry && <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />}
              </span>
            </div>
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/50 rounded-xl">
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block tracking-wider">
                Laba Terendah
              </span>
              <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-450 mt-1 block flex items-center gap-1">
                {minProfitEntry ? formatRupiah(minProfitEntry.profit) : formatRupiah(0)}
                {minProfitEntry && <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />}
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Itemized Fixed Operating Costs Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider mb-3">
              {t("laporan.copsTitle", "Rincian Biaya Operasional Tetap")}
            </h3>
            
            {monthlyExpenses && totalBiayaVal > 0 ? (
              <div className="space-y-2 text-xs font-semibold text-zinc-650 dark:text-zinc-450">
                {[
                  { label: t("biaya.sewa", "Sewa Tempat"), value: monthlyExpenses.sewaTempat },
                  { label: t("biaya.gaji", "Gaji Karyawan"), value: monthlyExpenses.gajiKaryawan },
                  { label: t("biaya.royalti", "Royalti Franchise"), value: monthlyExpenses.royaltiFranchise },
                  { label: t("biaya.listrik", "Listrik"), value: monthlyExpenses.listrik },
                  { label: t("biaya.air", "Air"), value: monthlyExpenses.air },
                  { label: t("biaya.internet", "Internet"), value: monthlyExpenses.internet },
                  { label: t("biaya.marketing", "Marketing"), value: monthlyExpenses.marketing },
                  { label: t("biaya.pajak", "Pajak"), value: monthlyExpenses.pajak },
                  { label: t("biaya.cicilanBank", "Cicilan Bank"), value: monthlyExpenses.cicilanBank },
                  { label: t("biaya.lain", "Biaya Lain-Lain"), value: monthlyExpenses.biayaLain },
                ].map((item, idx) => {
                  if (!item.value) return null;
                  return (
                    <div key={idx} className="flex justify-between border-b border-zinc-100/50 dark:border-zinc-800/30 pb-1.5 pt-0.5">
                      <span className="text-zinc-550 dark:text-zinc-500">{item.label}</span>
                      <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatRupiah(item.value)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500 italic">
                Tidak ada data biaya operasional untuk bulan ini.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/40 flex justify-between items-center text-xs font-black text-zinc-900 dark:text-zinc-100">
            <span>{t("biaya.total", "Total Biaya Operasional")}:</span>
            <span className="font-mono text-sm text-rose-500 dark:text-rose-400">{formatRupiah(totalBiayaVal)}</span>
          </div>
        </div>
      </div>

      {/* Monthly Daily Logs Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider">
            {t("laporan.detailedReportTitle", "Laporan Keuangan Rinci")} ({monthName})
          </h3>
          <span className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500">
            {totalDays} Hari Operasional
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredProfits.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4">{t("laporan.tableDate", "Tanggal")}</th>
                  <th className="py-3 px-4">{t("laporan.tableDay", "Hari")}</th>
                  <th className="py-3 px-4">{t("laporan.tableGrossProfitShort", "Laba Kotor")}</th>
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
                      <td className="py-3.5 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{p.inputterName || "Owner"}</td>
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
              <p className="text-xs font-bold text-zinc-500">
                Tidak ada log profit untuk periode {monthName}.
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Silakan pilih bulan lain pada pemilih periode di atas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
