import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signOut, User } from "firebase/auth";
import { LogIn, LogOut, LayoutDashboard, DollarSign, Settings, FileText, Landmark, ShieldCheck, Sun, Moon } from "lucide-react";
import { useToast } from "./Toast";

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  restaurantName: string;
  isDark: boolean;
  toggleDark: () => void;
}

export default function Navbar({ user, activeTab, setActiveTab, restaurantName, isDark, toggleDark }: NavbarProps) {
  const { showToast } = useToast();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast("Berhasil masuk menggunakan akun Google!", "success");
    } catch (error: any) {
      console.error("Login error:", error);
      showToast("Gagal masuk dengan Google. Anda tetap dapat menggunakan Mode Demo Offline.", "warning");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast("Berhasil keluar.", "info");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "input", label: "Catat Profit", icon: DollarSign },
    { id: "biaya", label: "Biaya Operasional", icon: Landmark },
    { id: "laporan", label: "Laporan", icon: FileText },
    { id: "target", label: "Pengaturan", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="Taskwai Logo" className="h-9 w-9 object-contain rounded-xl shadow-sm" />
          <div className="flex flex-col">
            <span className="font-sans font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-50">Taskwai</span>
            <span className="hidden sm:inline text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">Profit Dashboard</span>
          </div>
        </div>

        {/* Navigation Menu - Desktop */}
        <nav className="hidden lg:flex space-x-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? "bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 shadow-sm font-black"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-55 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
          {user ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cloud Sync</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Mode Demo</span>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDark}
            className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-zinc-200/40 dark:border-zinc-800 transition-all cursor-pointer bg-white dark:bg-zinc-900"
            title={isDark ? "Mode Terang" : "Mode Gelap"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-500" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-1.5">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Owner"}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800"
                />
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-lg border border-zinc-200/60 dark:border-zinc-800 transition-colors cursor-pointer bg-white dark:bg-zinc-900"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-950 dark:hover:bg-white rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Menu - Mobile (Premium Fixed Bottom Bar) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] transition-colors duration-300">
        <div className="flex h-16 w-full items-center justify-around px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-all cursor-pointer ${
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
                  <Icon className="w-5 h-5 stroke-[2.25]" />
                </div>
                <span className="text-[9px] font-bold tracking-tight uppercase">{item.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
