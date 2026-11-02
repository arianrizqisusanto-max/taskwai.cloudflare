import { DailyProfit, Expenses } from "../types";

/**
 * Shared Financial Math Engine for Taskwai
 * Ensures 100% data accuracy and precision across all components
 * without floating-point rounding discrepancies.
 */

export function calculateTotalExpenses(expenses: Partial<Expenses> | null | undefined): number {
  if (!expenses) return 0;
  
  const sewa = Math.round(Number(expenses.sewaTempat) || 0);
  const gaji = Math.round(Number(expenses.gajiKaryawan) || 0);
  const royalti = Math.round(Number(expenses.royaltiFranchise) || 0);
  const listrik = Math.round(Number(expenses.listrik) || 0);
  const air = Math.round(Number(expenses.air) || 0);
  const internet = Math.round(Number(expenses.internet) || 0);
  const marketing = Math.round(Number(expenses.marketing) || 0);
  const pajak = Math.round(Number(expenses.pajak) || 0);
  const cicilan = Math.round(Number(expenses.cicilanBank) || 0);
  const lain = Math.round(Number(expenses.biayaLain) || 0);

  return sewa + gaji + royalti + listrik + air + internet + marketing + pajak + cicilan + lain;
}

export function calculateDailyProfitBreakdown(item: DailyProfit): {
  omzet: number;
  hppVal: number;
  otherExpenses: number;
  netProfit: number;
  hasBreakdown: boolean;
} {
  const omzet = Math.round(Number(item.omzet) || 0);
  const otherExpenses = Math.round(Number(item.otherExpenses) || 0);
  const hasBreakdown = item.omzet !== undefined && item.omzet !== null;

  let hppVal = 0;
  if (hasBreakdown) {
    if (item.hppType === "percentage") {
      const pct = Number(item.hppVal) || 0;
      hppVal = Math.round((omzet * pct) / 100);
    } else {
      hppVal = Math.round(Number(item.hppVal) || 0);
    }
  }

  const netProfit = hasBreakdown
    ? omzet - hppVal - otherExpenses
    : Math.round(Number(item.profit) || 0);

  return {
    omzet,
    hppVal,
    otherExpenses,
    netProfit,
    hasBreakdown
  };
}

export function calculateMonthlySummary(
  profits: DailyProfit[],
  expenses: Partial<Expenses> | null | undefined,
  targetProfit: number,
  currentYear: number,
  currentMonth: number, // 0-indexed
  currentDateNum: number
) {
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const monthProfits = profits.filter(p => p.date && p.date.startsWith(currentMonthPrefix));

  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDateNum);

  const totalProfitMonth = monthProfits.reduce((acc, curr) => {
    const breakdown = calculateDailyProfitBreakdown(curr);
    return acc + breakdown.netProfit;
  }, 0);

  const totalExpenses = calculateTotalExpenses(expenses);
  const target = Math.round(Number(targetProfit) || 0);
  const remainingTarget = Math.max(0, target - totalProfitMonth);

  const progressPercent = target > 0 ? Math.min(100, Math.round((totalProfitMonth / target) * 100)) : 0;

  const uniqueDaysEntered = new Set(monthProfits.map(p => p.date)).size;
  const averageDailyProfitActive = uniqueDaysEntered > 0 ? Math.round(totalProfitMonth / uniqueDaysEntered) : 0;

  const averageDailyProfit = currentDateNum > 0 ? Math.round(totalProfitMonth / currentDateNum) : 0;
  const predictionProfit = Math.round(averageDailyProfit * totalDaysInMonth);
  const targetDailyProfitTomorrow = remainingTarget > 0 ? Math.round(remainingTarget / daysRemaining) : 0;

  // Target Harian Prorata Kumulatif (Daily Benchmark)
  const idealDailyTarget = totalDaysInMonth > 0 ? Math.round(target / totalDaysInMonth) : 0;
  const expectedTargetToDate = idealDailyTarget * currentDateNum;
  const targetPacePercent = expectedTargetToDate > 0 ? Math.round((totalProfitMonth / expectedTargetToDate) * 100) : 0;

  return {
    monthProfits,
    totalProfitMonth,
    totalExpenses,
    remainingTarget,
    progressPercent,
    averageDailyProfit,
    averageDailyProfitActive,
    predictionProfit,
    targetDailyProfitTomorrow,
    daysRemaining,
    totalDaysInMonth,
    idealDailyTarget,
    expectedTargetToDate,
    targetPacePercent
  };
}

/**
 * Evaluates business status based on daily run-rate benchmark (target kumulatif harian).
 * Opsi A: Jika laba tertinggal dari target kumulatif harian, berikan peringatan "Waspada" (Kuning).
 * Status hanya menjadi "Bahaya" (Merah) jika sudah paruh akhir bulan dan beban melonjak ekstrem.
 */
export function determineBusinessStatus(params: {
  totalProfitMonth: number;
  targetProfit: number;
  targetDailyProfitTomorrow: number;
  idealDailyTarget: number;
  expectedTargetToDate: number;
  currentDateNum?: number;
  totalDaysInMonth?: number;
}): "amazing" | "excellent" | "green" | "yellow" | "red" {
  const {
    totalProfitMonth,
    targetProfit,
    targetDailyProfitTomorrow,
    idealDailyTarget,
    expectedTargetToDate,
    currentDateNum = 1,
    totalDaysInMonth = 30
  } = params;

  if (targetProfit <= 0) return "green";

  // Rasio Pace terhadap Target Kumulatif s/d hari ini (contoh: tgl 3 target 6jt, dapat 9jt = 1.5 / 150%)
  const paceRatio = expectedTargetToDate > 0 ? totalProfitMonth / expectedTargetToDate : 0;

  // Rasio beban harian mulai besok vs target harian standar
  // (contoh: target harian 2jt, besok butuh 2,1jt = 1.05 / 105%)
  const burdenRatio = idealDailyTarget > 0 ? targetDailyProfitTomorrow / idealDailyTarget : 1;

  // 1. Luar Biasa (Amazing): Laba melampaui >= 150% dari target kumulatif harian
  if (paceRatio >= 1.5) {
    return "amazing";
  }

  // 2. Sangat Baik (Excellent): Laba melampaui >= 115% dari target kumulatif harian
  if (paceRatio >= 1.15) {
    return "excellent";
  }

  // 3. Aman (Green / On Track): Laba berjalan tepat waktu >= 90% dari target kumulatif harian
  if (paceRatio >= 0.90) {
    return "green";
  }

  // 4. Di bawah 90% (Tertinggal dari target kumulatif harian):
  // Menjadi "Bahaya" jika sudah paruh kedua bulan (> 15 hari) DAN beban melonjak tajam (> 150%) DAN pace < 60%
  const isLateMonth = currentDateNum > Math.floor(totalDaysInMonth * 0.5);
  const isExtremeBurden = burdenRatio > 1.5;

  if (isLateMonth && isExtremeBurden && paceRatio < 0.6) {
    return "red";
  }

  // Opsi A: Tertinggal target harian, status Waspada (Kuning)
  return "yellow";
}
