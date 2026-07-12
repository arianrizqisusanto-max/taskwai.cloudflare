import React, { useState } from "react";
import { Expenses } from "../types";
import { formatRupiah } from "../lib/utils";
import { Landmark, Save, Calculator, HelpCircle, CheckCircle } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useToast } from "./Toast";
import { useTranslation } from "../lib/LanguageContext";

interface BiayaProps {
  expenses: Expenses;
  onSaveExpenses: (data: Partial<Expenses>) => Promise<void>;
}

export default function Biaya({ expenses, onSaveExpenses }: BiayaProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  // Individual states for all expenses
  const [sewaTempat, setSewaTempat] = useState(new Intl.NumberFormat("id-ID").format(expenses.sewaTempat));
  const [gajiKaryawan, setGajiKaryawan] = useState(new Intl.NumberFormat("id-ID").format(expenses.gajiKaryawan));
  const [royaltiFranchise, setRoyaltiFranchise] = useState(new Intl.NumberFormat("id-ID").format(expenses.royaltiFranchise));
  const [listrik, setListrik] = useState(new Intl.NumberFormat("id-ID").format(expenses.listrik));
  const [air, setAir] = useState(new Intl.NumberFormat("id-ID").format(expenses.air));
  const [internet, setInternet] = useState(new Intl.NumberFormat("id-ID").format(expenses.internet));
  const [marketing, setMarketing] = useState(new Intl.NumberFormat("id-ID").format(expenses.marketing));
  const [pajak, setPajak] = useState(new Intl.NumberFormat("id-ID").format(expenses.pajak));
  const [biayaLain, setBiayaLain] = useState(new Intl.NumberFormat("id-ID").format(expenses.biayaLain));

  const handleCurrencyChange = (val: string, setter: (v: string) => void) => {
    const rawValue = val.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setter("");
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
    setter(formatted);
  };

  const parseValue = (str: string): number => {
    const cleanStr = str.replace(/[^0-9]/g, "");
    const parsed = parseInt(cleanStr, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Compute total expenses
  const valSewa = parseValue(sewaTempat);
  const valGaji = parseValue(gajiKaryawan);
  const valFranchise = parseValue(royaltiFranchise);
  const valListrik = parseValue(listrik);
  const valAir = parseValue(air);
  const valInternet = parseValue(internet);
  const valMarketing = parseValue(marketing);
  const valPajak = parseValue(pajak);
  const valLain = parseValue(biayaLain);

  const totalBiaya = 
    valSewa + valGaji + valFranchise + valListrik + valAir + valInternet + valMarketing + valPajak + valLain;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedData: Partial<Expenses> = {
      sewaTempat: valSewa,
      gajiKaryawan: valGaji,
      royaltiFranchise: valFranchise,
      listrik: valListrik,
      air: valAir,
      internet: valInternet,
      marketing: valMarketing,
      pajak: valPajak,
      biayaLain: valLain
    };

    try {
      await onSaveExpenses(updatedData);
      showToast(t("biaya.success", "Biaya operasional bulanan berhasil diperbarui!"), "success");
    } catch (err) {
      console.error(err);
      showToast(t("biaya.error", "Gagal memperbarui biaya operasional."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Pie chart data preparation
  const chartData = [
    { name: t("biaya.sewa", "Sewa Tempat"), value: valSewa },
    { name: t("biaya.gaji", "Gaji Karyawan"), value: valGaji },
    { name: t("biaya.royalti", "Royalti Franchise"), value: valFranchise },
    { name: t("biaya.listrik", "Listrik"), value: valListrik },
    { name: t("biaya.air", "Air"), value: valAir },
    { name: t("biaya.internet", "Internet"), value: valInternet },
    { name: t("biaya.marketing", "Marketing"), value: valMarketing },
    { name: t("biaya.pajak", "Pajak"), value: valPajak },
    { name: t("biaya.lain", "Biaya Lain-Lain"), value: valLain }
  ].filter(item => item.value > 0);

  // Vibrant modern colors that stand out elegantly in both light and dark modes
  const COLORS = [
    "#6366f1", // Indigo
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#f43f5e", // Rose
    "#0ea5e9", // Sky
    "#7c3aed", // Violet
    "#f97316", // Orange
    "#0891b2", // Cyan
    "#ec4899", // Pink
  ];

  const hasChartData = chartData.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Input Form Column */}
      <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">{t("biaya.title", "Atur Biaya Operasional Tetap")}</h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">{t("biaya.subtitle", "Masukkan taksiran pengeluaran tetap bulanan usaha Anda.")}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold rounded-xl text-xs font-mono shadow-sm">
              <Calculator className="w-3.5 h-3.5" />
              <span>{t("biaya.total", "Total")}: {formatRupiah(totalBiaya)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Sewa Tempat */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("biaya.sewa", "Sewa Tempat")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">Rp</span>
                <input
                  type="text"
                  value={sewaTempat}
                  onChange={(e) => handleCurrencyChange(e.target.value, setSewaTempat)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Gaji Karyawan */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("biaya.gaji", "Gaji Karyawan")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">Rp</span>
                <input
                  type="text"
                  value={gajiKaryawan}
                  onChange={(e) => handleCurrencyChange(e.target.value, setGajiKaryawan)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Royalti Franchise */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("biaya.royalti", "Royalti Franchise")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">Rp</span>
                <input
                  type="text"
                  value={royaltiFranchise}
                  onChange={(e) => handleCurrencyChange(e.target.value, setRoyaltiFranchise)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Listrik */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("biaya.listrik", "Listrik")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">Rp</span>
                <input
                  type="text"
                  value={listrik}
                  onChange={(e) => handleCurrencyChange(e.target.value, setListrik)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Air */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("biaya.air", "Air")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">Rp</span>
                <input
                  type="text"
                  value={air}
                  onChange={(e) => handleCurrencyChange(e.target.value, setAir)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Internet */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("biaya.internet", "Internet")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">Rp</span>
                <input
                  type="text"
                  value={internet}
                  onChange={(e) => handleCurrencyChange(e.target.value, setInternet)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Marketing */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("biaya.marketing", "Marketing")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">Rp</span>
                <input
                  type="text"
                  value={marketing}
                  onChange={(e) => handleCurrencyChange(e.target.value, setMarketing)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Pajak */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("biaya.pajak", "Pajak")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">Rp</span>
                <input
                  type="text"
                  value={pajak}
                  onChange={(e) => handleCurrencyChange(e.target.value, setPajak)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>

            {/* Biaya Lain */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">{t("biaya.lain", "Biaya Lain-Lain")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">Rp</span>
                <input
                  type="text"
                  value={biayaLain}
                  onChange={(e) => handleCurrencyChange(e.target.value, setBiayaLain)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? t("biaya.saving", "Menyimpan...") : t("biaya.save", "Simpan Perubahan Biaya")}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Visual Allocation Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] flex flex-col h-full justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider mb-2">{t("biaya.chartTitle", "Alokasi Biaya Bulanan")}</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{t("biaya.chartSubtitle", "Diagram persentase sebaran pengeluaran usaha Anda")}</p>

            <div className="h-[200px] w-full flex items-center justify-center my-6">
              {hasChartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--tooltip-bg, #ffffff)",
                        borderColor: "var(--tooltip-border, #e4e4e7)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        fontFamily: "Inter, sans-serif"
                      }}
                      itemStyle={{ color: "var(--tooltip-text, #09090b)", fontSize: "12px", fontWeight: "600" }}
                      labelStyle={{ color: "var(--tooltip-text, #09090b)", fontSize: "11px", opacity: 0.7 }}
                      formatter={(value: any) => [formatRupiah(Number(value)), t("biaya.total", "Total")]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-905 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800/80 w-full h-full justify-center rounded-xl">
                  <Landmark className="w-8 h-8 text-zinc-350 dark:text-zinc-600 mb-2" />
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{t("biaya.noData", "Belum ada pengeluaran diisi")}</span>
                </div>
              )}
            </div>

            {/* List breakdown */}
            <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              {chartData.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-sm shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">{item.name}</span>
                  </div>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                    {formatRupiah(item.value)} ({Math.round((item.value / totalBiaya) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/80 rounded-xl p-4 flex gap-2.5 mt-6">
            <HelpCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              {t("biaya.helpText", "Biaya operasional ini digunakan sebagai pengurang untuk menghitung Laba Bersih Sebenarnya (Real Net Profit) dari akumulasi profit harian Anda di akhir bulan.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
