import React, { useState, useEffect } from "react";
import { DataService } from "../lib/dataService";
import { formatRupiah } from "../lib/utils";
import { useTranslation } from "../lib/LanguageContext";
import { useToast } from "./Toast";
import { 
  Building2, Plus, Trash2, ArrowLeft, TrendingUp, DollarSign, Award, Sparkles, 
  CheckCircle, AlertTriangle, AlertOctagon, HelpCircle, Sun, Moon, RotateCw, Globe, X,
  ChevronDown, ChevronUp, BookOpen, Info, LogIn, LogOut, Calendar, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import TaskwaiLogo from "./TaskwaiLogo";

interface BranchData {
  id: string;
  name: string;
  monthlyTargetProfit: number;
  totalProfitMonth: number;
  profitWeek?: number;
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
    profitWeek: 16500000,
    profitToday: 2500000,
    daysEntered: 18,
    totalExpenses: 15000000
  },
  {
    id: "demo_br_2",
    name: "Cabang Bandung",
    monthlyTargetProfit: 40000000,
    totalProfitMonth: 68000000,
    profitWeek: 19200000,
    profitToday: 3800000,
    daysEntered: 18,
    totalExpenses: 12000000
  },
  {
    id: "demo_br_3",
    name: "Cabang Surabaya",
    monthlyTargetProfit: 60000000,
    totalProfitMonth: 25000000,
    profitWeek: 7200000,
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
  const { t, lang, setLang, currency } = useTranslation();
  const { showToast } = useToast();
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authCodeInput, setAuthCodeInput] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkingError, setLinkingError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const formatLastUpdated = (date: Date, langStr: string) => {
    const locale = langStr === "en" ? "en-US" : "id-ID";
    const formattedDate = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);

    return langStr === "en" ? formattedDate : `${formattedDate} WIB`;
  };

  const getBranchMetrics = (branch: BranchData, tf: "daily" | "weekly" | "monthly") => {
    if (tf === "daily") {
      const gross = branch.profitToday;
      const exp = Math.round(branch.totalExpenses / 30);
      const net = Math.max(0, gross - exp);
      return { gross, exp, net };
    }
    if (tf === "weekly") {
      const gross = branch.profitWeek ?? (branch.profitToday * 7);
      const exp = Math.round((branch.totalExpenses / 30) * 7);
      const net = Math.max(0, gross - exp);
      return { gross, exp, net };
    }
    // monthly
    const gross = branch.totalProfitMonth;
    const exp = branch.totalExpenses;
    const net = Math.max(0, gross - exp);
    return { gross, exp, net };
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  // Isolated session state for Big Boss mode
  const [user, setUser] = useState<any | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const formatLocale = currency === "dollar" ? "en-US" : "id-ID";

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const data = await DataService.getBigBossBranches();
      setBranches(data.branches || []);
      setLastUpdated(new Date());
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
    setLoading(false);
    showToast("Memasuki dasbor gabungan dalam Mode Demo!", "info");
  };

  const handleGoogleLoginResponse = async (response: any) => {
    try {
      const idToken = response.credential;
      const data = await DataService.loginGoogle(idToken, 'bigboss');
      sessionStorage.removeItem("taskwai_bigboss_is_demo");
      setUser(data.user);
      showToast("Berhasil masuk ke dasbor Big Boss!", "success");
    } catch (error: any) {
      console.error("Login error:", error);
      const errMsg = error?.message || "";
      if (errMsg.includes("type berbeda") || errMsg.includes("Taskwai biasa")) {
        showToast(t("bigboss.errorWrongType", "Akun ini sudah terdaftar sebagai akun Taskwai biasa. Harap gunakan email lain untuk mendaftar Big Boss."), "error");
      } else {
        showToast(errMsg || t("nav.loginError", "Gagal masuk dengan Google."), "error");
      }
    }
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("taskwai_bigboss_is_demo");
      if (!user?.isDemo) {
        await DataService.logout();
      }
      handleEnterDemoMode();
      showToast("Berhasil keluar dari dasbor Big Boss. Kembali ke Mode Demo.", "info");
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
        } else {
          // Default directly to Demo Mode if user is not logged in
          sessionStorage.setItem("taskwai_bigboss_is_demo", "true");
          setUser({
            email: "demo_bigboss@taskwai.com",
            uid: "demo_bigboss",
            isDemo: true
          });
          setBranches(MOCK_DEMO_BRANCHES);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        sessionStorage.setItem("taskwai_bigboss_is_demo", "true");
        setUser({
          email: "demo_bigboss@taskwai.com",
          uid: "demo_bigboss",
          isDemo: true
        });
        setBranches(MOCK_DEMO_BRANCHES);
        setLoading(false);
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
    if (authInitialized && (!user || user?.isDemo)) {
      const timer = setTimeout(() => {
        const google = (window as any).google;
        if (google) {
          google.accounts.id.initialize({
            client_id: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "888780289762-gpiud6mhos00kiljpgnk779tunli4ijr.apps.googleusercontent.com",
            callback: handleGoogleLoginResponse,
            auto_select: false
          });
          google.accounts.id.disableAutoSelect();
          
          const element = document.getElementById("bigboss-header-google-signin-button");
          if (element) {
            element.innerHTML = "";
            google.accounts.id.renderButton(element, { 
              theme: isDark ? "dark" : "outline", 
              size: "medium", 
              width: 170,
              shape: "pill",
              text: "signin_with"
            });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [authInitialized, user, isDark]);

  useEffect(() => {
    if (showLoginModal) {
      const timer = setTimeout(() => {
        const google = (window as any).google;
        if (google) {
          google.accounts.id.initialize({
            client_id: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "888780289762-gpiud6mhos00kiljpgnk779tunli4ijr.apps.googleusercontent.com",
            callback: async (res: any) => {
              setShowLoginModal(false);
              await handleGoogleLoginResponse(res);
            },
            auto_select: false
          });
          google.accounts.id.disableAutoSelect();

          const element = document.getElementById("bigboss-modal-google-signin-button");
          if (element) {
            element.innerHTML = "";
            google.accounts.id.renderButton(element, { 
              theme: isDark ? "dark" : "outline", 
              size: "large", 
              width: 250,
              shape: "pill",
              text: "signin_with"
            });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showLoginModal, isDark]);

  const handleLinkBranch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.isDemo) {
      setShowLoginModal(true);
      return;
    }

    if (!authCodeInput.trim()) return;

    setIsLinking(true);
    setLinkingError("");

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
    if (!confirm(`Apakah Anda yakin ingin melepas kunci (unlock) dan menghapus pemantauan cabang "${name}"? Akun restoran tersebut akan dilepaskan (unfreeze).`)) {
      return;
    }

    if (user?.isDemo) {
      setBranches(branches.filter(b => b.id !== restaurantId));
      showToast("Tautan cabang berhasil dilepas (unlock) dalam Mode Demo.", "success");
      return;
    }

    try {
      await DataService.unlinkBigBossBranch(restaurantId);
      showToast("Tautan cabang berhasil dilepas (unlock).", "success");
      fetchBranches();
    } catch (err: any) {
      console.error(err);
      showToast("Gagal melepas kunci cabang.", "error");
    }
  };

  // Aggregated totals across all branches based on selected timeframe
  const totalCombinedProfit = branches.reduce((acc, b) => acc + getBranchMetrics(b, timeframe).gross, 0);
  const totalCombinedExpenses = branches.reduce((acc, b) => acc + getBranchMetrics(b, timeframe).exp, 0);
  const totalCombinedNetProfit = Math.max(0, totalCombinedProfit - totalCombinedExpenses);

  // Chart data format adapting dynamically to selected timeframe
  const chartData = branches.map(b => {
    const m = getBranchMetrics(b, timeframe);
    return {
      name: b.name,
      [t("bigboss.labaKotor", "Laba Kotor")]: m.gross,
      [t("bigboss.fixedCost", "Fixed Cost")]: m.exp,
      [t("bigboss.labaMurni", "Laba Murni")]: m.net
    };
  });

  // Helper to determine status style of each branch
  const getBranchStatus = (branch: BranchData) => {
    const today = new Date();
    const currentDateNum = today.getDate();
    const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    // Proyeksi linear realistis berdasarkan hari berjalan: (totalProfitMonth / currentDateNum) * totalDaysInMonth
    const prediction = currentDateNum > 0 ? (branch.totalProfitMonth / currentDateNum) * totalDaysInMonth : 0;
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

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center relative overflow-hidden"
        >
          {/* Accent top border */}
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-emerald-500 to-teal-400" />
          
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
              <Building2 className="w-10 h-10 text-emerald-600 dark:text-emerald-450 animate-pulse" />
            </div>
            <div>
              <h2 className="font-sans font-black text-2xl tracking-tight text-zinc-950 dark:text-white flex items-center justify-center gap-2">
                <span>taskwai</span>
                <span 
                  className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full select-none"
                  style={{
                    background: "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(255,215,0,0.12) 100%)",
                    border: "1px solid rgba(197,160,40,0.4)",
                    color: "#c5a028"
                  }}
                >
                  👑 Big Boss
                </span>
              </h2>
              <p className="text-zinc-550 dark:text-zinc-400 text-xs font-semibold mt-2.5 leading-relaxed">
                {t("bigboss.loginSubtitle", "Kelola dan pantau kinerja keuangan seluruh cabang restoran Anda dalam satu dasbor terpadu.")}
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800/60">
            {/* Google Sign-in button */}
            <div className="flex flex-col items-center justify-center py-2">
              <div id="bigboss-login-google-signin-button" className="shadow-sm rounded-full overflow-hidden border border-zinc-200/40 dark:border-zinc-850 bg-white dark:bg-zinc-900" />
            </div>

            <div className="flex items-center justify-center gap-2 text-zinc-350 dark:text-zinc-650 text-xs">
              <span className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
              <span>{t("bigboss.or", "atau")}</span>
              <span className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
            </div>

            {/* Enter demo button */}
            <button
              type="button"
              onClick={handleEnterDemoMode}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-800 text-zinc-750 dark:text-zinc-250 font-bold text-xs transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t("bigboss.enterDemo", "Masuk Mode Demo")}</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 1. Top Sticky Navbar Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.25)] transition-colors duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Title */}
          <div className="flex items-center gap-2.5 text-left select-none">
            <div className="relative flex items-center">
              <TaskwaiLogo size={34} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-black text-lg tracking-tight text-zinc-900 dark:text-zinc-50">
                taskwai
              </span>
              <span 
                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full select-none"
                style={{
                  background: "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(255,215,0,0.12) 100%)",
                  border: "1px solid rgba(197,160,40,0.4)",
                  color: "#c5a028"
                }}
              >
                👑 Big Boss
              </span>
            </div>
          </div>

          {/* Controls Aligned on Navbar: Mode Demo, Login Google, Cabang Terhubung, Dark Toggle */}
          <div className="flex items-center gap-2.5">
            {user?.isDemo ? (
              <>
                <span className="hidden md:flex text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 px-3 py-1.5 rounded-xl items-center gap-1.5 animate-pulse">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-550"></span>
                  </span>
                  {t("nav.demoMode", "Mode Demo")}
                </span>

                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer border-0 shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t("nav.login", "Login")}</span>
                </button>
              </>
            ) : (
              <>
                <div className="hidden sm:block bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-3 py-1 text-right shadow-sm text-xs font-bold text-zinc-650 dark:text-zinc-300">
                  <span className="block text-[8px] text-zinc-400 dark:text-zinc-555 uppercase tracking-widest">
                    {t("bigboss.loginHeader", "Login Big Boss")}
                  </span>
                  <span className="font-mono text-[11px]">{user.email}</span>
                </div>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-250 font-bold text-xs transition-colors cursor-pointer border-0 shadow-sm flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t("nav.logout", "Keluar")}</span>
                </button>
              </>
            )}

            <div className="hidden xs:flex items-center gap-1.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-xl px-3 py-1.5 shadow-sm">
              <div className="flex flex-col text-left">
                <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-455 block uppercase tracking-widest leading-none mb-0.5">
                  Cabang Terhubung
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono leading-none">
                  {branches.length} Outlet
                </span>
              </div>
            </div>

            {/* Language Selector */}
            <button
              type="button"
              onClick={() => setLang(lang === "id" ? "en" : "id")}
              className="px-2.5 py-1.5 rounded-xl text-zinc-650 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-zinc-200/40 dark:border-zinc-800 transition-all cursor-pointer bg-white dark:bg-zinc-900 flex items-center gap-1.5 shadow-sm"
              title={lang === "id" ? "Switch to English" : "Ubah ke Bahasa Indonesia"}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450" />
              <span className="text-[10px] font-black uppercase tracking-wider font-mono">
                {lang === "id" ? "ID" : "EN"}
              </span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-zinc-200/40 dark:border-zinc-800 transition-all cursor-pointer bg-white dark:bg-zinc-900 disabled:opacity-50"
              title={t("nav.refresh", "Muat Ulang")}
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-500" : ""}`} />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-zinc-200/40 dark:border-zinc-800 transition-all cursor-pointer bg-white dark:bg-zinc-900"
              title={isDark ? "Mode Terang" : "Mode Gelap"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="pb-2 border-b border-zinc-200/60 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-emerald-600 dark:text-emerald-450" />
              {t("bigboss.title", "Dashboard Big Boss")}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              <p className="text-zinc-550 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                {t("bigboss.subtitle", "Pantau performa keuangan seluruh cabang Anda dalam satu dasbor terpadu.")}
              </p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/40 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 font-mono shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <span>{t("bigboss.lastUpdated", "Update:")} {formatLastUpdated(lastUpdated, lang)}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-xl border border-emerald-200/60 dark:border-emerald-900/30 transition-all cursor-pointer shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t("bigboss.guideBtn", "Panduan & Aturan")}</span>
          </button>
        </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-bold">Memuat dasbor gabungan cabang...</p>
        </div>
      ) : (
        <>
          {/* 1.5 Timeframe Filter Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block leading-tight">
                  {t("bigboss.timeframeLabel", "Periode Laporan Cabang:")}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                  {timeframe === "daily" 
                    ? (lang === "en" ? "Monitoring 1 current day performance" : "Memantau performa 1 hari berjalan")
                    : timeframe === "weekly"
                    ? (lang === "en" ? "Monitoring last 7 days accumulated performance" : "Memantau akumulasi 7 hari terakhir")
                    : (lang === "en" ? "Monitoring current month accumulated performance" : "Memantau akumulasi bulan berjalan")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-850 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTimeframe("daily")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                  timeframe === "daily"
                    ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {t("bigboss.timeframeDaily", "Per Hari")}
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("weekly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                  timeframe === "weekly"
                    ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {t("bigboss.timeframeWeekly", "Per Minggu")}
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("monthly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                  timeframe === "monthly"
                    ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {t("bigboss.timeframeMonthly", "Per Bulan")}
              </button>
            </div>
          </div>

          {/* 2. Consolidated Totals Metric Cards */}
          {branches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Total Gross Profit */}
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-indigo-400" />
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">
                  {t("bigboss.combinedProfit", "Total Laba Gabungan")} ({timeframe === "daily" ? t("bigboss.timeframeDaily", "Per Hari") : timeframe === "weekly" ? t("bigboss.timeframeWeekly", "Per Minggu") : t("bigboss.timeframeMonthly", "Per Bulan")})
                </span>
                <span className="font-mono text-2xl font-black tracking-tight text-zinc-950 dark:text-white block mt-3 tabular-nums">
                  {formatRupiah(totalCombinedProfit)}
                </span>
              </div>

              {/* Card 2: Total Operating Cost */}
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-red-400" />
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">
                  {t("bigboss.combinedExpenses", "Total Pengeluaran Operasional Gabungan")} ({timeframe === "daily" ? t("bigboss.timeframeDaily", "Per Hari") : timeframe === "weekly" ? t("bigboss.timeframeWeekly", "Per Minggu") : t("bigboss.timeframeMonthly", "Per Bulan")})
                </span>
                <span className="font-mono text-2xl font-black tracking-tight text-rose-600 dark:text-rose-450 block mt-3 tabular-nums">
                  -{formatRupiah(totalCombinedExpenses)}
                </span>
              </div>

              {/* Card 3: Total Net Profit */}
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-555 uppercase tracking-widest">
                  {t("bigboss.combinedNetProfit", "Total Laba Bersih Murni")} ({timeframe === "daily" ? t("bigboss.timeframeDaily", "Per Hari") : timeframe === "weekly" ? t("bigboss.timeframeWeekly", "Per Minggu") : t("bigboss.timeframeMonthly", "Per Bulan")})
                </span>
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
                    disabled={isLinking || (!user?.isDemo && !authCodeInput.trim())}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm cursor-pointer text-xs uppercase tracking-wider border-0 disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    {isLinking ? "Menghubungkan..." : t("bigboss.addBranchButton", "Hubungkan Cabang")}
                  </button>
                </form>
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
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={3}>
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
                          <Bar dataKey={t("bigboss.labaKotor", "Laba Kotor")} fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
                          <Bar dataKey={t("bigboss.fixedCost", "Fixed Cost")} fill="#ef4444" radius={[4, 4, 0, 0]} barSize={18} />
                          <Bar dataKey={t("bigboss.labaMurni", "Laba Murni")} fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
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
                            const m = getBranchMetrics(branch, timeframe);
                            const status = getBranchStatus(branch);

                            return (
                              <tr key={branch.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                                  {branch.name}
                                </td>
                                <td className="py-3.5 px-4 font-mono tabular-nums text-blue-600 dark:text-blue-400">
                                  {formatRupiah(m.gross)}
                                </td>
                                <td className="py-3.5 px-4 font-mono tabular-nums text-rose-600 dark:text-rose-450">
                                  -{formatRupiah(m.exp)}
                                </td>
                                <td className="py-3.5 px-4 font-mono tabular-nums font-black text-emerald-600 dark:text-emerald-400">
                                  {formatRupiah(m.net)}
                                </td>
                                <td className="py-3.5 px-4">
                                  {getStatusBadge(status)}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleUnlinkBranch(branch.id, branch.name)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 hover:bg-red-50 dark:hover:bg-rose-950/20 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold"
                                    title="Lepas Kunci (Unlock) & Hapus Pemantauan Cabang"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Unlock</span>
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

      {/* Login Required Modal for Big Boss */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-emerald-500 to-teal-400" />
              
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                  <Building2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                  {t("bigboss.loginModalTitle", "Login ke Big Boss")}
                </h3>
                <p className="text-xs font-semibold text-zinc-550 dark:text-zinc-400 leading-relaxed">
                  {t("bigboss.loginModalDesc", "Untuk menautkan dan memantau cabang restoran ril Anda, silakan masuk menggunakan akun Google Anda terlebih dahulu.")}
                </p>
              </div>

              {/* Google Sign-in Button */}
              <div className="flex flex-col items-center justify-center py-1">
                <div id="bigboss-modal-google-signin-button" className="shadow-sm rounded-full overflow-hidden border border-zinc-200/40 dark:border-zinc-850 bg-white dark:bg-zinc-900 flex items-center justify-center min-h-[44px]" />
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-250 font-bold text-xs transition-colors cursor-pointer border-0"
                >
                  {t("nav.cancel", "Batal")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Guide Modal for Big Boss */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-emerald-500 to-teal-400" />
              
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-0"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/60 pb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                  <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                    {t("bigboss.guideTitle", "Panduan & Aturan Dasbor Big Boss")}
                  </h3>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {t("bigboss.guideSubtitle", "Petunjuk penggunaan dan aturan penautan akun cabang")}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60">
                  <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 text-xs">
                    🏢 {t("bigboss.guideFungsiTitle", "1. Fungsi Dasbor Big Boss")}
                  </h4>
                  <p className="text-zinc-550 dark:text-zinc-400 text-xs pl-5">
                    {t("bigboss.guideFungsiDesc", "Halaman ini digunakan oleh pemilik usaha (owner) untuk memantau ringkasan omzet, laba kotor, laba bersih, dan statistik dari seluruh cabang restoran Anda secara terpadu.")}
                  </p>
                </div>

                <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60">
                  <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 text-xs">
                    🔗 {t("bigboss.guideCaraTitle", "2. Cara Menautkan Cabang Baru")}
                  </h4>
                  <ol className="list-decimal pl-9 text-xs text-zinc-550 dark:text-zinc-400 space-y-1">
                    <li>{t("bigboss.guideCaraStep1", "Buka aplikasi Taskwai pada akun restoran cabang yang hendak dipantau.")}</li>
                    <li>{t("bigboss.guideCaraStep2", "Masuk ke menu Pengaturan (Target) → pilih bagian Otorisasi Big Boss.")}</li>
                    <li>{t("bigboss.guideCaraStep3", "Klik Dapatkan Kode Otorisasi (kode acak 6-digit berlaku selama 15 menit).")}</li>
                    <li>{t("bigboss.guideCaraStep4", "Salin kode tersebut, lalu tempelkan pada kolom Hubungkan Cabang Baru di dasbor Big Boss ini.")}</li>
                  </ol>
                </div>

                <div className="space-y-2 bg-amber-50/70 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                  <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 text-xs">
                    ⚠️ {t("bigboss.guideAturanTitle", "3. Aturan Penting Akun & Penguncian (Gmail)")}
                  </h4>
                  <ul className="list-disc pl-6 text-xs text-amber-900/80 dark:text-amber-300/80 space-y-1.5">
                    <li>{t("bigboss.guideAturanRule1", "Separasi Akun Gmail: Gmail yang digunakan untuk login Big Boss harus bersih dan berbeda dengan Gmail yang terdaftar untuk akun cabang biasa.")}</li>
                    <li>{t("bigboss.guideAturanRule2", "Kunci Otomatis (Freeze): Setiap 1 akun cabang biasa hanya dapat terhubung ke 1 akun Big Boss dan akan langsung terkunci (freeze).")}</li>
                    <li>{t("bigboss.guideAturanRule3", "Pelepasan Kunci (Unlock): Untuk melepaskan penguncian cabang, klik tombol Unlock pada tabel cabang di dasbor Big Boss ini. Akun cabang tersebut akan terbebas kembali.")}</li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs transition-colors cursor-pointer border-0 shadow-sm"
                >
                  {t("bigboss.guideUnderstand", "Saya Mengerti")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
