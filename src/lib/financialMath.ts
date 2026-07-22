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
    totalDaysInMonth
  };
}
