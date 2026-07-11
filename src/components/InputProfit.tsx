import React, { useState } from "react";
import { DailyProfit } from "../types";
import { formatRupiah, formatIndoDate } from "../lib/utils";
import { Save, Calendar, Coins, AlignLeft, Trash2, HelpCircle, Sparkles, Percent } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "./Toast";

interface InputProfitProps {
  profits: DailyProfit[];
  onSaveProfit: (
    date: string, 
    profit: number, 
    notes?: string,
    omzet?: number,
    hppType?: "nominal" | "percentage",
    hppVal?: number,
    otherExpenses?: number
  ) => Promise<void>;
  onDeleteProfit: (id: string) => Promise<void>;
}

export default function InputProfit({ profits, onSaveProfit, onDeleteProfit }: InputProfitProps) {
  const { showToast } = useToast();
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [omzetInput, setOmzetInput] = useState("");
  const [hppType, setHppType] = useState<"nominal" | "percentage">("percentage");
  const [hppNominalInput, setHppNominalInput] = useState("");
  const [hppPercentInput, setHppPercentInput] = useState("35"); // Default standard HPP is often around 35%
  const [otherExpensesInput, setOtherExpensesInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Parse helper
  const parseCurrency = (val: string) => {
    return parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0;
  };

  // Live Calculations
  const omzetVal = parseCurrency(omzetInput);
  const otherExpensesVal = parseCurrency(otherExpensesInput);
  
  let hppVal = 0;
  let hppValForDb = 0;
  if (hppType === "nominal") {
    const nominal = parseCurrency(hppNominalInput);
    hppVal = nominal;
    hppValForDb = nominal;
  } else {
    const pct = parseFloat(hppPercentInput) || 0;
    hppVal = Math.round((omzetVal * pct) / 100);
    hppValForDb = pct;
  }

  const computedProfit = omzetVal - hppVal - otherExpensesVal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (omzetVal <= 0) {
      showToast("Harap masukkan nilai omzet yang valid (lebih besar dari 0)", "warning");
      return;
    }

    if (computedProfit < 0) {
      if (!confirm("Peringatan: Kalkulasi profit harian Anda bernilai minus (rugi). Apakah Anda yakin ingin menyimpan?")) {
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSaveProfit(
        date, 
        computedProfit, 
        notes, 
        omzetVal, 
        hppType, 
        hppValForDb, 
        otherExpensesVal
      );
      showToast(`Profit tanggal ${formatIndoDate(date)} berhasil disimpan!`, "success");
      
      // Keep state clean but preserve HPP percentage for easier repetitive daily entry
      setOmzetInput("");
      setHppNominalInput("");
      setOtherExpensesInput("");
      setNotes("");
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan profit harian.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Currency Formatter for Inputs
  const handleCurrencyChange = (val: string, setter: (formatted: string) => void) => {
    const rawValue = val.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setter("");
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
    setter(formatted);
  };

  const handleDelete = async (id: string, logDate: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data profit tanggal ${formatIndoDate(logDate)}?`)) {
      try {
        await onDeleteProfit(id);
        showToast("Data profit berhasil dihapus.", "info");
      } catch (err) {
        console.error(err);
        showToast("Gagal menghapus data profit.", "error");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Input Form Column */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
          <div className="mb-6">
            <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">Pencatatan Laba Baru</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">Berdasarkan rumus ringkas: Omzet - HPP - Pengeluaran Lain</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Tanggal Operasional
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Omzet Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Total Omzet (Pendapatan Hari Ini)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none font-mono">
                  Rp
                </span>
                <input
                  type="text"
                  value={omzetInput}
                  onChange={(e) => handleCurrencyChange(e.target.value, setOmzetInput)}
                  placeholder="e.g. 5.500.000"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-bold text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* HPP (COGS) Type Selector & Input */}
            <div className="space-y-2 bg-zinc-50/50 dark:bg-zinc-950/25 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  HPP (Cost of Goods Sold)
                </label>
                {/* Segmented control toggle */}
                <div className="flex bg-zinc-200/80 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setHppType("percentage")}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                      hppType === "percentage"
                        ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    Persen (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHppType("nominal")}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                      hppType === "nominal"
                        ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    Nominal (Rp)
                  </button>
                </div>
              </div>

              {hppType === "nominal" ? (
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none font-mono">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={hppNominalInput}
                    onChange={(e) => handleCurrencyChange(e.target.value, setHppNominalInput)}
                    placeholder="e.g. 1.925.000"
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none transition-all font-mono"
                  />
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hppPercentInput}
                    onChange={(e) => setHppPercentInput(e.target.value)}
                    placeholder="e.g. 35"
                    required
                    className="w-full pl-4 pr-11 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none transition-all font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none">
                    %
                  </span>
                </div>
              )}
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 block leading-normal">
                {hppType === "percentage" 
                  ? "Bahan baku otomatis dikalkulasi dari % dikali Omzet." 
                  : "Masukkan nominal belanja bahan baku / modal porsi hari ini."}
              </span>
            </div>

            {/* Other Expenses Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Pengeluaran Lain-lain Hari Ini
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none font-mono">
                  Rp
                </span>
                <input
                  type="text"
                  value={otherExpensesInput}
                  onChange={(e) => handleCurrencyChange(e.target.value, setOtherExpensesInput)}
                  placeholder="e.g. 150.000"
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Live Profit Calculation Panel */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/50 dark:border-zinc-800/60 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800 pb-2">
                <span className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Kalkulasi Laba Kotor</span>
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" /> Live
                </span>
              </div>
              
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Total Omzet:</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                    + {formatRupiah(omzetVal)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    HPP ({hppType === "percentage" ? `${hppPercentInput || "0"}%` : "Nominal"}):
                  </span>
                  <span className="font-mono font-bold text-rose-500 dark:text-rose-400">
                    - {formatRupiah(hppVal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Pengeluaran Lainnya:</span>
                  <span className="font-mono font-bold text-rose-500 dark:text-rose-400">
                    - {formatRupiah(otherExpensesVal)}
                  </span>
                </div>
                
                <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 my-2 pt-2.5 flex justify-between items-center">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">Sisa Laba Bersih:</span>
                  <span className={`font-mono text-sm font-black ${computedProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {computedProfit >= 0 ? "+" : ""} {formatRupiah(computedProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Catatan Tambahan <span className="text-zinc-400 dark:text-zinc-500 font-normal lowercase">(opsional)</span>
                </label>
              </div>
              <div className="relative">
                <AlignLeft className="absolute left-3.5 top-3 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Ramai pesanan katering, cuaca hujan, dsb."
                  rows={2}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Profit"}</span>
            </button>
          </form>
        </div>

        {/* Tip Box */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-4 flex gap-3">
          <HelpCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
            Menyimpan data pada tanggal yang sudah terisi sebelumnya akan memperbarui (overwrite) nilai profit tanggal tersebut otomatis.
          </p>
        </div>
      </div>

      {/* History Log Column */}
      <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">Riwayat Profit Masuk</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">Daftar log profit harian yang tersimpan di sistem.</p>
          </div>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg px-2.5 py-1 uppercase tracking-wider">
            Total: {profits.length} hari
          </span>
        </div>

        <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin">
          {profits.length > 0 ? (
            profits.map((p) => {
              // Calculate dynamic values for log if breakdown fields exist
              const hasBreakdown = p.omzet !== undefined;
              let calculatedHpp = 0;
              if (hasBreakdown) {
                if (p.hppType === "percentage") {
                  calculatedHpp = Math.round(((p.omzet || 0) * (p.hppVal || 0)) / 100);
                } else {
                  calculatedHpp = p.hppVal || 0;
                }
              }

              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col p-4 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/60 hover:border-zinc-200 dark:hover:border-zinc-700 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 font-mono">
                          {p.date}
                        </span>
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                          {formatIndoDate(p.date).split(",")[1]} {/* Get just date and month */}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`font-mono text-base font-extrabold ${p.profit >= 0 ? "text-zinc-950 dark:text-white" : "text-rose-600 dark:text-rose-450"}`}>
                        {formatRupiah(p.profit)}
                      </span>
                      <button
                        onClick={() => handleDelete(p.id, p.date)}
                        className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Hapus log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notes Render */}
                  {p.notes ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic truncate max-w-sm">
                      "{p.notes}"
                    </p>
                  ) : null}

                  {/* Profit breakdown fields if saved */}
                  {hasBreakdown ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/40 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-tight">
                      <div>
                        Omzet: <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{formatRupiah(p.omzet || 0)}</span>
                      </div>
                      <div className="text-zinc-300 dark:text-zinc-800">&bull;</div>
                      <div>
                        HPP ({p.hppType === "percentage" ? `${p.hppVal}%` : "Rp"}): <span className="font-mono font-bold text-rose-500/90 dark:text-rose-450/90">{formatRupiah(calculatedHpp)}</span>
                      </div>
                      <div className="text-zinc-300 dark:text-zinc-800">&bull;</div>
                      <div>
                        Lainnya: <span className="font-mono font-bold text-rose-500/90 dark:text-rose-450/90">{formatRupiah(p.otherExpenses || 0)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 pt-1.5 border-t border-dotted border-zinc-100 dark:border-zinc-800/40">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Log tanpa rincian HPP (Pencatatan Lama)</span>
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/25">
              <Coins className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-xs font-bold text-zinc-500">Belum ada riwayat profit harian.</p>
              <p className="text-[10px] mt-1 text-zinc-400">Silakan tambahkan menggunakan form di sebelah kiri.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
