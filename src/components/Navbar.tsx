import React, { useState, useEffect } from "react";
import { LogIn, LogOut, LayoutDashboard, DollarSign, Settings, FileText, Landmark, ShieldCheck, Sun, Moon, AlertTriangle, RotateCw, Sparkles, X, TrendingUp, Users, Coins, Cloud, Lock, User as UserIcon, UserCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "./Toast";
import TaskwaiLogo from "./TaskwaiLogo";
import { useTranslation } from "../lib/LanguageContext";
import { DataService } from "../lib/dataService";

interface NavbarProps {
  user: any | null;
  setUser: (user: any | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  restaurantName: string;
  isDark: boolean;
  toggleDark: () => void;
  authInitialized: boolean;
  staffSession: { restaurantId: string; ownerId: string; role: "staff" } | null;
  setStaffSession: (session: { restaurantId: string; ownerId: string; role: "staff" } | null) => void;
}

export default function Navbar({
  user,
  setUser,
  activeTab,
  setActiveTab,
  restaurantName,
  isDark,
  toggleDark,
  authInitialized,
  staffSession,
  setStaffSession,
}: NavbarProps) {
  const { showToast } = useToast();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t } = useTranslation();

  // Staff Login Form States
  const [loginTab, setLoginTab] = useState<"owner" | "staff">("owner");
  const [staffUsernameInput, setStaffUsernameInput] = useState("");
  const [staffPasswordInput, setStaffPasswordInput] = useState("");
  const [isLoggingInStaff, setIsLoggingInStaff] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // Google GSI Sign-In Button rendering when modal is visible
  useEffect(() => {
    if (showLoginModal && loginTab === "owner") {
      const timer = setTimeout(() => {
        const google = (window as any).google;
        if (google) {
          google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "888780289762-bnd08vbfkspqg2o9iif8bcr91a92jsh5.apps.googleusercontent.com",
            callback: handleGoogleLoginResponse
          });
          google.accounts.id.renderButton(
            document.getElementById("google-signin-button"),
            { 
              theme: isDark ? "dark" : "outline", 
              size: "large", 
              width: 280,
              shape: "pill"
            }
          );
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showLoginModal, loginTab, isDark]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleGoogleLoginResponse = async (response: any) => {
    try {
      const idToken = response.credential;
      const data = await DataService.loginGoogle(idToken);
      setUser(data.user);
      showToast(t("nav.loginSuccess", "Berhasil masuk menggunakan akun Google!"), "success");
      setShowLoginModal(false);

      if (data.user.email === "arianrisqi@gmail.com") {
        setActiveTab("admin");
      } else {
        setActiveTab("dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      showToast(error.message || t("nav.loginError", "Gagal masuk dengan Google."), "error");
    }
  };

  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffUsernameInput.trim() || !staffPasswordInput.trim()) {
      showToast("Harap isi username dan password staff.", "warning");
      return;
    }

    setIsLoggingInStaff(true);
    try {
      const session = await DataService.loginStaff(staffUsernameInput.trim(), staffPasswordInput.trim());
      const sessionData = { ...session, role: "staff" as const };
      
      setStaffSession(sessionData);
      localStorage.setItem("taskwai_staff_session", JSON.stringify(sessionData));
      
      showToast("Berhasil masuk sebagai Staff!", "success");
      setShowLoginModal(false);
      setStaffUsernameInput("");
      setStaffPasswordInput("");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Gagal masuk. Periksa kembali username dan password.", "error");
    } finally {
      setIsLoggingInStaff(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      if (staffSession) {
        setStaffSession(null);
        localStorage.removeItem("taskwai_staff_session");
        await DataService.logout();
        showToast("Sesi staff telah berakhir.", "info");
      } else {
        await DataService.logout();
        setUser(null);
        showToast(t("nav.logoutSuccess", "Berhasil keluar."), "info");
      }
      setActiveTab("dashboard");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isAdmin = user && user.email === "arianrisqi@gmail.com";

  const menuItems = isAdmin
    ? [{ id: "admin", label: "Admin Console", icon: ShieldCheck }]
    : staffSession
      ? [{ id: "input", label: t("nav.input", "Catat Profit"), icon: DollarSign }]
      : [
          { id: "dashboard", label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard },
          { id: "input", label: t("nav.input", "Catat Profit"), icon: DollarSign },
          { id: "biaya", label: t("nav.biaya", "Biaya Operasional"), icon: Landmark },
          { id: "laporan", label: t("nav.laporan", "Laporan"), icon: FileText },
          { id: "target", label: t("nav.target", "Pengaturan"), icon: Settings },
        ];

  // User Profile fields fallbacks
  const photoURL = user?.picture || user?.photoURL;
  const displayName = user?.name || user?.displayName;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-100 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.25)] transition-colors duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <button
            onClick={() => setShowAboutModal(true)}
            className="flex items-center gap-3 text-left focus:outline-none hover:opacity-85 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="relative">
              <TaskwaiLogo size={36} />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-black text-base tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                taskwai
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              </span>
              <span className="hidden sm:inline text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{t("nav.profitDashboard", "Profit Dashboard")}</span>
            </div>
          </button>

          {/* Navigation Menu - Desktop */}
          <nav className="hidden lg:flex space-x-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                   key={item.id}
                   onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/40 font-black"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60"
                    }`}
                >
                   <Icon className="w-3.5 h-3.5" />
                   {item.label}
                </button>
              );
            })}
          </nav>

          {/* Auth Button and Badges */}
          <div className="flex items-center gap-2.5">
            {/* Status Badge */}
            {!authInitialized ? (
              <div className="hidden sm:block h-6 w-24 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-full animate-pulse" />
            ) : staffSession ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Mode Karyawan</span>
              </div>
            ) : user ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t("nav.cloudSync", "Cloud Sync")}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{t("nav.demoMode", "Mode Demo")}</span>
              </div>
            )}

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
              title={isDark ? t("nav.lightMode", "Mode Terang") : t("nav.darkMode", "Mode Gelap")}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-500" />}
            </button>

            {!authInitialized ? (
              <div className="h-9 w-20 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-xl animate-pulse" />
            ) : staffSession ? (
              <div className="flex items-center gap-2 pl-1.5">
                <div className="hidden xs:flex flex-col items-end leading-none">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Akses</span>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Staff</span>
                </div>
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/40 transition-colors cursor-pointer bg-white dark:bg-zinc-900"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{t("nav.logout", "Keluar")}</span>
                </button>
              </div>
            ) : user ? (
              <div className="flex items-center gap-2 pl-1.5">
                {photoURL && (
                  <div 
                    onClick={() => {
                      if (user.email) {
                        navigator.clipboard.writeText(user.email);
                        showToast(`${user.email} (${t("nav.copied", "Tersalin")})`, "success");
                      }
                    }}
                    className="relative group cursor-pointer"
                  >
                    <img
                      src={photoURL}
                      alt={displayName || "Owner"}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 transition-all hover:ring-2 hover:ring-zinc-950/10 dark:hover:ring-white/10"
                    />
                    {/* Hover custom tooltip */}
                    <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md whitespace-nowrap z-50">
                      {user.email}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-lg border border-zinc-200/60 dark:border-zinc-800 transition-colors cursor-pointer bg-white dark:bg-zinc-900"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{t("nav.logout", "Keluar")}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-950 dark:hover:bg-white rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{t("nav.login", "Login")}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Menu - Mobile (Premium Fixed Bottom Bar) */}
      {!staffSession && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/60 dark:border-zinc-800/80 bg-white/97 dark:bg-zinc-900/97 backdrop-blur-xl pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)] transition-colors duration-300">
          <div className="flex h-[68px] w-full items-center justify-around px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? "bg-emerald-50 dark:bg-emerald-950/40 scale-110" 
                      : "bg-transparent"
                  }`}>
                    <Icon className="w-[19px] h-[19px] stroke-[2.25]" />
                  </div>
                  <span className="text-[9px] font-black tracking-tight uppercase leading-none">{item.label.split(" ")[0]}</span>
                  {isActive && (
                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Premium Confirmation Dialog / Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowLogoutConfirm(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200/60 dark:border-zinc-800/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              {/* Icon Container */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 mb-1.5">
                Konfirmasi Keluar
              </h3>
              
              {/* Description */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[280px] mb-6">
                Apakah Anda benar-benar yakin ingin keluar dari akun Anda?
              </p>

              {/* Action Buttons */}
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 rounded-xl bg-red-600 dark:bg-red-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 dark:hover:bg-red-600 shadow-sm transition-colors cursor-pointer"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium About Taskwai Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay with blur */}
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setShowAboutModal(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl border border-zinc-200/60 dark:border-zinc-800/80 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="flex flex-col">
              {/* Header with gradient badge and icon */}
              <div className="flex items-center gap-4 mb-6">
                <TaskwaiLogo size={48} />
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    taskwai
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-800/60 uppercase tracking-widest">v1.2.0</span>
                  </h3>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5">
                    {t("about.subtitle", "Sahabat Finansial Owner")}
                  </p>
                </div>
              </div>

              {/* Tagline / Description */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl p-4 mb-6">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  ✨ {t("about.tagline", "Taskwai adalah Sahabat Owner, membantu Anda mengontrol performa usaha secara real-time. Update laporan harian lewat staff di toko juga bisa dilakukan dengan sangat mudah!")}
                </p>
              </div>

              {/* Features List */}
              <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3.5">
                {t("about.featuresTitle", "Fitur Utama & Kegunaan")}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Feat 1 */}
                <div className="flex gap-3 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <TrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{t("about.feat1.title", "Dashboard Real-Time")}</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">{t("about.feat1.desc", "Pantau estimasi profit bersih bulanan & target harian secara otomatis.")}</span>
                  </div>
                </div>

                {/* Feat 2 */}
                <div className="flex gap-3 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <Users className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{t("about.feat2.title", "Input Harian lewat Staff")}</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">{t("about.feat2.desc", "Staff di toko bisa login & input omzet harian langsung dari cabang tanpa melihat dashboard utama.")}</span>
                  </div>
                </div>

                {/* Feat 3 */}
                <div className="flex gap-3 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <Coins className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{t("about.feat3.title", "HPP & Biaya Otomatis")}</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">{t("about.feat3.desc", "Kalkulasi margin kotor secara instan dengan input persentase HPP & biaya lainnya.")}</span>
                  </div>
                </div>

                {/* Feat 4 */}
                <div className="flex gap-3 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <Cloud className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{t("about.feat4.title", "Penyimpanan Aman Cloud")}</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">{t("about.feat4.desc", "Sinkronisasi otomatis ke cloud Firestore atau simpan secara lokal jika mode demo.")}</span>
                  </div>
                </div>
              </div>

              {/* Privacy and Tax Disclaimer Callout */}
              <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl p-4 mb-5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 font-medium">
                <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{t("about.privacyTitle", "Kerahasiaan & Privasi Data")}</span>
                </div>
                <p>
                  {t("about.privacyDisclaimer", "Taskwai tidak mengetahui atau mencatat omzet sebenarnya secara teridentifikasi. Data usaha Anda sepenuhnya rahasia. Demi menjaga privasi, Anda bebas menggunakan nama samaran (bukan nama asli resto) untuk profil usaha Anda. Kami juga tidak terafiliasi dengan otoritas pajak mana pun; alat ini murni dirancang untuk membantu monitoring keuangan internal usaha Anda.")}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setShowAboutModal(false)}
                className="w-full py-3 rounded-2xl bg-zinc-950 dark:bg-zinc-50 hover:bg-zinc-900 dark:hover:bg-white text-white dark:text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                {t("about.close", "Tutup")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Unified Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop Overlay with blur */}
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => {
              if (!isLoggingInStaff) setShowLoginModal(false);
            }}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl border border-zinc-200/60 dark:border-zinc-800/80 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            {!isLoggingInStaff && (
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer animate-in"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Modal Header */}
            <div className="flex flex-col items-center mb-6 mt-2 text-center animate-in">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg mb-3">
                <TaskwaiLogo size={36} className="filter invert brightness-0 dark:brightness-100 dark:invert-0" />
              </div>
              <h3 className="text-xl font-black text-zinc-950 dark:text-zinc-50">
                Masuk ke taskwai
              </h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-300 font-black tracking-widest uppercase mt-0.5">
                Dashboard & Laporan Finansial Usaha
              </p>
            </div>

            {/* Login Tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setLoginTab("owner")}
                disabled={isLoggingInStaff}
                className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  loginTab === "owner"
                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
              >
                Owner Restoran
              </button>
              <button
                type="button"
                onClick={() => setLoginTab("staff")}
                disabled={isLoggingInStaff}
                className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  loginTab === "staff"
                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
              >
                Staff Cabang
              </button>
            </div>

            {/* Login Body */}
            {loginTab === "owner" ? (
              <div className="flex flex-col items-center text-center space-y-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[280px]">
                  Masuk sebagai Owner untuk memantau performa bisnis secara menyeluruh dan mengelola akses karyawan.
                </p>
                <div id="google-signin-button" className="w-full flex justify-center py-2 min-h-[44px]"></div>
              </div>
            ) : (
              <form onSubmit={handleStaffLoginSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Username */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                    Username Akses Staff
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      disabled={isLoggingInStaff}
                      value={staffUsernameInput}
                      onChange={(e) => setStaffUsernameInput(e.target.value)}
                      placeholder="Masukkan username staff"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                    Password Akses Staff
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type={showStaffPassword ? "text" : "password"}
                      required
                      disabled={isLoggingInStaff}
                      value={staffPasswordInput}
                      onChange={(e) => setStaffPasswordInput(e.target.value)}
                      placeholder="Masukkan password staff"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-250 focus:outline-none cursor-pointer"
                    >
                      {showStaffPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoggingInStaff}
                  className="w-full py-3 rounded-2xl bg-zinc-950 dark:bg-zinc-50 hover:bg-zinc-900 dark:hover:bg-white text-white dark:text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isLoggingInStaff ? "Memverifikasi..." : "Masuk Sesi Karyawan"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
