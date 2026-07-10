import React, { useState } from "react";
import { DailyProfit } from "../types";
import { formatRupiah, formatIndoDate } from "../lib/utils";
import { Save, Calendar, Coins, AlignLeft, Trash2, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "./Toast";

interface InputProfitProps {
  profits: DailyProfit[];
  onSaveProfit: (date: string, profit: number, notes?: string) => Promise<void>;
  onDeleteProfit: (id: string) => Promise<void>;
}

export default function InputProfit({ profits, onSaveProfit, onDeleteProfit }: InputProfitProps) {
  const { showToast } = useToast();
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [profitInput, setProfitInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const profitVal = parseFloat(profitInput.replace(/[^0-9.-]+/g, ""));
    if (isNaN(profitVal) || profitVal <= 0) {
      showToast("Harap masukkan nilai profit yang valid (harus lebih besar dari 0)", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveProfit(date, profitVal, notes);
      showToast(`Profit tanggal ${formatIndoDate(date)} berhasil disimpan!`, "success");
      setProfitInput("");
      setNotes("");
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan profit harian.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setProfitInput("");
      return;
    }
    // Format to nice readable currency on change
    const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
    setProfitInput(formatted);
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
            <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">Catat Profit Harian</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">Masukkan laba operasional harian restoran Anda di sini.</p>
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

            {/* Profit Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Profit Hari Ini (Laba Kotor Harian)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none font-mono">
                  Rp
                </span>
                <input
                  type="text"
                  value={profitInput}
                  onChange={handleProfitChange}
                  placeholder="e.g. 1.500.000"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
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
                  placeholder="e.g. Ramai katering, cuaca hujan, dsb."
                  rows={3}
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
            Menyimpan profit harian pada tanggal yang sudah terisi sebelumnya akan memperbarui (overwrite) nilai profit tanggal tersebut otomatis.
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

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
          {profits.length > 0 ? (
            profits.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/60 hover:border-zinc-200 dark:hover:border-zinc-700 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 font-mono">
                      {p.date}
                    </span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                      {formatIndoDate(p.date).split(",")[1]} {/* Get just date and month */}
                    </span>
                  </div>
                  {p.notes ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic truncate max-w-sm">
                      "{p.notes}"
                    </p>
                  ) : (
                    <span className="text-[10px] text-zinc-300 dark:text-zinc-600 block mt-1 font-medium">Tidak ada catatan</span>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-base font-extrabold text-zinc-950 dark:text-white">
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
              </motion.div>
            ))
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
