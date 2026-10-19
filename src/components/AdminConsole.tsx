import React, { useState, useEffect } from "react";
import { DataService } from "../lib/dataService";
import { Store, RotateCw, ShieldCheck, Activity, TrendingUp, Cpu, Server, Wifi, Users, Search, ChevronLeft, ChevronRight, Calendar, Mail, Building2, Crown, Sparkles } from "lucide-react";
import { useToast } from "./Toast";
import { formatIndoDate } from "../lib/utils";

interface SystemStats {
  totalRestaurants: number;
  activeTodayCount: number;
  totalBigBoss?: number;
  activeBigBoss?: number;
}

interface AdminUserItem {
  id: string;
  email: string;
  ownerName: string;
  picture?: string;
  createdAt: string;
  accountType?: string;
  restaurantName?: string;
  restaurantId?: string;
  lastActiveProfitDate?: string;
  lastLoginDate?: string;
}

export default function AdminConsole() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  // Users List & Pagination States
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Debounce search input (350ms) to prevent unnecessary API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await DataService.getAdminUsers(page, 15, debouncedQuery);
      setUsers(res.users);
      setTotalUsers(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Gagal memuat daftar pengguna.", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedQuery]);

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

  const totalBB = stats?.totalBigBoss || 0;
  const activeBB = stats?.activeBigBoss || 0;
  const bbEngagement = totalBB > 0 ? ((activeBB / totalBB) * 100).toFixed(1) : "0.0";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6 stroke-[2.25]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-black text-xl sm:text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
                Master Admin Console
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                Super Admin
              </span>
            </div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5 tracking-wide flex items-center gap-1.5">
              <span>Platform Owner:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">arianrisqi@gmail.com</strong>
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            fetchStats(true);
            fetchUsers();
          }}
          disabled={refreshing || loadingUsers}
          className="flex items-center gap-2 self-start sm:self-center px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          title="Refresh Data"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing || loadingUsers ? "animate-spin" : ""}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Registered Accounts */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 self-start">
            <Store className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Total Usaha</span>
            <span className="font-mono text-xl font-black text-zinc-950 dark:text-white block mt-0.5">
              {total}
            </span>
          </div>
        </div>

        {/* Active Today */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 self-start">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Aktif Hari Ini</span>
            <span className="font-mono text-xl font-black text-zinc-950 dark:text-white block mt-0.5">
              {active}
            </span>
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 self-start">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Keaktifan</span>
            <span className="font-mono text-xl font-black text-zinc-950 dark:text-white block mt-0.5">
              {engagementRate}%
            </span>
          </div>
        </div>

        {/* Total Big Boss */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 self-start">
            <Crown className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Big Boss</span>
            <span className="font-mono text-xl font-black text-zinc-950 dark:text-white block mt-0.5">
              {totalBB}
            </span>
          </div>
        </div>

        {/* Active Big Boss */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 self-start">
            <Activity className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">BB Aktif</span>
            <span className="font-mono text-xl font-black text-zinc-950 dark:text-white block mt-0.5">
              {activeBB}
            </span>
          </div>
        </div>

        {/* Latency */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 self-start">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Latensi D1</span>
            <span className="font-mono text-xl font-black text-zinc-950 dark:text-white block mt-0.5">
              {latency !== null ? `${latency}ms` : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Section: Registered Users List Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/70 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Table Header & Search Bar */}
        <div className="p-5 border-b border-zinc-150 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-zinc-50/50 to-white dark:from-zinc-900 dark:to-zinc-900">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">
                Daftar Pengguna Terdaftar
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
              Total <strong className="text-zinc-900 dark:text-white font-mono">{totalUsers}</strong> akun terhubung ke Cloud Database.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari email atau nama usaha..."
              className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-950/40 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <th className="py-3 px-4">Pengguna / Pemilik</th>
                <th className="py-3 px-4">Nama Usaha</th>
                <th className="py-3 px-4">Tipe Akun</th>
                <th className="py-3 px-4">Tanggal Daftar</th>
                <th className="py-3 px-4">Aktivitas Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {loadingUsers ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <RotateCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-2" />
                    <span className="font-semibold text-xs">Memuat daftar pengguna...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <p className="font-semibold text-sm text-zinc-500 dark:text-zinc-400">Tidak ada pengguna ditemukan.</p>
                    {searchQuery && (
                      <p className="text-xs text-zinc-400 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((item, idx) => {
                  const isMaster = item.email === "arianrisqi@gmail.com";
                  const isBB = item.accountType === "bigboss";
                  return (
                    <tr 
                      key={item.id || idx}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Column 1: User / Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.picture ? (
                            <img
                              src={item.picture}
                              alt={item.ownerName || "Avatar"}
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {(item.ownerName || item.email || "U")[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate block">
                                {item.ownerName || "Tanpa Nama"}
                              </span>
                              {isMaster && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  Owner App
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate block">
                              {item.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Restaurant Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {item.restaurantName || "Belum ada nama usaha"}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Account Type */}
                      <td className="py-3 px-4">
                        {isBB ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                            <Crown className="w-3 h-3" /> Big Boss
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            Reguler
                          </span>
                        )}
                      </td>

                      {/* Column 4: Register Date */}
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                        {item.createdAt ? item.createdAt.substring(0, 10) : "-"}
                      </td>

                      {/* Column 5: Last Active */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {item.lastActiveProfitDate ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Input {item.lastActiveProfitDate}
                          </span>
                        ) : item.lastLoginDate ? (
                          <span className="text-zinc-400">
                            Login {item.lastLoginDate.substring(0, 10)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-950/30 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 font-medium">
            Halaman <strong className="text-zinc-900 dark:text-white font-mono">{page}</strong> dari <strong className="text-zinc-900 dark:text-white font-mono">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || loadingUsers}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loadingUsers}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

