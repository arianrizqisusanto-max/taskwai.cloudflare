import React from "react";
import { DailyProfit, Expenses, Restaurant } from "../types";
import { formatIndoDate, formatRupiah } from "../lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, HelpCircle, CheckCircle, AlertTriangle, AlertOctagon, ArrowUpRight, ArrowDownRight, Sparkles, Award } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "../lib/LanguageContext";

import { calculateTotalExpenses, calculateMonthlySummary } from "../lib/financialMath";

interface DashboardProps {
  restaurant: Restaurant;
  profits: DailyProfit[];
  expenses: Expenses;
}

export default function Dashboard({ restaurant, profits, expenses }: DashboardProps) {
  const { lang, t, currencySymbol } = useTranslation();
  // 1. Core Date Setup
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDateNum = today.getDate();
  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(currentDateNum).padStart(2, "0")}`;

  const summary = calculateMonthlySummary(
    profits,
    expenses,
    restaurant.monthlyTargetProfit,
    currentYear,
    currentMonth,
    currentDateNum
  );

  const {
    monthProfits: currentMonthProfits,
    totalProfitMonth,
    totalExpenses,
    remainingTarget,
    progressPercent,
    averageDailyProfit,
    averageDailyProfitActive,
    predictionProfit,
    targetDailyProfitTomorrow,
    daysRemaining,
    totalDaysInMonth
  } = summary;

  // Profit Hari Ini (Sum of all branch profits logged today)
  const todayEntries = currentMonthProfits.filter(p => p.date === todayStr);
  const profitToday = todayEntries.reduce((acc, curr) => acc + curr.profit, 0);

  // Target Profit Bulanan (Laba Bersih yang diinginkan owner)
  const targetProfit = restaurant.monthlyTargetProfit;

  // 3. Status Bisnis Definition
  // Amazing: Prediksi >= Target * 1.5
  // Excellent: Prediksi >= Target * 1.2
  // Hijau (Safe): Prediksi >= Target
  // Kuning (Caution): Prediksi >= Target * 0.85 && Prediksi < Target (Dekat target)
  // Merah (Danger): Prediksi < Target * 0.85 (Jauh dari target)
  let businessStatus: "green" | "yellow" | "red" | "excellent" | "amazing" = "green";
  if (predictionProfit >= targetProfit * 1.5) {
    businessStatus = "amazing";
  } else if (predictionProfit >= targetProfit * 1.2) {
    businessStatus = "excellent";
  } else if (predictionProfit >= targetProfit) {
    businessStatus = "green";
  } else if (predictionProfit >= targetProfit * 0.85) {
    businessStatus = "yellow";
  } else {
    businessStatus = "red";
  }

  const statusConfigs = {
    amazing: {
      label: t("dashboard.statusAmazing", "Luar Biasa!"),
      bgClass: "border-[#C5A028]/70 text-zinc-900 dark:text-zinc-50",
      bgStyle: {
        background: "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(255,215,0,0.10) 40%, rgba(197,160,40,0.06) 100%)",
        boxShadow: "0 4px_28px rgba(212,175,55,0.20), inset 0 1px 0 rgba(255,223,80,0.25)"
      } as React.CSSProperties,
      indicatorClass: "animate-pulse",
      indicatorStyle: { background: "linear-gradient(135deg, #D4AF37, #FFD700)" } as React.CSSProperties,
      textClass: "font-extrabold",
      textStyle: { background: "linear-gradient(135deg, #B8860B 0%, #FFD700 40%, #D4AF37 70%, #C5A028 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" } as React.CSSProperties,
      icon: <Sparkles className="w-5 h-5 animate-bounce" style={{ color: "#D4AF37" }} />,
      message: t("dashboard.messageAmazing", "Luar biasa! Pertumbuhan bisnis Anda sangat pesat dan melampaui seluruh estimasi target.")
    },
    excellent: {
      label: t("dashboard.statusExcellent", "Sangat Baik"),
      bgClass: "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200/60 dark:border-blue-900/30 text-blue-900 dark:text-blue-100 shadow-[0_1px_3px_rgba(59,130,246,0.03)]",
      indicatorClass: "bg-blue-500",
      textClass: "text-blue-600 dark:text-blue-400",
      icon: <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      message: t("dashboard.messageExcellent", "Kinerja bisnis sangat baik! Proyeksi profit melampaui target bulanan Anda.")
    },
    green: {
      label: t("dashboard.statusSafe", "Aman"),
      bgClass: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-100 shadow-[0_1px_3px_rgba(16,185,129,0.03)]",
      indicatorClass: "bg-emerald-500",
      textClass: "text-emerald-600 dark:text-emerald-400",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      message: t("dashboard.messageSafe", "Target bulan ini masih aman di jalur yang benar. Pertahankan performa usaha Anda!")
    },
    yellow: {
      label: t("dashboard.statusCaution", "Waspada"),
      bgClass: "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30 text-amber-900 dark:text-amber-100 shadow-[0_1px_3px_rgba(245,158,11,0.03)]",
      indicatorClass: "bg-amber-500",
      textClass: "text-amber-600 dark:text-amber-400",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      message: t("dashboard.messageCaution", "Profit harian perlu naik sekitar {diff} agar target tercapai.").replace("{diff}", formatRupiah(Math.max(0, targetDailyProfitTomorrow - averageDailyProfit)))
    },
    red: {
      label: t("dashboard.statusDanger", "Bahaya"),
      bgClass: "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/30 text-rose-900 dark:text-rose-100 shadow-[0_1px_3px_rgba(244,63,94,0.03)]",
      indicatorClass: "bg-rose-500",
      textClass: "text-rose-600 dark:text-rose-400",
      icon: <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      message: t("dashboard.messageDanger", "Kinerja profit saat ini jauh di bawah target bulanan. Perlu optimasi penjualan atau efisiensi biaya segera.")
    }
  };

  const hasTarget = targetProfit > 0;
  const currentStatus = !hasTarget ? {
    label: t("dashboard.statusActive", "Aktif"),
    bgClass: "bg-zinc-50/50 dark:bg-zinc-950/10 border-zinc-200/60 dark:border-zinc-800/30 text-zinc-900 dark:text-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.01)]",
    indicatorClass: "bg-zinc-400",
    textClass: "text-zinc-500 dark:text-zinc-400",
    icon: <CheckCircle className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />,
    message: t("dashboard.messageNoTarget", "Restoran aktif. Anda belum menetapkan target laba bulanan.")
  } : statusConfigs[businessStatus];

  // 4. Data for Chart (Daily logs grouped by date and sorted ascending)
  const groupedByDate = currentMonthProfits.reduce((acc, curr) => {
    if (!acc[curr.date]) {
      acc[curr.date] = 0;
    }
    acc[curr.date] += curr.profit;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(groupedByDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, profitSum]) => {
      const parts = dateKey.split("-");
      const day = parts[2];
      const month = parts[1];
      return {
        dateFull: formatIndoDate(dateKey, lang),
        label: `${day}/${month}`,
        "Profit Harian": profitSum,
      };
    });

  // Fallback if chartData is empty
  const hasChartData = chartData.length > 0;

  return (
    <div className="space-y-8">
      {/* 1. Greeting & Date Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/60 dark:border-zinc-800">
        <div>
          <h1 className="font-sans font-black text-3xl sm:text-4xl tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("dashboard.hello", "Halo")}, {restaurant.ownerId === "demo" ? "Owner " : ""}{restaurant.name} 👋
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-medium">{t("dashboard.welcome", "Selamat datang kembali di dashboard keuangan Anda.")}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl px-5 py-3 text-right self-start sm:self-center shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block uppercase tracking-widest mb-0.5">{t("dashboard.todayDate", "Tanggal Hari Ini")}</span>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
            {formatIndoDate(todayStr, lang)}
          </span>
        </div>
      </div>

      {/* 2. Utama: Hari ini Untung Berapa & Bulan ini Untung Berapa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Profit Hari Ini */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, scale: 1.01 }}
          className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-10px_rgba(0,0,0,0.06)] hover:shadow-lg dark:hover:border-zinc-700 transition-all duration-300 ease-out relative overflow-hidden"
        >
          {/* Accent top border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-2xl" />
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{t("dashboard.profitToday", "Profit Hari Ini")}</span>
            {profitToday > 0 ? (
              <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                <ArrowUpRight className="w-3.5 h-3.5" /> {t("dashboard.filled", "Terisi")}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                {t("dashboard.empty", "Belum diisi")}
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="font-mono text-3xl font-black tracking-tight text-zinc-950 dark:text-white block tabular-nums">
              {formatRupiah(profitToday)}
            </span>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2 block leading-relaxed">
              {t("dashboard.profitTodayDesc", "Laba kotor operasional harian usaha Anda")}
            </span>
          </div>
        </motion.div>

        {/* Card 2: Profit Bulan Ini */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ y: -4, scale: 1.01 }}
          className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-10px_rgba(0,0,0,0.06)] hover:shadow-lg dark:hover:border-zinc-700 transition-all duration-300 ease-out relative overflow-hidden"
        >
          {/* Accent top border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-indigo-400 rounded-t-2xl" />
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{t("dashboard.profitMonth", "Profit Bulan Ini")}</span>
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/50 px-2 py-0.5 rounded-full">
              {t("dashboard.daysEntered", "{count} entri hari").replace("{count}", String(currentMonthProfits.length))}
            </span>
          </div>
          <div className="mt-4">
            <span className="font-mono text-3xl font-black tracking-tight text-zinc-950 dark:text-white block tabular-nums">
              {formatRupiah(totalProfitMonth)}
            </span>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1 block leading-relaxed">
              {t("dashboard.profitMonthDesc", "Akumulasi laba operasional bulan berjalan")}
            </span>

            {/* Real Net Profit Consolidation Breakdown */}
            <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px] font-bold space-y-1 text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>{t("dashboard.fixedCostsLabel", "Biaya Tetap Bulanan:")}</span>
                <span className="font-mono text-rose-600 dark:text-rose-450">-{formatRupiah(totalExpenses)}</span>
              </div>
              <div className="flex justify-between border-t border-dotted border-zinc-100 dark:border-zinc-800/40 pt-1 mt-1 text-zinc-850 dark:text-zinc-200">
                <span>{t("dashboard.netProfitLabel", "Estimasi Laba Murni:")}</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-450">
                  {formatRupiah(totalProfitMonth - totalExpenses)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Target Profit Bulanan */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -4, scale: 1.01 }}
          className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-10px_rgba(0,0,0,0.06)] hover:shadow-lg dark:hover:border-zinc-700 transition-all duration-300 ease-out relative overflow-hidden"
        >
          {/* Accent top border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 to-purple-400 rounded-t-2xl" />
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{t("dashboard.targetProfit", "Target Bulanan")}</span>
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/50 px-2 py-0.5 rounded-full">
              {t("dashboard.goalOwner", "Goal Owner")}
            </span>
          </div>
          <div className="mt-4">
            <span className={`tracking-tight block tabular-nums ${hasTarget ? "font-mono text-3xl font-black text-zinc-950 dark:text-white" : "text-xl font-bold text-zinc-400 dark:text-zinc-500"}`}>
              {hasTarget ? formatRupiah(targetProfit) : t("dashboard.targetNotSet", "Belum Diatur")}
            </span>
            <div className="flex justify-between items-center mt-2 text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
              {hasTarget ? (
                <>
                  <span>{t("dashboard.remaining", "Sisa: ")}</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 font-mono tabular-nums">
                    {formatRupiah(remainingTarget)}
                  </span>
                </>
              ) : (
                <span>{t("dashboard.targetNotSetDesc", "Atur di menu Settings")}</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Card 4: Status Bisnis */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{ y: -4, scale: 1.01 }}
          className={`p-6 rounded-2xl border hover:shadow-lg transition-all duration-300 ease-out ${currentStatus.bgClass} flex flex-col justify-between relative overflow-hidden`}
          style={(currentStatus as any).bgStyle}
        >
          {/* Gold shimmer overlay for amazing status */}
          {businessStatus === "amazing" && (
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: "linear-gradient(105deg, transparent 30%, rgba(255,223,80,0.12) 50%, transparent 70%)",
                animation: "shimmer 3s ease-in-out infinite"
              }}
            />
          )}
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-widest">{t("dashboard.businessStatus", "Status Bisnis")}</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentStatus.indicatorClass}`}
                style={(currentStatus as any).indicatorStyle}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentStatus.indicatorClass}`}
                style={(currentStatus as any).indicatorStyle}
              />
            </span>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              {currentStatus.icon}
              <span
                className={`text-2xl font-black tracking-tight ${currentStatus.textClass}`}
                style={(currentStatus as any).textStyle}
              >
                {currentStatus.label}
              </span>
            </div>
            <p className="text-xs leading-relaxed mt-2.5 opacity-90 font-semibold">
              {currentStatus.message}
            </p>
          </div>
        </motion.div>
      </div>

            {/* 3. Progress Target Profit Card */}
      {hasTarget ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-10px_rgba(0,0,0,0.06)]"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-300 tracking-widest uppercase">{t("dashboard.targetMet", "Progress Pencapaian Target")}</span>
            <span className={`font-mono text-sm font-black px-3 py-1 rounded-full ${
              businessStatus === "green" 
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" 
                : businessStatus === "yellow"
                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
            }`}>
              {progressPercent}%
            </span>
          </div>
          
          {/* Progress Bar Track - taller, more visible */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-950 rounded-full h-3 overflow-hidden border border-zinc-200/30 dark:border-zinc-800/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                businessStatus === "green" 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                  : businessStatus === "yellow"
                  ? "bg-gradient-to-r from-amber-500 to-orange-400"
                  : "bg-gradient-to-r from-rose-500 to-red-400"
              }`}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-3 text-xs text-zinc-500 dark:text-zinc-400 gap-1">
            <p className="font-semibold">
              {t("dashboard.targetProgressText", "Tercapai {actual} dari target {target}").replace("{actual}", formatRupiah(totalProfitMonth)).replace("{target}", formatRupiah(targetProfit))}
            </p>
            <p className="font-bold text-zinc-600 dark:text-zinc-300">
              {remainingTarget > 0 
                ? t("dashboard.remainingTargetText", "{diff} lagi untuk mencapai target.").replace("{diff}", formatRupiah(remainingTarget)) 
                : t("dashboard.targetAchieved", "Selamat! Target profit bulan ini telah tercapai! 🎉")
              }
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 sm:p-5 bg-zinc-50/50 dark:bg-zinc-950/15 rounded-2xl border border-dashed border-zinc-200/60 dark:border-zinc-800/50 flex items-center justify-between gap-4"
        >
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-normal">
            🎯 <strong>{t("dashboard.setTargetTipTitle", "Ingin memantau target pencapaian bulanan?")}</strong><br />
            {t("dashboard.setTargetTipDesc", "Tentukan target laba bersih bulanan Anda di menu Settings untuk memantau progress bar dan status pencapaian.")}
          </div>
        </motion.div>
      )}

      {/* 4. Analisis Detail: Sisa Hari, Target Besok, Prediksi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-10px_rgba(0,0,0,0.06)] hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{t("dashboard.daysRemaining", "Sisa Hari Bulan Ini")}</span>
          <div className="my-4">
            <span className="font-mono text-5xl font-black text-zinc-950 dark:text-white block tracking-tight tabular-nums">
              {daysRemaining}<span className="text-2xl ml-2 font-bold text-zinc-400 dark:text-zinc-500">{t("dashboard.daysUnit", "Hari")}</span>
            </span>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2.5 block leading-relaxed">
              {t("dashboard.daysRemainingDesc", "Dari total {total} hari di bulan ini.").replace("{total}", String(totalDaysInMonth))}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-10px_rgba(0,0,0,0.06)] hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{t("dashboard.targetDaily", "Minimal Profit Harian Mulai Besok")}</span>
          <div className="my-4">
            <span className={`font-mono block tracking-tight tabular-nums ${hasTarget ? "text-4xl font-black text-zinc-950 dark:text-white" : "text-xl font-bold text-zinc-400 dark:text-zinc-500"}`}>
              {hasTarget ? formatRupiah(targetDailyProfitTomorrow) : t("dashboard.targetNotSet", "Belum Diatur")}
            </span>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2.5 block leading-relaxed">
              {hasTarget 
                ? t("dashboard.targetDailyDesc", "Harus tercapai setiap hari agar target bulanan aman.")
                : t("dashboard.noTargetDailyDesc", "Target harian belum ditentukan.")
              }
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-10px_rgba(0,0,0,0.06)] hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{t("dashboard.prediction", "Estimasi Profit Akhir Bulan")}</span>
          <div className="my-4">
            <span className="font-mono text-4xl font-black text-zinc-950 dark:text-white block tracking-tight tabular-nums">
              {formatRupiah(predictionProfit)}
            </span>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2.5 block leading-relaxed">
              {t("dashboard.predictionDesc", "Berdasarkan performa rata-rata harian saat ini ({average}/hari).").replace("{average}", formatRupiah(averageDailyProfit))}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Grafik Trend & Insight Otomatis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Graph Card */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-widest">{t("dashboard.chartTitle", "Trend Profit Harian")}</h3>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1">{t("dashboard.chartTitleDesc", "Grafik pergerakan laba kotor harian bulan ini")}</p>
            </div>
             <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg px-2.5 py-1">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
              <span className="font-semibold">{t("dashboard.averageDailyLabelActive", "Rata-rata (hari buka): {average}/hari").replace("{average}", formatRupiah(averageDailyProfitActive))}</span>
            </div>
          </div>

          <div className="h-[240px] w-full">
            {hasChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/50" />
                  <XAxis 
                    dataKey="label" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#a1a1aa", fontFamily: "monospace", fontWeight: 500 }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${currencySymbol}${val / 1000}k`}
                    tick={{ fontSize: 10, fill: "#a1a1aa", fontFamily: "monospace", fontWeight: 500 }}
                  />
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
                    labelFormatter={(label, items) => {
                      if (items && items[0]) {
                        return items[0].payload.dateFull;
                      }
                      return label;
                    }}
                    formatter={(value: any) => [formatRupiah(Number(value)), t("dashboard.netProfit", "Net Profit")]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Profit Harian" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#profitGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-500 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800/80">
                <HelpCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-500">{t("dashboard.noChartData", "Belum ada data grafik untuk bulan ini.")}</p>
                <p className="text-[10px] mt-1 text-zinc-400">{t("dashboard.noChartDataDesc", "Silakan tambahkan profit harian terlebih dahulu.")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actionable Insight Box */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{t("dashboard.insightTitle", "Insight Otomatis")}</h3>
            </div>

            <div className="space-y-4">
              {/* Insight 1: Progress check */}
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 mt-0.5 shrink-0">
                  {hasTarget ? (businessStatus === "green" ? "✅" : "⚠️") : "💡"}
                </div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  {hasTarget ? (
                    businessStatus === "green" 
                      ? t("dashboard.insightStatusSafe", "Target profit bulanan Anda dalam status aman dan sangat mungkin tercapai.") 
                      : t("dashboard.insightStatusCaution", "Laju profit saat ini kurang optimal untuk mencapai target bulanan {target}.").replace("{target}", formatRupiah(targetProfit))
                  ) : (
                    t("dashboard.insightNoTarget", "Anda belum menetapkan target laba bulanan. Set target di Settings jika ingin memantau sisa pencapaian usaha.")
                  )}
                </div>
              </div>

              {/* Insight 2: Action step */}
              {hasTarget && (
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 mt-0.5 shrink-0">
                    🎯
                  </div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                    {remainingTarget > 0 
                      ? t("dashboard.insightTargetDailyText", "Perlu mencapai minimal {daily} per hari selama sisa {days} hari ke depan.").replace("{daily}", formatRupiah(targetDailyProfitTomorrow)).replace("{days}", String(daysRemaining))
                      : t("dashboard.insightTargetMetText", "Luar biasa! Seluruh target profit bulan ini sudah tercapai sepenuhnya. Semua profit berikutnya adalah bonus bersih.")
                    }
                  </div>
                </div>
              )}

              {/* Insight 3: Prediction projection */}
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 mt-0.5 shrink-0">
                  📈
                </div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  {t("dashboard.insightAverageText", "Dengan rata-rata performa harian Anda sebesar {average}, perkiraan total laba bulan ini adalah {prediction}.").replace("{average}", formatRupiah(averageDailyProfit)).replace("{prediction}", formatRupiah(predictionProfit))}
                </div>
              </div>

              {/* Insight 4: Real Net profit breakdown */}
              <div className="flex items-start gap-3 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 mt-3">
                <div className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 mt-0.5 shrink-0">
                  💡
                </div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  {t("dashboard.insightNetProfitText", "Setelah dikurangi Biaya Tetap sebesar {expenses}, proyeksi laba bersih murni akhir bulan Anda adalah sekitar {net}.").replace("{expenses}", formatRupiah(totalExpenses)).replace("{net}", formatRupiah(Math.max(0, predictionProfit - totalExpenses)))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-center font-medium">
            {t("dashboard.insightFooter", "Pembaruan otomatis tiap input profit harian disimpan.")}
          </div>
        </div>
      </div>
    </div>
  );
}
