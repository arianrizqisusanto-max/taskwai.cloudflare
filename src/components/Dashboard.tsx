import { DailyProfit, Expenses, Restaurant } from "../types";
import { formatIndoDate, formatRupiah } from "../lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, HelpCircle, CheckCircle, AlertTriangle, AlertOctagon, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  restaurant: Restaurant;
  profits: DailyProfit[];
  expenses: Expenses;
}

export default function Dashboard({ restaurant, profits, expenses }: DashboardProps) {
  // 1. Core Date Setup
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDateNum = today.getDate();
  const todayStr = today.toISOString().split("T")[0];

  // Number of days in current month
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Hari Tersisa (including today or starting tomorrow)
  // Let's count remaining days starting tomorrow (besok):
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDateNum);

  // 2. Filter profits of the CURRENT month only for calculations
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const currentMonthProfits = profits.filter(p => p.date.startsWith(currentMonthPrefix));

  // Profit Hari Ini
  const todayEntry = currentMonthProfits.find(p => p.date === todayStr);
  const profitToday = todayEntry ? todayEntry.profit : 0;

  // Profit Bulan Ini (Sum of daily profits)
  const totalProfitMonth = currentMonthProfits.reduce((acc, curr) => acc + curr.profit, 0);

  // Total Fixed Expenses (Biaya Tetap)
  const totalExpenses = 
    expenses.sewaTempat +
    expenses.gajiKaryawan +
    expenses.royaltiFranchise +
    expenses.listrik +
    expenses.air +
    expenses.internet +
    expenses.marketing +
    expenses.pajak +
    expenses.biayaLain;

  // Target Profit Bulanan (Laba Bersih yang diinginkan owner)
  const targetProfit = restaurant.monthlyTargetProfit;

  // Sisa Target
  const remainingTarget = Math.max(0, targetProfit - totalProfitMonth);

  // Progress Percentage
  const progressPercent = targetProfit > 0 ? Math.min(100, Math.round((totalProfitMonth / targetProfit) * 100)) : 0;

  // Average Daily Profit based on entries entered so far
  const daysEnteredCount = currentMonthProfits.length;
  const averageDailyProfit = daysEnteredCount > 0 ? totalProfitMonth / daysEnteredCount : 0;

  // Prediksi Profit Akhir Bulan
  const predictionProfit = averageDailyProfit * totalDaysInMonth;

  // Target Profit Harian Mulai Besok
  const targetDailyProfitTomorrow = remainingTarget > 0 ? remainingTarget / daysRemaining : 0;

  // 3. Status Bisnis Definition
  // Hijau: Prediksi >= Target
  // Kuning: Prediksi >= Target * 0.85 && Prediksi < Target (Dekat target)
  // Merah: Prediksi < Target * 0.85 (Jauh dari target)
  let businessStatus: "green" | "yellow" | "red" = "green";
  if (predictionProfit >= targetProfit) {
    businessStatus = "green";
  } else if (predictionProfit >= targetProfit * 0.85) {
    businessStatus = "yellow";
  } else {
    businessStatus = "red";
  }

  const statusConfigs = {
    green: {
      label: "Aman",
      bgClass: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-100 shadow-[0_1px_3px_rgba(16,185,129,0.03)]",
      indicatorClass: "bg-emerald-500",
      textClass: "text-emerald-600 dark:text-emerald-400",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      message: "Target bulan ini masih aman di jalur yang benar. Pertahankan performa restoran Anda!"
    },
    yellow: {
      label: "Waspada",
      bgClass: "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30 text-amber-900 dark:text-amber-100 shadow-[0_1px_3px_rgba(245,158,11,0.03)]",
      indicatorClass: "bg-amber-500",
      textClass: "text-amber-600 dark:text-amber-400",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      message: `Profit harian perlu naik sekitar ${formatRupiah(Math.max(0, targetDailyProfitTomorrow - averageDailyProfit))} agar target tercapai.`
    },
    red: {
      label: "Bahaya",
      bgClass: "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/30 text-rose-900 dark:text-rose-100 shadow-[0_1px_3px_rgba(244,63,94,0.03)]",
      indicatorClass: "bg-rose-500",
      textClass: "text-rose-600 dark:text-rose-400",
      icon: <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      message: "Kinerja profit saat ini jauh di bawah target bulanan. Perlu optimasi penjualan atau efisiensi biaya segera."
    }
  };

  const currentStatus = statusConfigs[businessStatus];

  // 4. Data for Chart (Daily logs sorted by date ascending)
  const chartData = [...currentMonthProfits]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(p => {
      // Format to short date "DD/MM"
      const parts = p.date.split("-");
      const day = parts[2];
      const month = parts[1];
      return {
        dateFull: formatIndoDate(p.date),
        label: `${day}/${month}`,
        "Profit Harian": p.profit,
      };
    });

  // Fallback if chartData is empty
  const hasChartData = chartData.length > 0;

  return (
    <div className="space-y-8">
      {/* 1. Greeting & Date Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="font-sans font-bold text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">
            Halo, {restaurant.ownerId === "demo" ? "Owner " : ""}{restaurant.name}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5 font-medium">Selamat datang kembali di dashboard keuangan Anda.</p>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2 text-right self-start sm:self-center">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">Tanggal Hari Ini</span>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
            {formatIndoDate(todayStr)}
          </span>
        </div>
      </div>

      {/* 2. Utama: Hari ini Untung Berapa & Bulan ini Untung Berapa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Profit Hari Ini */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3 }}
          className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] hover:shadow-md dark:hover:border-zinc-700 transition-all duration-300 ease-out relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Profit Hari Ini</span>
            {profitToday > 0 ? (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                <ArrowUpRight className="w-3.5 h-3.5" /> Terisi
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                Belum diisi
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="font-mono text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white block">
              {formatRupiah(profitToday)}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 block leading-relaxed">
              Laba kotor operasional harian restoran Anda
            </span>
          </div>
        </motion.div>

        {/* Card 2: Profit Bulan Ini */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ y: -3 }}
          className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] hover:shadow-md dark:hover:border-zinc-700 transition-all duration-300 ease-out"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Profit Bulan Ini</span>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/50 px-2 py-0.5 rounded-full">
              {daysEnteredCount} entri hari
            </span>
          </div>
          <div className="mt-4">
            <span className="font-mono text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white block">
              {formatRupiah(totalProfitMonth)}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 block leading-relaxed">
              Akumulasi laba operasional bulan berjalan
            </span>
          </div>
        </motion.div>

        {/* Card 3: Target Profit Bulanan */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -3 }}
          className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] hover:shadow-md dark:hover:border-zinc-700 transition-all duration-300 ease-out"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Target Bulanan</span>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/50 px-2 py-0.5 rounded-full">
              Goal Owner
            </span>
          </div>
          <div className="mt-4">
            <span className="font-mono text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white block">
              {formatRupiah(targetProfit)}
            </span>
            <div className="flex justify-between items-center mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              <span>Sisa: </span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                {formatRupiah(remainingTarget)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Status Bisnis */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{ y: -3 }}
          className={`p-6 rounded-2xl border hover:shadow-md transition-all duration-300 ease-out ${currentStatus.bgClass} flex flex-col justify-between`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider">Status Bisnis</span>
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentStatus.indicatorClass}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${currentStatus.indicatorClass}`}></span>
            </span>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              {currentStatus.icon}
              <span className={`text-2xl font-black tracking-tight ${currentStatus.textClass}`}>
                {currentStatus.label}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed mt-2 opacity-90 font-medium">
              {currentStatus.message}
            </p>
          </div>
        </motion.div>
      </div>

      {/* 3. Progress Target Profit Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]"
      >
        <div className="flex justify-between items-center mb-3.5">
          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight uppercase">Progress Pencapaian Target</span>
          <span className="font-mono text-lg font-black text-zinc-950 dark:text-white">{progressPercent}%</span>
        </div>
        
        {/* Progress Bar Track */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-950 rounded-full h-3.5 overflow-hidden p-0.5 border border-zinc-200/40 dark:border-zinc-800/80">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${
              businessStatus === "green" 
                ? "bg-zinc-900 dark:bg-zinc-100" 
                : businessStatus === "yellow"
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-4 text-xs text-zinc-500 dark:text-zinc-400 gap-2">
          <p className="font-medium">
            Tercapai <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatRupiah(totalProfitMonth)}</span> dari target <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatRupiah(targetProfit)}</span>
          </p>
          <p className="font-semibold text-zinc-400 dark:text-zinc-500">
            {remainingTarget > 0 ? `${formatRupiah(remainingTarget)} lagi untuk mencapai target.` : "Selamat! Target profit bulan ini telah tercapai! 🎉"}
          </p>
        </div>
      </motion.div>

      {/* 4. Analisis Detail: Sisa Hari, Target Besok, Prediksi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between">
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Sisa Hari Bulan Ini</span>
          <div className="my-4">
            <span className="font-mono text-4xl font-black text-zinc-950 dark:text-white block tracking-tight">
              {daysRemaining} Hari
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 block leading-relaxed font-medium">
              Dari total {totalDaysInMonth} hari di bulan ini.
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between">
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Minimal Profit Harian Mulai Besok</span>
          <div className="my-4">
            <span className="font-mono text-4xl font-black text-zinc-950 dark:text-white block tracking-tight">
              {formatRupiah(targetDailyProfitTomorrow)}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 block leading-relaxed font-medium">
              Harus tercapai setiap hari agar target bulanan aman.
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between">
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Estimasi Profit Akhir Bulan</span>
          <div className="my-4">
            <span className="font-mono text-4xl font-black text-zinc-950 dark:text-white block tracking-tight">
              {formatRupiah(predictionProfit)}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 block leading-relaxed font-medium">
              Berdasarkan performa rata-rata harian saat ini ({formatRupiah(averageDailyProfit)}/hari).
            </span>
          </div>
        </div>
      </div>

      {/* 5. Grafik Trend & Insight Otomatis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Graph Card */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Trend Profit Harian</h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium">Grafik pergerakan laba kotor harian bulan ini</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg px-2.5 py-1">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
              <span className="font-semibold">Rata-rata: {formatRupiah(averageDailyProfit)}/hari</span>
            </div>
          </div>

          <div className="h-[240px] w-full">
            {hasChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="currentColor" stopOpacity={0.08} className="text-zinc-900 dark:text-zinc-100" />
                      <stop offset="95%" stopColor="currentColor" stopOpacity={0.0} className="text-zinc-900 dark:text-zinc-100" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-100 dark:text-zinc-800/30" />
                  <XAxis 
                    dataKey="label" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#a1a1aa", fontFamily: "monospace", fontWeight: 500 }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `Rp${val / 1000}k`}
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
                    formatter={(value: any) => [formatRupiah(Number(value)), "Laba Kotor"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Profit Harian" 
                    stroke="currentColor" 
                    className="text-zinc-950 dark:text-zinc-50"
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#profitGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-500 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800/80">
                <HelpCircle className="w-8 h-8 text-zinc-350 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-500">Belum ada data grafik untuk bulan ini.</p>
                <p className="text-[10px] mt-1 text-zinc-400">Silakan tambahkan profit harian terlebih dahulu.</p>
              </div>
            )}
          </div>
        </div>

        {/* Actionable Insight Box */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Insight Otomatis</h3>
            </div>

            <div className="space-y-4">
              {/* Insight 1: Progress check */}
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 mt-0.5 shrink-0">
                  {businessStatus === "green" ? "✅" : "⚠️"}
                </div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  {businessStatus === "green" 
                    ? "Target profit bulanan Anda dalam status aman dan sangat mungkin tercapai." 
                    : `Laju profit saat ini kurang optimal untuk mencapai target bulanan ${formatRupiah(targetProfit)}.`
                  }
                </div>
              </div>

              {/* Insight 2: Action step */}
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 mt-0.5 shrink-0">
                  🎯
                </div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  {remainingTarget > 0 
                    ? `Perlu mencapai minimal ${formatRupiah(targetDailyProfitTomorrow)} per hari selama sisa ${daysRemaining} hari ke depan.`
                    : "Luar biasa! Seluruh target profit bulan ini sudah tercapai sepenuhnya. Semua profit berikutnya adalah bonus bersih."
                  }
                </div>
              </div>

              {/* Insight 3: Prediction projection */}
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 mt-0.5 shrink-0">
                  📈
                </div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  Dengan rata-rata performa harian Anda sebesar <span className="font-bold text-zinc-950 dark:text-white">{formatRupiah(averageDailyProfit)}</span>, perkiraan total laba bulan ini adalah <span className="font-bold text-zinc-950 dark:text-white">{formatRupiah(predictionProfit)}</span>.
                </div>
              </div>

              {/* Insight 4: Real Net profit breakdown */}
              <div className="flex items-start gap-3 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 mt-3">
                <div className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 mt-0.5 shrink-0">
                  💡
                </div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  Setelah dikurangi Biaya Tetap sebesar <span className="font-bold text-zinc-950 dark:text-white">{formatRupiah(totalExpenses)}</span>, proyeksi laba bersih murni akhir bulan Anda adalah sekitar <span className="font-black text-zinc-950 dark:text-white">{formatRupiah(Math.max(0, predictionProfit - totalExpenses))}</span>.
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-center font-medium">
            Pembaruan otomatis tiap input profit harian disimpan.
          </div>
        </div>
      </div>
    </div>
  );
}
