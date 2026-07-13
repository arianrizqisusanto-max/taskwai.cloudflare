import React, { useState, useEffect } from "react";
import { DataService } from "../lib/dataService";
import { formatRupiah } from "../lib/utils";
import { Store, FileText, Users, RotateCw, ShieldAlert, CheckCircle2, Search } from "lucide-react";
import { useToast } from "./Toast";

interface SystemStats {
  totalRestaurants: number;
  totalProfitLogs: number;
  activeStaffSessions: number;
  restaurants: { id: string; name: string; ownerId: string; monthlyTargetProfit: number; staffUsername?: string; staffActive?: boolean }[];
}

export default function AdminConsole() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await DataService.getSystemStats();
      setStats(data);
      if (isRefresh) {
        showToast("Data sistem berhasil diperbarui!", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat data statistik sistem.", "error");
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RotateCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-sm text-zinc-500 font-bold">Memuat Dashboard Master Admin...</span>
      </div>
    );
  }

  const filteredRestaurants = stats?.restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.ownerId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="font-sans font-bold text-3xl tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-emerald-500" />
            Master Admin Console
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5 font-medium">
            Sistem pengawasan server SaaS Taskwai.com secara real-time.
          </p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50 self-start sm:self-center uppercase tracking-wider"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Restaurants */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total Usaha (SaaS)</span>
            <span className="font-mono text-3xl font-extrabold text-zinc-950 dark:text-white block mt-1">
              {stats?.totalRestaurants || 0}
            </span>
          </div>
        </div>

        {/* Total Profit Logs */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total Riwayat Profit</span>
            <span className="font-mono text-3xl font-extrabold text-zinc-950 dark:text-white block mt-1">
              {stats?.totalProfitLogs || 0}
            </span>
          </div>
        </div>

        {/* Active Staff Sessions */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Staff Online (Aktif)</span>
            <span className="font-mono text-3xl font-extrabold text-zinc-950 dark:text-white block mt-1">
              {stats?.activeStaffSessions || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-black text-zinc-950 dark:text-zinc-50 tracking-tight">Daftar Akun Usaha Terdaftar</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium">Informasi mendalam tentang semua tenant di sistem database.</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-450 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Cari nama, ID, atau owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-600 text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </div>

        {/* Table layout */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Nama Usaha</th>
                <th className="py-3 px-4">Restaurant ID</th>
                <th className="py-3 px-4">Owner UID</th>
                <th className="py-3 px-4 text-right">Target Laba</th>
                <th className="py-3 px-4 text-center">Status Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {filteredRestaurants.length > 0 ? (
                filteredRestaurants.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 text-zinc-800 dark:text-zinc-200 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-950 dark:text-white">{r.name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-450 dark:text-zinc-500">{r.id}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-450 dark:text-zinc-500 truncate max-w-[140px]">{r.ownerId}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(r.monthlyTargetProfit)}</td>
                    <td className="py-3.5 px-4 text-center">
                      {r.staffUsername ? (
                        r.staffActive !== false ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            {r.staffUsername}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            🔒 Nonaktif
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">Belum dibuat</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 dark:text-zinc-500 italic">
                    Tidak ada hasil pencocokan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
