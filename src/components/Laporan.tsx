import React, { useState, useEffect } from "react";
import { DailyProfit, Restaurant } from "../types";
import { formatRupiah, formatIndoDate } from "../lib/utils";
import { FileText, Download, Calendar, ArrowUpRight, ArrowDownRight, Award, TrendingUp, BarChart3, Sparkles } from "lucide-react";
import { useToast } from "./Toast";
import { motion } from "motion/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTranslation } from "../lib/LanguageContext";
import { DataService } from "../lib/dataService";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

  const totalOmzet = filteredProfits.reduce((acc, curr) => {
    const breakdown = calculateDailyProfitBreakdown(curr);
    return acc + (breakdown.hasBreakdown ? breakdown.omzet : breakdown.netProfit);
  }, 0);

  const totalHpp = filteredProfits.reduce((acc, curr) => {
    const breakdown = calculateDailyProfitBreakdown(curr);
    return acc + breakdown.hppVal;
  }, 0);

  const totalBiayaHarian = filteredProfits.reduce((acc, curr) => {
    const breakdown = calculateDailyProfitBreakdown(curr);
    return acc + breakdown.otherExpenses;
  }, 0);

  const averageProfit = totalDays > 0 ? Math.round(totalProfit / totalDays) : 0;
  
  const maxProfitEntry = totalDays > 0 ? [...filteredProfits].sort((a, b) => calculateDailyProfitBreakdown(b).netProfit - calculateDailyProfitBreakdown(a).netProfit)[0] : null;
  const minProfitEntry = totalDays > 0 ? [...filteredProfits].sort((a, b) => calculateDailyProfitBreakdown(a).netProfit - calculateDailyProfitBreakdown(b).netProfit)[0] : null;

  const totalBiayaVal = calculateTotalExpenses(monthlyExpenses);
  const netProfitMurni = Math.max(0, totalProfit - totalBiayaVal);
  const targetProfit = restaurant?.monthlyTargetProfit || 0;
  const achievementPct = targetProfit > 0 ? Math.round((netProfitMurni / targetProfit) * 100) : 0;
  const rating = getMonthlyPerformanceRating(netProfitMurni, targetProfit);

  // State for Report Type: "bulanan" or "tahunan"
  const [reportType, setReportType] = useState<"bulanan" | "tahunan">("bulanan");

  // Selected Year extracted from selectedMonth
  const selectedYear = selectedMonth.substring(0, 4);

  // Month names for annual calculation
  const monthNamesIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const monthNamesShort = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

  // Annual calculation: 12 months (Jan - Dec)
  const annualMonthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthNumStr = String(i + 1).padStart(2, "0");
    const monthPrefix = `${selectedYear}-${monthNumStr}`;
    const mProfits = profits.filter((p) => p.date && p.date.startsWith(monthPrefix));

    const daysCount = mProfits.length;
    const omzet = mProfits.reduce((acc, curr) => {
      const b = calculateDailyProfitBreakdown(curr);
      return acc + (b.hasBreakdown ? b.omzet : b.netProfit);
    }, 0);
    const hpp = mProfits.reduce((acc, curr) => {
      const b = calculateDailyProfitBreakdown(curr);
      return acc + b.hppVal;
    }, 0);
    const biayaHarian = mProfits.reduce((acc, curr) => {
      const b = calculateDailyProfitBreakdown(curr);
      return acc + b.otherExpenses;
    }, 0);
    const labaKotor = mProfits.reduce((acc, curr) => {
      const b = calculateDailyProfitBreakdown(curr);
      return acc + b.netProfit;
    }, 0);

    const biayaTetap = daysCount > 0 ? totalBiayaVal : 0;
    const labaBersih = Math.max(0, labaKotor - biayaTetap);

    return {
      monthIndex: i + 1,
      monthPrefix,
      monthName: monthNamesIndo[i],
      monthShort: monthNamesShort[i],
      daysCount,
      omzet,
      hpp,
      biayaHarian,
      labaKotor,
      biayaTetap,
      labaBersih,
      hasData: daysCount > 0,
    };
  });

  const annualTotalDays = annualMonthlyData.reduce((acc, curr) => acc + curr.daysCount, 0);
  const annualTotalOmzet = annualMonthlyData.reduce((acc, curr) => acc + curr.omzet, 0);
  const annualTotalHpp = annualMonthlyData.reduce((acc, curr) => acc + curr.hpp, 0);
  const annualTotalBiayaHarian = annualMonthlyData.reduce((acc, curr) => acc + curr.biayaHarian, 0);
  const annualTotalLabaKotor = annualMonthlyData.reduce((acc, curr) => acc + curr.labaKotor, 0);
  const annualTotalBiayaTetap = annualMonthlyData.reduce((acc, curr) => acc + curr.biayaTetap, 0);
  const annualTotalLabaBersih = Math.max(0, annualTotalLabaKotor - annualTotalBiayaTetap);

  const activeMonths = annualMonthlyData.filter((m) => m.hasData);
  const activeMonthsCount = activeMonths.length;
  const avgMonthlyOmzet = activeMonthsCount > 0 ? Math.round(annualTotalOmzet / activeMonthsCount) : 0;
  const avgMonthlyProfit = activeMonthsCount > 0 ? Math.round(annualTotalLabaBersih / activeMonthsCount) : 0;

  const bestMonth = activeMonths.length > 0 
    ? [...activeMonths].sort((a, b) => b.labaKotor - a.labaKotor)[0] 
    : null;

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

        // ── 1. Top Decorative Ribbon & Header Branding ────────
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, 210, 3.5, "F");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(16, 185, 129);
        doc.text("TASKWAI", 14, 11);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("•  SISTEM PENCATATAN & LAPORAN KEUANGAN USAHA", 35, 11);

        // ── 2. Main Title ─────────────────────────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(15, 23, 42);
        doc.text(t("laporan.pdfTitle", "LAPORAN KEUANGAN BULANAN"), 14, 19);

        // ── 3. Business Metadata Box ──────────────────────────
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.roundedRect(14, 23, 182, 16, 2, 2, "FD");

        // Left Metadata
        doc.setFontSize(8);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text(t("laporan.businessName", "Nama Usaha"), 18, 29);
        doc.text("Periode Laporan", 18, 35);

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(`:  ${restaurant?.name || t("laporan.notSet", "Belum Diatur")}`, 42, 29);
        doc.text(`:  ${monthName}`, 42, 35);

        // Right Metadata
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text(t("laporan.printDate", "Tanggal Cetak"), 110, 29);
        doc.text("Status Kinerja", 110, 35);

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(`:  ${formatIndoDate(todayStr, lang)}`, 134, 29);

        doc.setFont("Helvetica", "bold");
        if (rating.label.includes("Baik") || rating.label.includes("Amazing") || rating.label.includes("Excellent")) {
          doc.setTextColor(5, 150, 105);
        } else if (rating.label.includes("Waspada")) {
          doc.setTextColor(217, 119, 6);
        } else {
          doc.setTextColor(225, 29, 72);
        }
        doc.text(`:  ${rating.label}`, 134, 35);

        // ── 4. Executive Metric Cards (4 Cards Grid) ──────────
        // w = 42.5mm each, gap = 4mm -> total = 42.5*4 + 12 = 182mm (x = 14 to 196)
        const cardY = 42;
        const cardH = 18.5;

        // Card 1: Total Omzet
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, cardY, 42.5, cardH, 2, 2, "FD");
        doc.setFontSize(6.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL OMZET (KOTOR)", 17, cardY + 5);
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(formatRupiah(totalOmzet), 17, cardY + 11);
        doc.setFontSize(5.8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Penjualan kotor bulan ini", 17, cardY + 15.5);

        // Card 2: HPP & Biaya Harian
        doc.setFillColor(255, 241, 242);
        doc.setDrawColor(254, 205, 211);
        doc.roundedRect(60.5, cardY, 42.5, cardH, 2, 2, "FD");
        doc.setFontSize(6.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text("MODAL / BIAYA HARIAN", 63.5, cardY + 5);
        doc.setFontSize(9);
        doc.setTextColor(225, 29, 72);
        doc.text(`-${formatRupiah(totalHpp + totalBiayaHarian)}`, 63.5, cardY + 11);
        doc.setFontSize(5.8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Bahan baku & belanja harian", 63.5, cardY + 15.5);

        // Card 3: Total Laba Kotor
        doc.setFillColor(240, 253, 250);
        doc.setDrawColor(204, 251, 241);
        doc.roundedRect(107, cardY, 42.5, cardH, 2, 2, "FD");
        doc.setFontSize(6.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(13, 148, 136);
        doc.text("TOTAL LABA KOTOR", 110, cardY + 5);
        doc.setFontSize(9);
        doc.setTextColor(13, 148, 136);
        doc.text(formatRupiah(totalProfit), 110, cardY + 11);
        doc.setFontSize(5.8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Omzet - modal bahan", 110, cardY + 15.5);

        // Card 4: Laba Bersih Murni
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
        doc.roundedRect(153.5, cardY, 42.5, cardH, 2, 2, "FD");
        doc.setFontSize(6.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(5, 150, 105);
        doc.text("LABA BERSIH MURNI", 156.5, cardY + 5);
        doc.setFontSize(9.5);
        doc.setTextColor(5, 150, 105);
        doc.text(formatRupiah(netProfitMurni), 156.5, cardY + 11);
        doc.setFontSize(5.8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Setelah potong biaya tetap", 156.5, cardY + 15.5);

        // ── 5. Detailed Financial Summary Panel (Dual Box) ────
        // Left Box: Operasional Harian (x = 14 to 103, w = 89mm)
        // Right Box: Beban Tetap & Target (x = 107 to 196, w = 89mm)
        const panelY = 63.5;
        const panelH = 26;

        // Left Panel Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, panelY, 89, panelH, 2, 2, "FD");

        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Rincian Laba Operasional Harian", 18, panelY + 5);

        // Left Panel Rows (Right-aligned values to prevent ANY overlap)
        doc.setFontSize(7);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Total Omzet Penjualan", 18, panelY + 10);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(formatRupiah(totalOmzet), 99, panelY + 10, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Potongan HPP / Belanja Bahan", 18, panelY + 14.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text(`-${formatRupiah(totalHpp)}`, 99, panelY + 14.5, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Pengeluaran Lain-lain Harian", 18, panelY + 19);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(217, 119, 6);
        doc.text(`-${formatRupiah(totalBiayaHarian)}`, 99, panelY + 19, { align: "right" });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(18, panelY + 21, 99, panelY + 21);

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(5, 150, 105);
        doc.text("Total Laba Kotor Operasional", 18, panelY + 24.5);
        doc.text(formatRupiah(totalProfit), 99, panelY + 24.5, { align: "right" });

        // Right Panel Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(107, panelY, 89, panelH, 2, 2, "FD");

        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Beban Tetap Bulanan & Sasaran", 111, panelY + 5);

        // Right Panel Rows (Right-aligned values to prevent ANY overlap)
        doc.setFontSize(7);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Biaya Operasional Tetap Bulanan", 111, panelY + 10);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text(`-${formatRupiah(totalBiayaVal)}`, 192, panelY + 10, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Target Laba Bulanan", 111, panelY + 14.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(targetProfit > 0 ? `${formatRupiah(targetProfit)} (${achievementPct}%)` : "Belum Diatur", 192, panelY + 14.5, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Rata-rata Laba Kotor / Hari", 111, panelY + 19);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`${formatRupiah(averageProfit)} (${totalDays} hari)`, 192, panelY + 19, { align: "right" });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(111, panelY + 21, 192, panelY + 21);

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(13, 148, 136);
        doc.text("Estimasi Laba Bersih Murni", 111, panelY + 24.5);
        doc.text(formatRupiah(netProfitMurni), 192, panelY + 24.5, { align: "right" });

        // ── 6. Daily Transactions Table (autoTable) ───────────
        const headers = [[
          t("laporan.tableNo", "No"), 
          t("laporan.tableDate", "Tanggal"), 
          t("laporan.tableDay", "Hari"), 
          "Omzet",
          "HPP / Modal",
          "Biaya Harian",
          t("laporan.tableGrossProfitShort", "Laba Kotor"), 
          "Penginput",
          t("laporan.tableNotes", "Catatan")
        ]];

        const tableData = filteredProfits.map((p, index) => {
          const dateObj = new Date(p.date);
          const weekday = dateObj.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { weekday: "long" });
          const b = calculateDailyProfitBreakdown(p);
          return [
            (index + 1).toString(),
            p.date,
            weekday,
            b.hasBreakdown ? formatRupiah(b.omzet) : "-",
            b.hasBreakdown ? (b.hppVal > 0 ? `-${formatRupiah(b.hppVal)}` : "Rp 0") : "-",
            b.hasBreakdown ? (b.otherExpenses > 0 ? `-${formatRupiah(b.otherExpenses)}` : "Rp 0") : "-",
            formatRupiah(b.netProfit),
            p.inputterName || "Owner",
            p.notes || "-"
          ];
        });

        autoTable(doc, {
          startY: 93,
          margin: { left: 14, right: 14 },
          tableWidth: 182,
          head: headers,
          body: tableData,
          foot: [[
            "",
            "TOTAL",
            `${totalDays} Hari`,
            formatRupiah(totalOmzet),
            `-${formatRupiah(totalHpp)}`,
            `-${formatRupiah(totalBiayaHarian)}`,
            formatRupiah(totalProfit),
            "",
            ""
          ]],
          showFoot: "lastPage",
          theme: "striped",
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7.5,
            cellPadding: 2.2,
            halign: "center"
          },
          bodyStyles: {
            fontSize: 7.5,
            font: "Helvetica",
            cellPadding: 2,
            textColor: [51, 65, 85]
          },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: "bold",
            fontSize: 7.5,
            cellPadding: 2.2
          },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 20, halign: "center" },
            2: { cellWidth: 16, halign: "left" },
            3: { cellWidth: 25, halign: "right" },
            4: { cellWidth: 22, halign: "right" },
            5: { cellWidth: 22, halign: "right" },
            6: { cellWidth: 26, halign: "right", fontStyle: "bold", textColor: [5, 150, 105] },
            7: { cellWidth: 18, halign: "left" },
            8: { cellWidth: 25, halign: "left" }
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          didDrawPage: (data) => {
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            const pageH = doc.internal.pageSize.height;
            const pageW = doc.internal.pageSize.width;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(14, pageH - 10, pageW - 14, pageH - 10);
            doc.text("Taskwai.com • Sistem Pembukuan & Laporan Keuangan Usaha", 14, pageH - 6);
            doc.text(t("laporan.pdfPage", "Halaman {num}").replace("{num}", String(data.pageNumber)), pageW - 14, pageH - 6, { align: "right" });
          }
        });

        const fileName = `taskwai.laporan.${selectedMonth}.pdf`;
        doc.save(fileName);
        showToast(t("laporan.pdfExportSuccess", "Laporan PDF berhasil diunduh!"), "success");
      } catch (error) {
        console.error("Export Error:", error);
        showToast(t("laporan.exportError", "Terjadi kesalahan saat mengunduh dokumen."), "error");
      }
    }, 1000);
  };

  const handleExportAnnualPDF = () => {
    if (annualTotalDays === 0) {
      showToast(t("laporan.exportNoDataYear", "Tidak ada data transaksi untuk tahun {year}").replace("{year}", selectedYear), "error");
      return;
    }

    showToast(t("laporan.exportPreparing", "Sedang menyiapkan dokumen {type}...").replace("{type}", "PDF Tahunan"), "info");

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const primaryColor: [number, number, number] = [16, 185, 129];

        // ── 1. Top Decorative Ribbon & Header Branding ────────
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, 210, 3.5, "F");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(16, 185, 129);
        doc.text("TASKWAI", 14, 11);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("•  SISTEM PENCATATAN & LAPORAN KEUANGAN USAHA", 35, 11);

        // ── 2. Main Title ─────────────────────────────────────
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(15, 23, 42);
        doc.text(`LAPORAN KEUANGAN TAHUNAN - ${selectedYear}`, 14, 19);

        // ── 3. Business Metadata Box ──────────────────────────
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.roundedRect(14, 23, 182, 16, 2, 2, "FD");

        // Left Metadata
        doc.setFontSize(8);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text(t("laporan.businessName", "Nama Usaha"), 18, 29);
        doc.text("Periode Laporan", 18, 35);

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(`:  ${restaurant?.name || t("laporan.notSet", "Belum Diatur")}`, 44, 29);
        doc.text(`:  Tahun Kalender ${selectedYear}`, 44, 35);

        // Right Metadata
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text(t("laporan.printDate", "Tanggal Cetak"), 110, 29);
        doc.text("Bulan Terbaik", 110, 35);

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(`:  ${formatIndoDate(todayStr, lang)}`, 134, 29);

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(5, 150, 105);
        doc.text(`:  ${bestMonth ? `${bestMonth.monthName} (${formatRupiah(bestMonth.labaKotor)})` : "-"}`, 134, 35);

        // ── 4. Executive Metric Cards (4 Cards Grid) ──────────
        const cardY = 42;
        const cardH = 18.5;

        // Card 1: Total Omzet
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, cardY, 42.5, cardH, 2, 2, "FD");
        doc.setFontSize(6.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL OMZET TAHUNAN", 17, cardY + 5);
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(formatRupiah(annualTotalOmzet), 17, cardY + 11);
        doc.setFontSize(5.8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text(`Penjualan setahun ${selectedYear}`, 17, cardY + 15.5);

        // Card 2: Modal & Biaya Harian
        doc.setFillColor(255, 241, 242);
        doc.setDrawColor(254, 205, 211);
        doc.roundedRect(60.5, cardY, 42.5, cardH, 2, 2, "FD");
        doc.setFontSize(6.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text("MODAL / BIAYA HARIAN", 63.5, cardY + 5);
        doc.setFontSize(8.5);
        doc.setTextColor(225, 29, 72);
        doc.text(`-${formatRupiah(annualTotalHpp + annualTotalBiayaHarian)}`, 63.5, cardY + 11);
        doc.setFontSize(5.8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Bahan baku & operasional", 63.5, cardY + 15.5);

        // Card 3: Total Laba Kotor
        doc.setFillColor(240, 253, 250);
        doc.setDrawColor(204, 251, 241);
        doc.roundedRect(107, cardY, 42.5, cardH, 2, 2, "FD");
        doc.setFontSize(6.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(13, 148, 136);
        doc.text("TOTAL LABA KOTOR", 110, cardY + 5);
        doc.setFontSize(8.5);
        doc.setTextColor(13, 148, 136);
        doc.text(formatRupiah(annualTotalLabaKotor), 110, cardY + 11);
        doc.setFontSize(5.8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Omzet - modal bahan", 110, cardY + 15.5);

        // Card 4: Laba Bersih Murni Tahunan
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
        doc.roundedRect(153.5, cardY, 42.5, cardH, 2, 2, "FD");
        doc.setFontSize(6.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(5, 150, 105);
        doc.text("LABA BERSIH MURNI", 156.5, cardY + 5);
        doc.setFontSize(8.5);
        doc.setTextColor(5, 150, 105);
        doc.text(formatRupiah(annualTotalLabaBersih), 156.5, cardY + 11);
        doc.setFontSize(5.8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Setelah potong beban tetap", 156.5, cardY + 15.5);

        // ── 5. Detailed Financial Summary Panel (Dual Box) ────
        const panelY = 63.5;
        const panelH = 26;

        // Left Panel Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, panelY, 89, panelH, 2, 2, "FD");

        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Analisis & Evaluasi Kinerja Tahunan", 18, panelY + 5);

        doc.setFontSize(7);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Bulan Performa Tertinggi (Emas)", 18, panelY + 10);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(217, 119, 6);
        doc.text(bestMonth ? `${bestMonth.monthName} (${formatRupiah(bestMonth.labaKotor)})` : "-", 99, panelY + 10, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Rata-rata Laba Bersih / Bulan", 18, panelY + 14.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(5, 150, 105);
        doc.text(formatRupiah(avgMonthlyProfit), 99, panelY + 14.5, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Rata-rata Omzet / Bulan", 18, panelY + 19);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(formatRupiah(avgMonthlyOmzet), 99, panelY + 19, { align: "right" });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(18, panelY + 21, 99, panelY + 21);

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Total Hari Buka Usaha Setahun", 18, panelY + 24.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${annualTotalDays} Hari (${activeMonthsCount} Bulan Aktif)`, 99, panelY + 24.5, { align: "right" });

        // Right Panel Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(107, panelY, 89, panelH, 2, 2, "FD");

        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`Rekapitulasi Keuangan Tahun ${selectedYear}`, 111, panelY + 5);

        doc.setFontSize(7);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Total Penjualan Kotor (Omzet)", 111, panelY + 10);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(formatRupiah(annualTotalOmzet), 192, panelY + 10, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Potongan HPP & Biaya Harian", 111, panelY + 14.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text(`-${formatRupiah(annualTotalHpp + annualTotalBiayaHarian)}`, 192, panelY + 14.5, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Biaya Operasional Tetap Setahun", 111, panelY + 19);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text(`-${formatRupiah(annualTotalBiayaTetap)}`, 192, panelY + 19, { align: "right" });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(111, panelY + 21, 192, panelY + 21);

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(5, 150, 105);
        doc.text("Laba Bersih Murni Tahunan", 111, panelY + 24.5);
        doc.text(formatRupiah(annualTotalLabaBersih), 192, panelY + 24.5, { align: "right" });

        // ── 6. Annual 12-Month Table (autoTable) ──────────────
        const annualHeaders = [[
          "No", 
          "Bulan", 
          "Hari", 
          "Total Omzet", 
          "Modal / HPP", 
          "Biaya Harian", 
          "Laba Kotor", 
          "Biaya Tetap", 
          "Laba Bersih"
        ]];

        const annualTableData = annualMonthlyData.map((m) => {
          return [
            m.monthIndex.toString(),
            m.monthName,
            m.hasData ? `${m.daysCount} hari` : "-",
            m.hasData ? formatRupiah(m.omzet) : "-",
            m.hasData ? (m.hpp > 0 ? `-${formatRupiah(m.hpp)}` : "Rp 0") : "-",
            m.hasData ? (m.biayaHarian > 0 ? `-${formatRupiah(m.biayaHarian)}` : "Rp 0") : "-",
            m.hasData ? formatRupiah(m.labaKotor) : "-",
            m.hasData ? (m.biayaTetap > 0 ? `-${formatRupiah(m.biayaTetap)}` : "Rp 0") : "-",
            m.hasData ? formatRupiah(m.labaBersih) : "-"
          ];
        });

        autoTable(doc, {
          startY: 93,
          margin: { left: 14, right: 14 },
          tableWidth: 182,
          head: annualHeaders,
          body: annualTableData,
          foot: [[
            "",
            `TOTAL ${selectedYear}`,
            `${annualTotalDays} Hari`,
            formatRupiah(annualTotalOmzet),
            `-${formatRupiah(annualTotalHpp)}`,
            `-${formatRupiah(annualTotalBiayaHarian)}`,
            formatRupiah(annualTotalLabaKotor),
            `-${formatRupiah(annualTotalBiayaTetap)}`,
            formatRupiah(annualTotalLabaBersih)
          ]],
          showFoot: "lastPage",
          theme: "striped",
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7.2,
            cellPadding: 2.2,
            halign: "center"
          },
          bodyStyles: {
            fontSize: 7.2,
            font: "Helvetica",
            cellPadding: 2,
            textColor: [51, 65, 85]
          },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: "bold",
            fontSize: 7.2,
            cellPadding: 2.2
          },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 22, halign: "left" },
            2: { cellWidth: 16, halign: "center" },
            3: { cellWidth: 25, halign: "right" },
            4: { cellWidth: 22, halign: "right" },
            5: { cellWidth: 20, halign: "right" },
            6: { cellWidth: 25, halign: "right", fontStyle: "bold", textColor: [13, 148, 136] },
            7: { cellWidth: 20, halign: "right" },
            8: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: [5, 150, 105] }
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          didDrawPage: (data) => {
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            const pageH = doc.internal.pageSize.height;
            const pageW = doc.internal.pageSize.width;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(14, pageH - 10, pageW - 14, pageH - 10);
            doc.text(`Taskwai.com • Laporan Keuangan Tahunan ${selectedYear}`, 14, pageH - 6);
            doc.text(t("laporan.pdfPage", "Halaman {num}").replace("{num}", String(data.pageNumber)), pageW - 14, pageH - 6, { align: "right" });
          }
        });

        const fileName = `taskwai.laporan.tahunan.${selectedYear}.pdf`;
        doc.save(fileName);
        showToast("Laporan PDF Tahunan berhasil diunduh!", "success");
      } catch (error) {
        console.error("Export Error:", error);
        showToast("Terjadi kesalahan saat mengunduh dokumen tahunan.", "error");
      }
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Upper bar: Mode Switcher, Period Selector & Export Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        {/* Left: Mode Switcher (Bulanan vs Tahunan) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
            <button
              onClick={() => setReportType("bulanan")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === "bulanan"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Laporan Bulanan
            </button>
            <button
              onClick={() => setReportType("tahunan")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === "tahunan"
                  ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Laporan Tahunan 🏆
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/10 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>

            {reportType === "bulanan" ? (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedMonth.substring(5, 7)}
                  onChange={(e) => {
                    const year = selectedMonth.substring(0, 4);
                    setSelectedMonth(`${year}-${e.target.value}`);
                  }}
                  className="pl-3 pr-7 py-1.5 text-xs font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
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
                  value={selectedYear}
                  onChange={(e) => {
                    const month = selectedMonth.substring(5, 7);
                    setSelectedMonth(`${e.target.value}-${month}`);
                  }}
                  className="pl-3 pr-7 py-1.5 text-xs font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Pilih Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const month = selectedMonth.substring(5, 7);
                    setSelectedMonth(`${e.target.value}-${month}`);
                  }}
                  className="pl-3 pr-8 py-1.5 text-xs font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
                >
                  <option value="2024">Tahun 2024</option>
                  <option value="2025">Tahun 2025</option>
                  <option value="2026">Tahun 2026</option>
                  <option value="2027">Tahun 2027</option>
                  <option value="2028">Tahun 2028</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right: Export PDF Button */}
        <div className="flex items-center gap-2">
          {reportType === "bulanan" ? (
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>{t("laporan.exportPdf", "Download Laporan PDF")}</span>
            </button>
          ) : (
            <button
              onClick={handleExportAnnualPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Tahunan ({selectedYear})</span>
            </button>
          )}
        </div>
      </div>

      {reportType === "bulanan" ? (
        <>
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
                      <th className="py-3 px-3.5">{t("laporan.tableDate", "Tanggal")}</th>
                      <th className="py-3 px-3.5">{t("laporan.tableDay", "Hari")}</th>
                      <th className="py-3 px-3.5 text-right">Omzet</th>
                      <th className="py-3 px-3.5 text-right">HPP / Modal</th>
                      <th className="py-3 px-3.5 text-right">Biaya Harian</th>
                      <th className="py-3 px-3.5 text-right">{t("laporan.tableGrossProfitShort", "Laba Kotor")}</th>
                      <th className="py-3 px-3.5">Penginput</th>
                      <th className="py-3 px-3.5">{t("laporan.tableNotes", "Catatan")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {filteredProfits.map((p) => {
                      const dateObj = new Date(p.date);
                      const weekday = dateObj.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { weekday: "long" });
                      const b = calculateDailyProfitBreakdown(p);
                      return (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 text-xs sm:text-sm transition-colors"
                        >
                          <td className="py-3 px-3.5 font-mono font-bold text-zinc-500 dark:text-zinc-400 text-xs">{p.date}</td>
                          <td className="py-3 px-3.5 font-bold text-zinc-800 dark:text-zinc-200 text-xs">{weekday}</td>
                          <td className="py-3 px-3.5 font-mono font-bold text-zinc-900 dark:text-zinc-100 text-right text-xs">
                            {b.hasBreakdown ? formatRupiah(b.omzet) : "-"}
                          </td>
                          <td className="py-3 px-3.5 font-mono font-bold text-rose-600 dark:text-rose-450 text-right text-xs">
                            {b.hasBreakdown ? (b.hppVal > 0 ? `-${formatRupiah(b.hppVal)}` : "Rp 0") : "-"}
                          </td>
                          <td className="py-3 px-3.5 font-mono font-bold text-amber-600 dark:text-amber-450 text-right text-xs">
                            {b.hasBreakdown ? (b.otherExpenses > 0 ? `-${formatRupiah(b.otherExpenses)}` : "Rp 0") : "-"}
                          </td>
                          <td className="py-3 px-3.5 font-mono font-black text-emerald-600 dark:text-emerald-450 text-right text-xs sm:text-sm">
                            {formatRupiah(b.netProfit)}
                          </td>
                          <td className="py-3 px-3.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            {p.inputterName || "Owner"}
                          </td>
                          <td className="py-3 px-3.5 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs truncate italic font-medium">
                            {p.notes ? `"${p.notes}"` : "-"}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-xs font-bold font-mono">
                    <tr>
                      <td colSpan={2} className="py-3 px-3.5 text-zinc-700 dark:text-zinc-300">
                        TOTAL ({totalDays} HARI)
                      </td>
                      <td className="py-3 px-3.5 text-right text-zinc-900 dark:text-zinc-100">
                        {formatRupiah(totalOmzet)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-rose-600 dark:text-rose-450">
                        -{formatRupiah(totalHpp)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-amber-600 dark:text-amber-450">
                        -{formatRupiah(totalBiayaHarian)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-emerald-600 dark:text-emerald-450 text-xs sm:text-sm">
                        {formatRupiah(totalProfit)}
                      </td>
                      <td colSpan={2} className="py-3 px-3.5"></td>
                    </tr>
                  </tfoot>
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
        </>
      ) : (
        /* Annual Report View (Laporan Tahunan) */
        <>
          {/* Main Annual KPI Cards (4 Cards Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Laba Bersih Murni Tahunan (Hero Card) */}
            <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/40 dark:to-zinc-900 border border-emerald-500/20 dark:border-emerald-500/25 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                  Laba Bersih Murni Tahunan
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                  Net Profit {selectedYear}
                </span>
              </div>
              <span className="font-mono text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 block mt-2 tracking-tight">
                {formatRupiah(annualTotalLabaBersih)}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block font-medium">
                Akumulasi laba bersih setelah beban operasional
              </span>
            </div>

            {/* Total Omzet Tahunan */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Total Omzet Tahunan
              </span>
              <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight">
                {formatRupiah(annualTotalOmzet)}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block font-medium">
                Total penjualan kotor selama {selectedYear}
              </span>
            </div>

            {/* Total Modal & Biaya Harian */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Modal / Belanja Harian Setahun
              </span>
              <span className="font-mono text-2xl font-black text-rose-500 dark:text-rose-450 block mt-2 tracking-tight">
                -{formatRupiah(annualTotalHpp + annualTotalBiayaHarian)}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block font-medium">
                Bahan baku {formatRupiah(annualTotalHpp)} + harian {formatRupiah(annualTotalBiayaHarian)}
              </span>
            </div>

            {/* Total Laba Kotor Tahunan */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Total Laba Kotor Setahun
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {annualTotalDays} Hari Buka
                </span>
              </div>
              <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight">
                {formatRupiah(annualTotalLabaKotor)}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block font-medium">
                Omzet dikurangi modal bahan baku
              </span>
            </div>
          </div>

          {/* Performance Evaluation & 12-Month Chart Dual Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Column 1: Performance Highlights (2 Cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider">
                    Evaluasi Kinerja Tahunan
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                  Rangkuman pencapaian usaha selama tahun kalender {selectedYear}
                </p>
              </div>

              {/* Bulan Emas Award Card */}
              {bestMonth ? (
                <div className="p-4 rounded-xl border bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 dark:border-amber-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Bulan Emas Usaha
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                      {bestMonth.monthName}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <span className="font-mono text-2xl font-black text-amber-700 dark:text-amber-400">
                      {formatRupiah(bestMonth.labaKotor)}
                    </span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-medium">
                      Perolehan laba kotor tertinggi sepanjang tahun dengan {bestMonth.daysCount} hari transaksi tercatat.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center py-6">
                  <span className="text-xs text-zinc-400">Belum ada transaksi tercatat pada tahun {selectedYear}.</span>
                </div>
              )}

              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/50 rounded-xl">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block tracking-wider">
                    Rata-rata Laba / Bulan
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {formatRupiah(avgMonthlyProfit)}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">{activeMonthsCount} bulan aktif</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/50 rounded-xl">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block tracking-wider">
                    Rata-rata Omzet / Bulan
                  </span>
                  <span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-1 block">
                    {formatRupiah(avgMonthlyOmzet)}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">Penjualan kotor</span>
                </div>
              </div>
            </div>

            {/* Column 2: 12-Month Trend Chart (3 Cols) */}
            <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider">
                      Tren Performa 12 Bulan ({selectedYear})
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Omzet
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Laba Kotor
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-4">
                  Pergerakan penjualan dan keuntungan dari Januari hingga Desember
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={annualMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAnnualOmzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAnnualLaba" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                    <XAxis 
                      dataKey="monthShort" 
                      tick={{ fontSize: 11, fill: "#888888" }} 
                      axisLine={{ stroke: "#88888820" }} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: "#888888" }} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    />
                    <Tooltip 
                      formatter={(val: any, name: any) => [
                        formatRupiah(Number(val) || 0), 
                        name === "omzet" ? "Omzet Penjualan" : "Laba Kotor"
                      ]}
                      labelFormatter={(label) => `Bulan ${label}`}
                      contentStyle={{
                        backgroundColor: "rgba(24, 24, 27, 0.95)",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#fff",
                        fontSize: "12px"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="omzet" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorAnnualOmzet)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="labaKotor" 
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorAnnualLaba)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 12-Month Recapitulation Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider">
                  Rekapitulasi Keuangan 12 Bulan (Tahun {selectedYear})
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                  Rincian performa bulanan Januari sampai Desember beserta total tahunan
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500">
                {activeMonthsCount} Bulan Berjalan • {annualTotalDays} Hari Transaksi
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-3.5 text-center w-12">No</th>
                    <th className="py-3 px-3.5">Bulan</th>
                    <th className="py-3 px-3.5 text-center">Hari Buka</th>
                    <th className="py-3 px-3.5 text-right">Total Omzet</th>
                    <th className="py-3 px-3.5 text-right">Modal / HPP</th>
                    <th className="py-3 px-3.5 text-right">Biaya Harian</th>
                    <th className="py-3 px-3.5 text-right">Laba Kotor</th>
                    <th className="py-3 px-3.5 text-right">Biaya Tetap</th>
                    <th className="py-3 px-3.5 text-right">Laba Bersih Murni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {annualMonthlyData.map((m) => {
                    const isBest = bestMonth && bestMonth.monthIndex === m.monthIndex && m.hasData;
                    return (
                      <motion.tr
                        key={m.monthIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 text-xs sm:text-sm transition-colors ${
                          isBest ? "bg-amber-500/5 dark:bg-amber-950/10" : ""
                        }`}
                      >
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-zinc-400 text-xs">
                          {m.monthIndex}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                          <span className="flex items-center gap-1.5">
                            {m.monthName}
                            {isBest && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">Terbaik 🏆</span>}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono text-zinc-600 dark:text-zinc-400 text-xs">
                          {m.hasData ? `${m.daysCount} hari` : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-zinc-900 dark:text-zinc-100 text-right text-xs">
                          {m.hasData ? formatRupiah(m.omzet) : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-rose-600 dark:text-rose-450 text-right text-xs">
                          {m.hasData ? (m.hpp > 0 ? `-${formatRupiah(m.hpp)}` : "Rp 0") : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-amber-600 dark:text-amber-450 text-right text-xs">
                          {m.hasData ? (m.biayaHarian > 0 ? `-${formatRupiah(m.biayaHarian)}` : "Rp 0") : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-teal-600 dark:text-teal-400 text-right text-xs">
                          {m.hasData ? formatRupiah(m.labaKotor) : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-zinc-500 dark:text-zinc-400 text-right text-xs">
                          {m.hasData ? (m.biayaTetap > 0 ? `-${formatRupiah(m.biayaTetap)}` : "Rp 0") : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-emerald-600 dark:text-emerald-450 text-right text-xs sm:text-sm">
                          {m.hasData ? formatRupiah(m.labaBersih) : <span className="text-zinc-300 dark:text-zinc-600">-</span>}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-950 text-xs font-bold font-mono">
                  <tr>
                    <td colSpan={2} className="py-3.5 px-3.5 text-zinc-900 dark:text-zinc-100 font-black">
                      TOTAL TAHUN {selectedYear}
                    </td>
                    <td className="py-3.5 px-3.5 text-center text-zinc-800 dark:text-zinc-200">
                      {annualTotalDays} Hari
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-zinc-900 dark:text-zinc-100 font-black">
                      {formatRupiah(annualTotalOmzet)}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-rose-600 dark:text-rose-450">
                      -{formatRupiah(annualTotalHpp)}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-amber-600 dark:text-amber-450">
                      -{formatRupiah(annualTotalBiayaHarian)}
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-black text-teal-600 dark:text-teal-400">
                      {formatRupiah(annualTotalLabaKotor)}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-zinc-600 dark:text-zinc-400">
                      -{formatRupiah(annualTotalBiayaTetap)}
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatRupiah(annualTotalLabaBersih)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
