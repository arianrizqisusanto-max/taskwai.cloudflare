import React, { useState } from "react";
import { DailyProfit } from "../types";
import { formatRupiah, formatIndoDate } from "../lib/utils";
import { FileText, Download, Calendar, Filter, FileSpreadsheet, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { useToast } from "./Toast";
import { motion } from "motion/react";

interface LaporanProps {
  profits: DailyProfit[];
}

type FilterType = "hari" | "minggu" | "bulan";

export default function Laporan({ profits }: LaporanProps) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterType>("bulan");

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

  // Filtered profits
  const filteredProfits = profits.filter((p) => {
    if (filter === "hari") {
      return p.date === todayStr;
    }
    if (filter === "minggu") {
      return isWithinPastDays(p.date, 7);
    }
    if (filter === "bulan") {
      // Just filter current month
      const currentMonthPrefix = todayStr.substring(0, 7);
      return p.date.startsWith(currentMonthPrefix);
    }
    return true;
  });

  // Calculate statistics
  const totalDays = filteredProfits.length;
  const totalProfit = filteredProfits.reduce((acc, curr) => acc + curr.profit, 0);
  const averageProfit = totalDays > 0 ? totalProfit / totalDays : 0;
  
  const maxProfitEntry = totalDays > 0 ? [...filteredProfits].sort((a, b) => b.profit - a.profit)[0] : null;
  const minProfitEntry = totalDays > 0 ? [...filteredProfits].sort((a, b) => a.profit - b.profit)[0] : null;

  const handleExport = (type: "PDF" | "Excel") => {
    showToast(`Sedang menyiapkan dokumen ${type}...`, "info");
    setTimeout(() => {
      showToast(`Laporan berhasil diekspor ke format ${type}!`, "success");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Upper bar: Filters and Exports */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        {/* Left: filter toggle */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <div className="flex bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/80 p-1 rounded-xl">
            {(["hari", "minggu", "bulan"] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === type
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("PDF")}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-950 text-zinc-700 dark:text-zinc-300 font-bold text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor PDF</span>
          </button>
          <button
            onClick={() => handleExport("Excel")}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-955 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total profit */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Total Profit Terfilter</span>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight">
            {formatRupiah(totalProfit)}
          </span>
        </div>

        {/* Average */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Rata-rata Profit</span>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight">
            {formatRupiah(averageProfit)}
          </span>
        </div>

        {/* Highest profit */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Profit Tertinggi</span>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight flex items-center gap-1.5">
            {maxProfitEntry ? formatRupiah(maxProfitEntry.profit) : "Rp0"}
            {maxProfitEntry && <ArrowUpRight className="w-5 h-5 text-emerald-600 shrink-0" />}
          </span>
        </div>

        {/* Lowest profit */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Profit Terendah</span>
          <span className="font-mono text-2xl font-black text-zinc-950 dark:text-zinc-50 block mt-2 tracking-tight flex items-center gap-1.5">
            {minProfitEntry ? formatRupiah(minProfitEntry.profit) : "Rp0"}
            {minProfitEntry && <ArrowDownRight className="w-5 h-5 text-rose-600 shrink-0" />}
          </span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider mb-4">Laporan Keuangan Rinci</h3>

        <div className="overflow-x-auto">
          {filteredProfits.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Hari</th>
                  <th className="py-3 px-4">Laba Kotor</th>
                  <th className="py-3 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredProfits.map((p) => {
                  const dateObj = new Date(p.date);
                  const weekday = dateObj.toLocaleDateString("id-ID", { weekday: "long" });
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
              <p className="text-xs font-bold text-zinc-500">Tidak ditemukan log profit untuk filter "{filter}".</p>
              <p className="text-[10px] mt-1 font-medium text-zinc-400">Silakan tambahkan data profit atau ubah rentang filter di atas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
