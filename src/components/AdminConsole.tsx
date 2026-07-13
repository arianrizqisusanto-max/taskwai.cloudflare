import React, { useState, useEffect } from "react";
import { DataService } from "../lib/dataService";
import { Store, RotateCw, ShieldCheck, Activity, TrendingUp, Cpu, Server, Wifi } from "lucide-react";
import { useToast } from "./Toast";

interface SystemStats {
  totalRestaurants: number;
  activeTodayCount: number;
}

export default function AdminConsole() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const startTime = performance.now();

    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const data = await DataService.getSystemStats(todayStr);
      
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setStats(data);
      
      if (isRefresh) {
        showToast("Statistik platform diperbarui!", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat data sistem.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <RotateCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-sm text-zinc-500 font-bold">Memuat Admin Console...</span>
      </div>
    );
  }

  // Calculate Engagement Rate
  const total = stats?.totalRestaurants || 0;
  const active = stats?.activeTodayCount || 0;
  const engagementRate = total > 0 ? ((active / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <h1 className="font-sans font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
            Admin Console
          </h1>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-zinc-200/40 dark:border-zinc-800 transition-all cursor-pointer bg-white dark:bg-zinc-900 disabled:opacity-50"
          title="Refresh Data"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Registered Accounts */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm flex flex-col gap-2">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 self-start">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Total Usaha</span>
            <span className="font-mono text-lg font-black text-zinc-950 dark:text-white block mt-0.5">
              {total}
            </span>
          </div>
        </div>

        {/* Active Today */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm flex flex-col gap-2">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 self-start">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Aktif Hari Ini</span>
            <span className="font-mono text-lg font-black text-zinc-950 dark:text-white block mt-0.5">
              {active}
            </span>
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm flex flex-col gap-2">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 self-start">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Keaktifan</span>
            <span className="font-mono text-lg font-black text-zinc-950 dark:text-white block mt-0.5">
              {engagementRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Platform Status Console */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-500" />
            Status Operasional Platform
          </h2>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Metrik kesehatan server dan latensi respon database secara real-time.</p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Firestore Connection */}
          <div className="flex items-center justify-between text-xs border-b border-zinc-50 dark:border-zinc-800/40 pb-2.5">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-semibold">
              <Server className="w-3.5 h-3.5 text-zinc-400" />
              <span>Database Cloud (Firestore)</span>
            </div>
            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Normal
            </span>
          </div>

          {/* Latency */}
          <div className="flex items-center justify-between text-xs border-b border-zinc-50 dark:border-zinc-800/40 pb-2.5">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-semibold">
              <Wifi className="w-3.5 h-3.5 text-zinc-400" />
              <span>Latensi Koneksi</span>
            </div>
            <span className="font-mono font-bold text-zinc-900 dark:text-white">
              {latency !== null ? `${latency} ms` : "Menghitung..."}
            </span>
          </div>

          {/* Platform Version */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Keamanan Aturan Firestore</span>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Aktif (Live)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
