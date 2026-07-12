import React, { useState } from "react";
import { DailyProfit } from "../types";
import { formatRupiah, formatIndoDate } from "../lib/utils";
import { Save, Calendar, Coins, AlignLeft, Trash2, HelpCircle, Sparkles, Percent } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "./Toast";
import { useTranslation } from "../lib/LanguageContext";

import { Restaurant } from "../types";

interface InputProfitProps {
  profits: DailyProfit[];
  onSaveProfit: (
    date: string, 
    profit: number, 
    notes?: string,
    omzet?: number,
    hppType?: "nominal" | "percentage",
    hppVal?: number,
    otherExpenses?: number,
    branchName?: string,
    inputterName?: string
  ) => Promise<void>;
  onDeleteProfit: (id: string) => Promise<void>;
  isStaffMode?: boolean;
  restaurant?: Restaurant | null;
}

export default function InputProfit({ profits, onSaveProfit, onDeleteProfit, isStaffMode = false, restaurant }: InputProfitProps) {
  const { showToast } = useToast();
  const { lang, t, currency, currencySymbol } = useTranslation();
  
  const isDollar = currency === "dollar";
  const formatLocale = isDollar ? "en-US" : "id-ID";
  
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;
  const [date, setDate] = useState(todayStr);
  const [omzetInput, setOmzetInput] = useState("");
  const [useHpp, setUseHpp] = useState(() => {
    try {
      return localStorage.getItem("taskwai_use_hpp") !== "false";
    } catch {
      return true;
    }
  });
  const [hppType, setHppType] = useState<"nominal" | "percentage">("percentage");
  const [hppNominalInput, setHppNominalInput] = useState("");
  const [hppPercentInput, setHppPercentInput] = useState("35"); // Default standard HPP is often around 35%
  const [otherExpensesInput, setOtherExpensesInput] = useState("");

  // Staff Mode specific fields
  const [branchInput, setBranchInput] = useState(() => {
    return localStorage.getItem("taskwai_last_branch") || "";
  });
  const [inputterInput, setInputterInput] = useState(() => {
    return localStorage.getItem("taskwai_last_inputter") || "";
  });
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);

  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleHppToggle = (enabled: boolean) => {
    setUseHpp(enabled);
    try {
      localStorage.setItem("taskwai_use_hpp", String(enabled));
    } catch (e) {
      console.error(e);
    }
  };

  // Parse helper
  const parseCurrency = (val: string) => {
    const cleanStr = val.replace(/[^0-9]/g, "");
    return parseInt(cleanStr, 10) || 0;
  };

  // Live Calculations
  const omzetVal = parseCurrency(omzetInput);
  const otherExpensesVal = parseCurrency(otherExpensesInput);
  
  let hppVal = 0;
  let hppValForDb = 0;
  if (useHpp) {
    if (hppType === "nominal") {
      const nominal = parseCurrency(hppNominalInput);
      hppVal = nominal;
      hppValForDb = nominal;
    } else {
      const pct = parseFloat(hppPercentInput) || 0;
      hppVal = Math.round((omzetVal * pct) / 100);
      hppValForDb = pct;
    }
  }

  const computedProfit = omzetVal - hppVal - otherExpensesVal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (omzetVal <= 0) {
      showToast(t("profit.invalidOmzet", "Harap masukkan nilai omzet yang valid (lebih besar dari 0)"), "warning");
      return;
    }

    if (computedProfit < 0) {
      if (!confirm(t("profit.lossWarning", "Peringatan: Kalkulasi profit harian Anda bernilai minus (rugi). Apakah Anda yakin ingin menyimpan?"))) {
        return;
      }
    }

    if (isStaffMode) {
      const confirmMsg = `Apakah Anda yakin ingin mengirim laporan ini?\n\nMohon periksa kembali:\n- Tanggal Operasional: ${formatIndoDate(date, lang)}\n- Nominal Omzet: ${formatRupiah(omzetVal)}\n- Nama Cabang: ${branchInput.trim() || "(Belum diisi)"}\n\nPastikan data di atas sudah benar ya, agar tidak terjadi kesalahan pencatatan dan menghindari teguran dari bos/atasan Anda. 😊`;
      if (!confirm(confirmMsg)) {
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
        useHpp ? hppType : undefined, 
        useHpp ? hppValForDb : undefined, 
        otherExpensesVal,
        branchInput.trim() || undefined,
        inputterInput.trim() || undefined
      );
      showToast(t("profit.saveSuccess", "Profit tanggal {date} berhasil disimpan!").replace("{date}", formatIndoDate(date, lang)), "success");
      
      // Cache branch and name for staff auto-fill next time
      if (branchInput.trim()) {
        localStorage.setItem("taskwai_last_branch", branchInput.trim());
      }
      if (inputterInput.trim()) {
        localStorage.setItem("taskwai_last_inputter", inputterInput.trim());
      }

      // Keep state clean but preserve HPP percentage for easier repetitive daily entry
      setOmzetInput("");
      setHppNominalInput("");
      setOtherExpensesInput("");
      setNotes("");
    } catch (err) {
      console.error(err);
      showToast(t("profit.saveError", "Gagal menyimpan profit harian."), "error");
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
    const formatted = new Intl.NumberFormat(formatLocale).format(Number(rawValue));
    setter(formatted);
  };

  const handleDelete = async (id: string, logDate: string) => {
    if (confirm(t("profit.deleteConfirm", "Apakah Anda yakin ingin menghapus data profit tanggal {date}?").replace("{date}", formatIndoDate(logDate, lang)))) {
      try {
        await onDeleteProfit(id);
        showToast(t("profit.deleteSuccess", "Data profit berhasil dihapus."), "info");
      } catch (err) {
        console.error(err);
        showToast(t("profit.deleteError", "Gagal menghapus data profit."), "error");
      }
    }
  };

  return (
    <div className={isStaffMode ? "max-w-2xl mx-auto space-y-6" : "grid grid-cols-1 lg:grid-cols-3 gap-8"}>
      {/* Input Form Column */}
      <div className={isStaffMode ? "space-y-6" : "lg:col-span-1 space-y-6"}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
            <div>
              <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                {t("profit.title", "Pencatatan Laba Baru")}
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">
                {useHpp 
                  ? t("profit.subtitleFormulaWithHpp", "Berdasarkan rumus ringkas: Omzet - HPP - Pengeluaran Lain")
                  : t("profit.subtitleFormulaWithoutHpp", "Berdasarkan rumus ringkas: Omzet - Pengeluaran Lain")}
              </p>
            </div>
            {isStaffMode && restaurant && (
              <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/10 self-start sm:self-auto shrink-0 animate-in fade-in duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black tracking-tight">{restaurant.name} <span className="font-semibold text-emerald-600/80 dark:text-emerald-400/80 text-[10px] ml-0.5">(Akun Staff)</span></span>
              </div>
            )}
          </div>


          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                {t("profit.date", "Tanggal Operasional")}
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
                {t("profit.omzet", "Total Omzet (Pendapatan Hari Ini)")}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none font-mono">
                  {currencySymbol}
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

            {/* Toggle HPP Feature Switch */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50/50 dark:bg-zinc-950/45 border border-zinc-200/50 dark:border-zinc-800/60 rounded-xl">
              <div className="flex flex-col pr-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("profit.hppFeature", "Aktifkan Fitur HPP")}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-normal">{t("profit.hppFeatureDesc", "Kalkulasi modal / bahan baku per porsi dagangan")}</span>
              </div>
              <button
                type="button"
                onClick={() => handleHppToggle(!useHpp)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  useHpp ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    useHpp ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* HPP (COGS) Type Selector & Input */}
            {useHpp && (
              <div className="space-y-2 bg-zinc-50/50 dark:bg-zinc-950/25 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {t("profit.hpp", "HPP (Cost of Goods Sold)")}
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
                      {t("profit.percent", "Persen (%)")}
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
                      {t("profit.nominal", "Nominal (Rp)").replace("(Rp)", `(${currencySymbol})`)}
                    </button>
                  </div>
                </div>

                {hppType === "nominal" ? (
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none font-mono">
                      {currencySymbol}
                    </span>
                    <input
                      type="text"
                      value={hppNominalInput}
                      onChange={(e) => handleCurrencyChange(e.target.value, setHppNominalInput)}
                      placeholder="e.g. 1.925.000"
                      required={useHpp}
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
                      required={useHpp}
                      className="w-full pl-4 pr-11 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none transition-all font-mono"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none">
                      %
                    </span>
                  </div>
                )}
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 block leading-normal">
                  {hppType === "percentage" 
                    ? t("profit.hppPercentDesc", "Bahan baku otomatis dikalkulasi dari % dikali Omzet.") 
                    : t("profit.hppNominalDesc", "Masukkan nominal belanja bahan baku / modal porsi hari ini.")}
                </span>
              </div>
            )}

            {/* Other Expenses Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                {t("profit.otherExpenses", "Pengeluaran Lain-lain Hari Ini")}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none font-mono">
                  {currencySymbol}
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

            {/* Cabang Input */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Cabang Restoran / Outlet <span className="text-zinc-400 dark:text-zinc-500 font-normal lowercase">{t("profit.optional", "(opsional)")}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 pointer-events-none select-none font-mono">
                  🏢
                </span>
                <input
                  type="text"
                  value={branchInput}
                  onChange={(e) => {
                    setBranchInput(e.target.value);
                    setShowBranchSuggestions(true);
                  }}
                  onFocus={() => setShowBranchSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowBranchSuggestions(false), 200)}
                  placeholder="e.g. Cabang Sudirman"
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all"
                />
              </div>
              
              {/* Autocomplete branch suggestions */}
              {showBranchSuggestions && restaurant && restaurant.branches && restaurant.branches.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-xl shadow-lg max-h-40 overflow-y-auto pr-1">
                  {restaurant.branches
                    .filter(b => b.toLowerCase().includes(branchInput.toLowerCase()))
                    .map((branch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={() => {
                          setBranchInput(branch);
                          setShowBranchSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                      >
                        {branch}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Nama Penginput */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Nama Penginput / Karyawan <span className="text-zinc-400 dark:text-zinc-500 font-normal lowercase">{t("profit.optional", "(opsional)")}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 pointer-events-none select-none font-mono">
                  👤
                </span>
                <input
                  type="text"
                  value={inputterInput}
                  onChange={(e) => setInputterInput(e.target.value)}
                  placeholder="e.g. Andi"
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all"
                />
              </div>
            </div>

            {/* Live Profit Calculation Panel */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/50 dark:border-zinc-800/60 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800 pb-2">
                <span className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {useHpp ? t("profit.grossProfitCalc", "Kalkulasi Laba Kotor") : t("profit.omzetCalc", "Kalkulasi Omzet")}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" /> Live
                </span>
              </div>
              
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">{t("profit.totalOmzet", "Total Omzet:")}</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                    + {formatRupiah(omzetVal)}
                  </span>
                </div>
                
                {useHpp && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {t("profit.hppLabel", "HPP")} ({hppType === "percentage" ? `${hppPercentInput || "0"}%` : "Nominal"}):
                    </span>
                    <span className="font-mono font-bold text-rose-500 dark:text-rose-400">
                      - {formatRupiah(hppVal)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">{t("profit.otherExpensesLabel", "Pengeluaran Lainnya:")}</span>
                  <span className="font-mono font-bold text-rose-500 dark:text-rose-400">
                    - {formatRupiah(otherExpensesVal)}
                  </span>
                </div>
                
                <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 my-2 pt-2.5 flex justify-between items-center">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    {useHpp ? t("profit.netProfitResult", "Sisa Laba Bersih:") : t("profit.grossProfitResult", "Total Omzet Kotor (Laba):")}
                  </span>
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
                  {t("profit.notes", "Catatan Tambahan")} <span className="text-zinc-400 dark:text-zinc-500 font-normal lowercase">{t("profit.optional", "(opsional)")}</span>
                </label>
              </div>
              <div className="relative">
                <AlignLeft className="absolute left-3.5 top-3 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("profit.notesPlaceholder", "Ramai pesanan katering, cuaca hujan, dsb.")}
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
              <span>{isSaving ? t("profit.saving", "Menyimpan...") : t("profit.save", "Simpan Profit")}</span>
            </button>
          </form>
        </div>

        {/* Tip Box */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-4 flex gap-3">
          <HelpCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
            {t("profit.tipDesc", "Menyimpan data pada tanggal yang sudah terisi sebelumnya akan memperbarui (overwrite) nilai profit tanggal tersebut otomatis.")}
          </p>
        </div>
      </div>

      {/* History Log Column */}
      {!isStaffMode && (
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">{t("profit.history", "Riwayat Profit Masuk")}</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">{t("profit.historySubtitle", "Daftar log profit harian yang tersimpan di sistem.")}</p>
          </div>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg px-2.5 py-1 uppercase tracking-wider">
            {t("profit.historyTotal", "Total: {count} hari").replace("{count}", String(profits.length))}
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
                          {formatIndoDate(p.date, lang).split(",")[1]} {/* Get just date and month */}
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
                        title={t("profit.deleteTooltip", "Hapus log")}
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
                        {t("laporan.tableTurnover", "Omzet")}: <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{formatRupiah(p.omzet || 0)}</span>
                      </div>
                      {p.hppType ? (
                        <>
                          <div className="text-zinc-300 dark:text-zinc-800">&bull;</div>
                          <div>
                            {t("laporan.tableHpp", "HPP")} ({p.hppType === "percentage" ? `${p.hppVal}%` : currencySymbol}): <span className="font-mono font-bold text-rose-500/90 dark:text-rose-450/90">{formatRupiah(calculatedHpp)}</span>
                          </div>
                        </>
                      ) : null}
                      <div className="text-zinc-300 dark:text-zinc-800">&bull;</div>
                      <div>
                        {t("profit.otherExpensesLabel", "Lainnya")}: <span className="font-mono font-bold text-rose-500/90 dark:text-rose-450/90">{formatRupiah(p.otherExpenses || 0)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 pt-1.5 border-t border-dotted border-zinc-100 dark:border-zinc-800/40">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{t("profit.oldLogDesc", "Log tanpa rincian HPP (Pencatatan Lama)")}</span>
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/25">
              <Coins className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-xs font-bold text-zinc-500">{t("profit.noHistory", "Belum ada riwayat profit harian.")}</p>
              <p className="text-[10px] mt-1 text-zinc-400">{t("profit.noHistoryDesc", "Silakan tambahkan menggunakan form di sebelah kiri.")}</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
