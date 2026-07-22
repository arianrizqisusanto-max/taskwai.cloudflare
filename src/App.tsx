/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Version: 1.0.4-cache-routing-fix
 */

import { useState, useEffect, lazy, Suspense, ComponentType, useCallback, useRef } from "react";
import { DataService } from "./lib/dataService";
import { Restaurant, DailyProfit, Expenses } from "./types";

import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import SkeletonLoader from "./components/SkeletonLoader";
import { ToastProvider, useToast } from "./components/Toast";
import { LanguageProvider, useTranslation } from "./lib/LanguageContext";
import { Sun, Moon, Building2 } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ChunkErrorFallback - shown when a lazy chunk cannot be loaded even after one retry
function ChunkErrorFallback() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", padding: "2rem", textAlign: "center", gap: "1rem"
    }}>
      <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>
        Versi aplikasi telah diperbarui.
      </p>
      <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
        Silakan muat ulang halaman untuk mendapatkan versi terbaru.
      </p>
      <button
        onClick={() => {
          sessionStorage.removeItem("taskwai_chunk_reload");
          window.location.reload();
        }}
        style={{
          marginTop: "0.5rem", padding: "0.75rem 2rem", borderRadius: "0.5rem",
          background: "#10B981", color: "#fff", fontWeight: 600, fontSize: "1rem",
          border: "none", cursor: "pointer"
        }}
      >
        🔄 Muat Ulang
      </button>
    </div>
  );
}

// Helper: catch chunk load errors (hash mismatch after deploy).
// Reload ONCE. If it still fails, show an error banner instead of infinite loop.
function safeLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((error) => {
      console.error("Failed to load chunk:", error);
      if (typeof window !== "undefined") {
        const key = "taskwai_chunk_reload";
        const last = sessionStorage.getItem(key);
        const now = Date.now();
        // Only auto-reload once per 30 seconds to prevent infinite loops
        if (!last || now - parseInt(last, 10) > 30000) {
          sessionStorage.setItem(key, String(now));
          window.location.reload();
        }
      }
      // If we already reloaded recently, render error fallback instead of blank
      return { default: ChunkErrorFallback as unknown as T };
    })
  );
}

// Lazy-loaded tab pages — only downloaded when the user navigates to them
const InputProfit = safeLazy(() => import("./components/InputProfit"));
const Biaya = safeLazy(() => import("./components/Biaya"));
const Laporan = safeLazy(() => import("./components/Laporan"));
const Target = safeLazy(() => import("./components/SettingsPanel"));
const AdminConsole = safeLazy(() => import("./components/AdminConsole"));
const BigBoss = safeLazy(() => import("./components/BigBoss"));

function MainApp() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [user, setUser] = useState<any | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/bigboss") return "bigboss";

      const savedStaff = localStorage.getItem("taskwai_staff_session");
      if (savedStaff) return "input";
      
      const savedTab = sessionStorage.getItem("taskwai_active_tab");
      return savedTab || "dashboard";
    }
    return "dashboard";
  });

  // Staff Mode Session State
  const [staffSession, setStaffSession] = useState<{ restaurantId: string; ownerId: string; role: "staff" } | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taskwai_staff_session");
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  // Dark Mode state with persistence in localStorage
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        return savedTheme === "dark";
      }
      return false;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Persist active tab to survive auto-recovery chunk load reloads
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("taskwai_active_tab", activeTab);
    }
  }, [activeTab]);

  const toggleDark = () => setIsDark((prev) => !prev);



  // App States
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [profits, setProfits] = useState<DailyProfit[]>([]);
  const [expenses, setExpenses] = useState<Expenses | null>(null);
  const [expensesMonth, setExpensesMonth] = useState(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    const checkAuth = async () => {
      console.log("Taskwai Init Version 1.0.6-strict-data-sync");
      try {
        const data = await DataService.getMe();
        if (data.user) {
          setUser(data.user);
          if (data.user.email === "arianrisqi@gmail.com") {
            setActiveTab("admin");
          }
        } else if (data.staffSession) {
          setStaffSession(data.staffSession);
          localStorage.setItem("taskwai_staff_session", JSON.stringify(data.staffSession));
          setActiveTab("input");
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setAuthInitialized(true);
      }
    };
    checkAuth();
  }, []);

  // 2. Fetch data based on User Session (Real D1 vs Demo vs Staff) with Auto-Revalidation
  useEffect(() => {
    if (!authInitialized || activeTab === "bigboss") {
      if (activeTab === "bigboss") setLoading(false);
      return;
    }

    const fetchData = async (isBackground = false) => {
      if (user?.email === "arianrisqi@gmail.com") {
        setLoading(false);
        return;
      }

      const userId = staffSession ? staffSession.ownerId : (user ? user.uid : "demo");

      // Only trigger full screen loading (Skeleton) if user account changed or initial load
      if (!isBackground && lastUserId.current !== userId) {
        setLoading(true);
      }
      lastUserId.current = userId;

      try {
        // Fetch restaurant config
        const restData = await DataService.getRestaurant(userId);
        setRestaurant(restData);

        // Fetch operating expenses and daily profits in parallel
        const [expData, profitsData] = await Promise.all([
          DataService.getExpenses(userId, restData.id, expensesMonth),
          DataService.getDailyProfits(userId, restData.id)
        ]);

        setExpenses(expData);
        setProfits(profitsData);

      } catch (err) {
        console.error("Error loading Taskwai data:", err);
        if (!isBackground) {
          showToast("Ada masalah memuat data. Menggunakan cadangan lokal.", "warning");
        }
      } finally {
        if (!isBackground) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Revalidate data whenever the tab/window becomes active or focused again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    };
    const handleFocus = () => {
      fetchData(true);
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Auto polling every 60s when tab is active to ensure data is synced
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    }, 60000);

    // If staff session is active, lock tab to "input"
    if (staffSession) {
      setActiveTab("input");
    }

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [user, authInitialized, staffSession, expensesMonth]);

  // 3. Handlers for database updates
  const handleSaveProfit = useCallback(async (
    date: string, 
    profit: number, 
    notes?: string,
    omzet?: number,
    hppType?: "nominal" | "percentage",
    hppVal?: number,
    otherExpenses?: number,
    branchName?: string,
    inputterName?: string
  ) => {
    if (!restaurant) return;
    const userId = staffSession ? staffSession.ownerId : (user ? user.uid : "demo");

    try {
      const newEntry = await DataService.addDailyProfit(userId, restaurant.id, { 
        date, 
        profit, 
        notes,
        omzet,
        hppType,
        hppVal,
        otherExpenses,
        branchName,
        inputterName
      });
      
      // Update profits list state instantly without page reload
      setProfits((prev) => {
        const filtered = prev.filter((p) => p.id !== newEntry.id);
        return [newEntry, ...filtered].sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.createdAt.localeCompare(a.createdAt);
        });
      });

      // Instantly update the restaurant branches cache locally
      if (branchName && branchName.trim()) {
        const cleaned = branchName.trim();
        setRestaurant(prev => {
          if (!prev) return null;
          const current = prev.branches || [];
          if (!current.includes(cleaned)) {
            return { ...prev, branches: [...current, cleaned] };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [restaurant, staffSession, user]);

  const handleSaveStaffCredentials = useCallback(async (username: string, password: string) => {
    if (!restaurant) return;
    const userId = user ? user.uid : "demo";
    try {
      await DataService.saveStaffCredentials(userId, restaurant.id, username, password);
      // Update local state
      setRestaurant(prev => prev ? { 
        ...prev, 
        staffUsername: username, 
        staffPassword: password,
        staffActive: true,
        staffUpdatedAt: new Date().toISOString()
      } : null);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [restaurant, user]);

  const handleToggleStaffActive = useCallback(async (active: boolean) => {
    if (!restaurant) return;
    const userId = user ? user.uid : "demo";
    try {
      await DataService.toggleStaffActive(userId, restaurant.id, active);
      // Update local state
      setRestaurant(prev => prev ? { ...prev, staffActive: active } : null);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [restaurant, user]);

  const handleDeleteProfit = useCallback(async (id: string) => {
    if (!restaurant) return;
    const userId = user ? user.uid : "demo";

    try {
      await DataService.deleteDailyProfit(userId, restaurant.id, id);
      setProfits((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [restaurant, user]);

  const handleSaveExpenses = useCallback(async (data: Partial<Expenses>) => {
    if (!restaurant || !expenses) return;
    const userId = user ? user.uid : "demo";

    try {
      const updatedExpenses = await DataService.updateExpenses(userId, restaurant.id, {
        ...data,
        month: expensesMonth
      });
      setExpenses(updatedExpenses);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [restaurant, expenses, user, expensesMonth]);

  const handleSaveRestaurant = useCallback(async (name: string, target: number) => {
    const userId = user ? user.uid : "demo";

    try {
      const updatedRest = await DataService.updateRestaurant(userId, { name, monthlyTargetProfit: target });
      setRestaurant(updatedRest);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [user]);

  const handleResetAll = useCallback(async () => {
    if (!restaurant) return;
    const userId = user ? user.uid : "demo";
    try {
      await DataService.resetAllData(userId, restaurant.id);
      showToast(t("target.resetSuccess", "Semua data berhasil direset. Mulai usaha dari nol lagi!"), "success");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast(t("target.resetError", "Gagal mereset data."), "error");
    }
  }, [restaurant, user, t, showToast]);

  // Render correct tab view dynamically
  const renderView = () => {
    if (activeTab === "bigboss" && authInitialized) {
      return <BigBoss setActiveTab={setActiveTab} isDark={isDark} toggleDark={toggleDark} />;
    }

    if (activeTab === "admin" && authInitialized) {
      if (user?.email === "arianrisqi@gmail.com") {
        return <AdminConsole />;
      }
    }

    if (!authInitialized || loading || !restaurant || !expenses) {
      return <SkeletonLoader />;
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            restaurant={restaurant} 
            profits={profits} 
            expenses={expenses} 
          />
        );
      case "input":
        return (
          <InputProfit
            profits={profits}
            onSaveProfit={handleSaveProfit}
            onDeleteProfit={handleDeleteProfit}
            isStaffMode={!!staffSession}
            restaurant={restaurant}
            expenses={expenses}
          />
        );
      case "biaya":
        return (
          <Biaya 
            expenses={expenses} 
            onSaveExpenses={handleSaveExpenses} 
            expensesMonth={expensesMonth}
            onExpensesMonthChange={setExpensesMonth}
            setActiveTab={setActiveTab}
          />
        );
      case "bigboss":
        return <BigBoss setActiveTab={setActiveTab} isDark={isDark} toggleDark={toggleDark} />;
      case "laporan":
        return <Laporan profits={profits} restaurant={restaurant} />;
      case "target":
        return (
          <Target
            restaurant={restaurant}
            onSaveRestaurant={handleSaveRestaurant}
            onSaveStaffCredentials={handleSaveStaffCredentials}
            onToggleStaffActive={handleToggleStaffActive}
            userEmail={user ? user.email : null}
            onResetAll={handleResetAll}
          />
        );
      case "admin":
        if (user?.email === "arianrisqi@gmail.com") {
          return <AdminConsole />;
        }
        return (
          <Dashboard 
            restaurant={restaurant} 
            profits={profits} 
            expenses={expenses} 
          />
        );
      default:
        return (
          <Dashboard 
            restaurant={restaurant} 
            profits={profits} 
            expenses={expenses} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-gray-50 dark:bg-zinc-950 dark:[background-image:none] flex flex-col font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {activeTab !== "bigboss" && (
        <Navbar
          user={user}
          setUser={setUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          restaurantName={restaurant ? restaurant.name : "taskwai"}
          isDark={isDark}
          toggleDark={toggleDark}
          authInitialized={authInitialized}
          staffSession={staffSession}
          setStaffSession={setStaffSession}
        />
      )}

      <main className={`flex-1 w-full ${activeTab === "bigboss" ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8"}`}>
        <ErrorBoundary>
          <Suspense fallback={<SkeletonLoader />}>
            {renderView()}
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="py-6 pb-24 lg:pb-6 border-t border-zinc-200/60 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
          <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase">
            Taskwai &copy; {new Date().getFullYear()}
          </span>
          <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">·</span>
          <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wide">
            {t("nav.profitDashboard", "Dashboard Usaha Anda.")}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </LanguageProvider>
  );
}
