import React, { useState, useEffect } from "react";
import { DataService } from "../lib/dataService";
import { formatRupiah } from "../lib/utils";
import { useTranslation } from "../lib/LanguageContext";
import { useToast } from "./Toast";
import { 
  Building2, Plus, Trash2, ArrowLeft, TrendingUp, DollarSign, Award, Sparkles, 
  CheckCircle, AlertTriangle, AlertOctagon, HelpCircle, Sun, Moon 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import TaskwaiLogo from "./TaskwaiLogo";

interface BranchData {
  id: string;
  name: string;
  monthlyTargetProfit: number;
  totalProfitMonth: number;
  profitToday: number;
  daysEntered: number;
  totalExpenses: number;
}

const MOCK_DEMO_BRANCHES: BranchData[] = [
  {
    id: "demo_br_1",
    name: "Cabang Jakarta (Pusat)",
    monthlyTargetProfit: 50000000,
    totalProfitMonth: 62000000,
    profitToday: 2500000,
    daysEntered: 18,
    totalExpenses: 15000000
  },
  {
    id: "demo_br_2",
    name: "Cabang Bandung",
    monthlyTargetProfit: 40000000,
    totalProfitMonth: 68000000,
    profitToday: 3800000,
    daysEntered: 18,
    totalExpenses: 12000000
  },
  {
    id: "demo_br_3",
    name: "Cabang Surabaya",
    monthlyTargetProfit: 60000000,
    totalProfitMonth: 25000000,
    profitToday: 1100000,
    daysEntered: 18,
    totalExpenses: 18500000
  }
];

interface BigBossProps {
  setActiveTab: (tab: string) => void;
  isDark: boolean;
  toggleDark: () => void;
}

export default function BigBoss({ setActiveTab, isDark, toggleDark }: BigBossProps) {
  const { t, currency } = useTranslation();
  const { showToast } = useToast();
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authCodeInput, setAuthCodeInput] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkingError, setLinkingError] = useState("");

  // Isolated session state for Big Boss mode
  const [user, setUser] = useState<any | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const formatLocale = currency === "dollar" ? "en-US" : "id-ID";

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const data = await DataService.getBigBossBranches();
      setBranches(data.branches || []);
    } catch (err: any) {
      console.error(err);
      showToast("Gagal memuat data cabang gabungan.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterDemoMode = () => {
    sessionStorage.setItem("taskwai_bigboss_is_demo", "true");
    setUser({
      email: "demo_bigboss@taskwai.com",
      uid: "demo_bigboss",
      isDemo: true
    });
    setBranches(MOCK_DEMO_BRANCHES);
    showToast("Memasuki dasbor gabungan dalam Mode Demo!", "info");
  };

  const handleGoogleLoginResponse = async (response: any) => {
    try {
      const idToken = response.credential;
      const data = await DataService.loginGoogle(idToken);
      setUser(data.user);
      showToast("Berhasil masuk ke dasbor Big Boss!", "success");
    } catch (error: any) {
      console.error("Login error:", error);
      showToast("Gagal masuk dengan Google.", "error");
    }
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("taskwai_bigboss_is_demo");
      if (!user?.isDemo) {
        await DataService.logout();
      }
      setUser(null);
      showToast("Berhasil keluar dari dasbor Big Boss.", "success");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isDemoSession = sessionStorage.getItem("taskwai_bigboss_is_demo") === "true";
        if (isDemoSession) {
          setUser({
            email: "demo_bigboss@taskwai.com",
            uid: "demo_bigboss",
            isDemo: true
          });
          setBranches(MOCK_DEMO_BRANCHES);
          setLoading(false);
          setAuthInitialized(true);
          return;
        }

        const data = await DataService.getMe();
        if (data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAuthInitialized(true);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && !user.isDemo) {
      fetchBranches();
    }
  }, [user]);

  useEffect(() => {
    if (authInitialized && user?.isDemo) {
      const timer = setTimeout(() => {
        const google = (window as any).google;
        if (google) {
          google.accounts.id.initialize({
            client_id: "888780289762-bnd08vbfkspqg2o9iif8bcr91a92jsh5.apps.googleusercontent.com",
            callback: handleGoogleLoginResponse
          });
          google.accounts.id.renderButton(
            document.getElementById("bigboss-header-google-signin-button"),
            { 
              theme: "outline", 
              size: "medium", 
              width: 170,
              shape: "pill",
              text: "signin_with"
            }
          );
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [authInitialized, user]);

  const handleLinkBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCodeInput.trim()) return;

    setIsLinking(true);
    setLinkingError("");

    if (user?.isDemo) {
      const code = authCodeInput.trim().toUpperCase();
      if (code === "DEMO-YOGYA") {
        if (branches.some(b => b.id === "demo_br_4")) {
          setLinkingError("Cabang Yogyakarta sudah ditambahkan.");
          setIsLinking(false);
          return;
        }
        setTimeout(() => {
          setBranches([
            ...branches,
            {
              id: "demo_br_4",
              name: "Cabang Yogyakarta",
              monthlyTargetProfit: 35000000,
              totalProfitMonth: 44000000,
              profitToday: 1800000,
              daysEntered: 18,
              totalExpenses: 8000000
            }
          ]);
          setIsLinking(false);
          setAuthCodeInput("");
          showToast("Cabang Yogyakarta berhasil ditambahkan dalam Mode Demo!", "success");
        }, 800);
      } else {
        setIsLinking(false);
        setLinkingError("Untuk simulasi, silakan masukkan kode: DEMO-YOGYA");
      }
      return;
    }

    try {
      await DataService.linkBigBossBranch(authCodeInput.trim());
      showToast("Cabang berhasil ditambahkan!", "success");
      setAuthCodeInput("");
      fetchBranches();
    } catch (err: any) {
      console.error(err);
      setLinkingError(err.message || "Gagal menghubungkan cabang. Periksa kembali kode Anda.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkBranch = async (restaurantId: string, name: string) => {
    if (!confirm(`${t("bigboss.unlinkConfirm", "Apakah Anda yakin ingin menghapus cabang ini dari pantauan?")} (${name})`)) {
      return;
    }

    if (user?.isDemo) {
      setBranches(branches.filter(b => b.id !== restaurantId));
      showToast("Cabang berhasil diputus dalam Mode Demo.", "success");
      return;
    }

    try {
      await DataService.unlinkBigBossBranch(restaurantId);
      showToast("Cabang berhasil diputus.", "success");
      fetchBranches();
    } catch (err: any) {
      console.error(err);
      showToast("Gagal menghapus cabang.", "error");
    }
  };

  // Aggregated totals across all branches
  const totalCombinedProfit = branches.reduce((acc, b) => acc + b.totalProfitMonth, 0);
  const totalCombinedExpenses = branches.reduce((acc, b) => acc + b.totalExpenses, 0);
  const totalCombinedNetProfit = Math.max(0, totalCombinedProfit - totalCombinedExpenses);

  // Chart data format
  const chartData = branches.map(b => ({
    name: b.name,
    [t("bigboss.labaKotor", "Laba Kotor")]: b.totalProfitMonth,
    [t("bigboss.labaMurni", "Laba Murni")]: Math.max(0, b.totalProfitMonth - b.totalExpenses)
  }));

  // Helper to determine status style of each branch
  const getBranchStatus = (branch: BranchData) => {
    const prediction = (branch.daysEntered > 0 ? (branch.totalProfitMonth / branch.daysEntered) * 30 : 0);
    const target = branch.monthlyTargetProfit;

    if (target <= 0) return "active";
    if (prediction >= target * 1.5) return "amazing";
    if (prediction >= target * 1.2) return "excellent";
    if (prediction >= target) return "green";
    if (prediction >= target * 0.85) return "yellow";
    return "red";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "amazing":
        return (
          <span 
            className="flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-400/80 uppercase shadow-sm select-none"
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(255,215,0,0.12) 100%)",
              color: "#B8860B",
              boxShadow: "0 2px 8px rgba(212,175,55,0.15)"
            }}
          >
            <Sparkles className="w-3 h-3 text-amber-500 animate-bounce" /> Amazing!
          </span>
        );
      case "excellent":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/35 uppercase select-none">
            <Award className="w-3 h-3" /> Excellent
          </span>
        );
      case "green":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 uppercase select-none">
            <CheckCircle className="w-3 h-3" /> Aman
          </span>
        );
      case "yellow":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/35 uppercase select-none">
            <AlertTriangle className="w-3 h-3" /> Waspada
          </span>
        );
      case "red":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 border border-rose-100 dark:border-rose-900/35 uppercase select-none">
            <AlertOctagon className="w-3 h-3" /> Bahaya
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/30 uppercase select-none">
            <Building2 className="w-3 h-3" /> Aktif
          </span>
        );
    }
  };

  if (!authInitialized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-550 dark:text-zinc-400 font-bold">Menginisialisasi dasbor Big Boss...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Header & Navigation Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/60 dark:border-zinc-800">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => window.location.href = "/"}
            className="flex items-center gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </button>
          <h1 className="font-sans font-black text-3xl sm:text-4xl tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Building2 className="w-8 h-8 text-emerald-600 dark:text-emerald-450" />
            {t("bigboss.title", "Dashboard Big Boss")}
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 text-sm font-medium">
            {t("bigboss.subtitle", "Pantau performa keuangan seluruh cabang Anda dalam satu dasbor terpadu.")}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
          {user.isDemo ? (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 px-3 py-2 rounded-xl flex items-center gap-1.5 animate-pulse">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-550"></span>
                </span>
                Mode Demo
              </span>
              <div id="bigboss-header-google-signin-button" className="shadow-sm rounded-full overflow-hidden border border-zinc-200/40 dark:border-zinc-850 bg-white dark:bg-zinc-900"></div>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-right shadow-sm text-xs font-bold text-zinc-650 dark:text-zinc-300">
                <div>
                  <span className="block text-[9px] text-zinc-400 dark:text-zinc-555 uppercase tracking-widest">
                    Login Big Boss
                  </span>
                  <span className="font-mono">{user.email}</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-250 font-bold text-xs transition-colors cursor-pointer border-0 shadow-sm"
              >
                Keluar
              </button>
            </>
          )}

          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/60 dark:border-emerald-900/30 rounded-2xl px-5 py-2.5 shadow-sm">
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-455 block uppercase tracking-widest mb-0.5">
              {t("bigboss.totalBranches", "Cabang Terhubung").replace("{count}", String(branches.length))}
            </span>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {branches.length} Outlet
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-bold">Memuat dasbor gabungan cabang...</p>
        </div>
      ) : (
        <>
          {/* 2. Consolidated Totals Metric Cards */}
          {branches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Total Gross Profit */}
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-indigo-400" />
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">{t("bigboss.combinedProfit", "Total Laba Gabungan")}</span>
                <span className="font-mono text-2xl font-black tracking-tight text-zinc-950 dark:text-white block mt-3 tabular-nums">
                  {formatRupiah(totalCombinedProfit)}
                </span>
              </div>

              {/* Card 2: Total Operating Cost */}
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-red-400" />
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">{t("bigboss.combinedExpenses", "Total Pengeluaran Operasional Gabungan")}</span>
                <span className="font-mono text-2xl font-black tracking-tight text-rose-600 dark:text-rose-450 block mt-3 tabular-nums">
                  -{formatRupiah(totalCombinedExpenses)}
                </span>
              </div>

              {/* Card 3: Total Net Profit */}
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-555 uppercase tracking-widest">{t("bigboss.combinedNetProfit", "Total Laba Bersih Murni")}</span>
                <span className="font-mono text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-450 block mt-3 tabular-nums">
                  {formatRupiah(totalCombinedNetProfit)}
                </span>
              </div>
            </div>
          )}

          {/* 3. Link Branch Form & Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Link Branch Input Form */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-950 dark:text-zinc-50 mb-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                  {t("bigboss.addBranchTitle", "Hubungkan Cabang Baru")}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal mb-5">
                  {t("bigboss.addBranchDesc", "Masukkan Kode Otorisasi dari menu Settings (Target) di akun cabang yang ingin dipantau.")}
                </p>

                <form onSubmit={handleLinkBranch} className="space-y-4">
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      value={authCodeInput}
                      onChange={(e) => setAuthCodeInput(e.target.value)}
                      placeholder={t("bigboss.codePlaceholder", "Contoh: BRANCH-XYZ999")}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono uppercase text-center tracking-widest"
                    />
                  </div>

                  {linkingError && (
                    <p className="text-[10px] text-red-600 dark:text-rose-450 font-bold leading-relaxed bg-red-50 dark:bg-rose-950/15 p-2 rounded-lg border border-red-100 dark:border-rose-900/30">
                      ⚠️ {linkingError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLinking || !authCodeInput.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm cursor-pointer text-xs uppercase tracking-wider border-0 disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    {isLinking ? "Menghubungkan..." : t("bigboss.addBranchButton", "Hubungkan Cabang")}
                  </button>
                </form>
              </div>

              {/* Multi-Branch Usage Disclaimer */}
              <div className="bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200/50 dark:border-zinc-800/60 rounded-2xl p-5 text-[10px] text-zinc-400 dark:text-zinc-550 font-semibold leading-relaxed space-y-2">
                <div>
                  💡 <strong>Tips Big Boss:</strong> Halaman ini menggabungkan data finansial dari seluruh cabang Anda secara terpadu.
                </div>
                {user?.isDemo && (
                  <div className="text-amber-600 dark:text-amber-500 font-bold border-t border-zinc-200/40 dark:border-zinc-800/40 pt-2">
                    🔑 <strong>Uji Coba:</strong> Masukkan kode <span className="font-mono bg-zinc-200 dark:bg-zinc-850 px-1 py-0.5 rounded text-zinc-950 dark:text-white">DEMO-YOGYA</span> di atas untuk mensimulasikan penautan cabang baru!
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Linked Branches List/Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              {branches.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-12 text-center shadow-sm">
                  <Building2 className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-50">
                    {t("bigboss.noBranches", "Belum ada cabang terhubung.")}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-2 leading-relaxed font-semibold">
                    {t("bigboss.noBranchesDesc", "Mulai menautkan cabang dengan memasukkan kode otorisasi dari akun cabang Anda.")}
                  </p>
                </div>
              ) : (
                <>
                  {/* Branch Performance Comparison Chart */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
                      {t("bigboss.branchPerformance", "Perbandingan Performa Cabang")}
                    </h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-zinc-800/40" />
                          <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                          <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'var(--tooltip-bg, #ffffff)', 
                              border: '1px solid var(--tooltip-border, #e4e4e7)', 
                              color: 'var(--tooltip-text, #09090b)', 
                              fontSize: 11,
                              borderRadius: 12,
                              fontWeight: 'bold'
                            }} 
                          />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Bar dataKey={t("bigboss.labaKotor", "Laba Kotor")} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey={t("bigboss.labaMurni", "Laba Murni")} fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Branches Detail Table */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/60">
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                        Rincian Performa Cabang
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs font-semibold text-zinc-650 dark:text-zinc-400">
                        <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-150 dark:border-zinc-850">
                          <tr>
                            <th className="py-3 px-4">{t("bigboss.branchName", "Nama Cabang")}</th>
                            <th className="py-3 px-4">{t("bigboss.labaKotor", "Laba Kotor")}</th>
                            <th className="py-3 px-4">Fixed Cost</th>
                            <th className="py-3 px-4">{t("bigboss.labaMurni", "Laba Murni")}</th>
                            <th className="py-3 px-4">{t("bigboss.status", "Status")}</th>
                            <th className="py-3 px-4 text-center">{t("bigboss.actions", "Aksi")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 font-medium">
                          {branches.map((branch) => {
                            const netProfit = Math.max(0, branch.totalProfitMonth - branch.totalExpenses);
                            const status = getBranchStatus(branch);

                            return (
                              <tr key={branch.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                                  {branch.name}
                                </td>
                                <td className="py-3.5 px-4 font-mono tabular-nums text-blue-600 dark:text-blue-400">
                                  {formatRupiah(branch.totalProfitMonth)}
                                </td>
                                <td className="py-3.5 px-4 font-mono tabular-nums text-rose-600 dark:text-rose-450">
                                  -{formatRupiah(branch.totalExpenses)}
                                </td>
                                <td className="py-3.5 px-4 font-mono tabular-nums font-black text-emerald-600 dark:text-emerald-400">
                                  {formatRupiah(netProfit)}
                                </td>
                                <td className="py-3.5 px-4">
                                  {getStatusBadge(status)}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleUnlinkBranch(branch.id, branch.name)}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-red-600 dark:hover:text-rose-450 rounded-lg transition-colors cursor-pointer border-0 inline-flex"
                                    title="Hapus Pemantauan Cabang"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}
