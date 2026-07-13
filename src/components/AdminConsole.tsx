import React, { useState, useEffect } from "react";
import { DataService } from "../lib/dataService";
import { Store, RotateCw, ShieldCheck } from "lucide-react";
import { useToast } from "./Toast";

interface SystemStats {
  totalRestaurants: number;
  restaurants: { id: string; name: string }[];
}

export default function AdminConsole() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await DataService.getSystemStats();
      setStats(data);
      if (isRefresh) {
        showToast("Data berhasil diperbarui!", "success");
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

      {/* Total Active Accounts Card */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm flex items-center gap-4">
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
          <Store className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total Akun Terdaftar</span>
          <span className="font-mono text-3xl font-black text-zinc-950 dark:text-white block mt-1">
            {stats?.totalRestaurants || 0} Usaha
          </span>
        </div>
      </div>

      {/* Simple List Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Daftar Nama Usaha</h2>
        
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
          {stats?.restaurants && stats.restaurants.length > 0 ? (
            stats.restaurants.map((r, i) => (
              <div key={r.id || i} className="py-3 flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-900 dark:text-white">{r.name}</span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider font-mono">Toko #{i + 1}</span>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-zinc-400 italic">Belum ada toko terdaftar.</div>
          )}
        </div>
      </div>
    </div>
  );
}
