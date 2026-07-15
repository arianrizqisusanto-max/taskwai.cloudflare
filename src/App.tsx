/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense } from "react";
import { DataService } from "./lib/dataService";
import { Restaurant, DailyProfit, Expenses } from "./types";

import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import SkeletonLoader from "./components/SkeletonLoader";
import { ToastProvider, useToast } from "./components/Toast";
import { LanguageProvider, useTranslation } from "./lib/LanguageContext";

// Lazy-loaded tab pages — only downloaded when the user navigates to them
const InputProfit = lazy(() => import("./components/InputProfit"));
const Biaya = lazy(() => import("./components/Biaya"));
const Laporan = lazy(() => import("./components/Laporan"));
const Target = lazy(() => import("./components/Target"));
const AdminConsole = lazy(() => import("./components/AdminConsole"));

function MainApp() {
  const { showToast } = useToast();
  const [user, setUser] = useState<any | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("taskwai_staff_session");
      return saved ? "input" : "dashboard";
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

  const toggleDark = () => setIsDark((prev) => !prev);

  // Prefetch lazy-loaded tab components right after Dashboard finishes rendering
  useEffect(() => {
    if (loading) return; // Wait until Dashboard data is loaded and rendered

    const triggerPrefetch = () => {
      import("./components/InputProfit").catch(() => {});
      import("./components/Biaya").catch(() => {});
      import("./components/Laporan").catch(() => {});
      import("./components/Target").catch(() => {});
      import("./components/AdminConsole").catch(() => {});
    };

    // Small 500ms grace period, then prefetch during browser idle time
    const timer = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(triggerPrefetch);
      } else {
        triggerPrefetch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loading]);

  // App States
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [profits, setProfits] = useState<DailyProfit[]>([]);
  const [expenses, setExpenses] = useState<Expenses | null>(null);

  // 1. Fetch Auth State from Cloudflare D1 Backend on startup
  useEffect(() => {
    const checkAuth = async () => {
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

  // 2. Fetch data based on User Session (Real D1 vs Demo vs Staff)
  useEffect(() => {
    if (!authInitialized) return;

    const fetchData = async () => {
      setLoading(true);
      
      if (user?.email === "arianrisqi@gmail.com") {
        setLoading(false);
        return;
      }

      const userId = staffSession ? staffSession.ownerId : (user ? user.uid : "demo");

      try {
        // Fetch restaurant config
        const restData = await DataService.getRestaurant(userId);
        setRestaurant(restData);

        // Fetch operating expenses and daily profits in parallel
        const [expData, profitsData] = await Promise.all([
          DataService.getExpenses(userId, restData.id),
          DataService.getDailyProfits(userId, restData.id)
        ]);

        setExpenses(expData);
        setProfits(profitsData);

      } catch (err) {
        console.error("Error loading Taskwai data:", err);
        showToast("Ada masalah memuat data. Menggunakan cadangan lokal.", "warning");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // If staff session is active, lock tab to "input"
    if (staffSession) {
      setActiveTab("input");
    }
  }, [user, authInitialized, staffSession]);

  // 3. Handlers for database updates
  const handleSaveProfit = async (
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
        const filtered = prev.filter((p) => p.date !== date);
        return [newEntry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
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
  };

  const handleSaveStaffCredentials = async (username: string, password: string) => {
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
  };

  const handleToggleStaffActive = async (active: boolean) => {
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
  };

  const handleDeleteProfit = async (id: string) => {
    if (!restaurant) return;
    const userId = user ? user.uid : "demo";

    try {
      await DataService.deleteDailyProfit(userId, restaurant.id, id);
      setProfits((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleSaveExpenses = async (data: Partial<Expenses>) => {
    if (!restaurant || !expenses) return;
    const userId = user ? user.uid : "demo";

    try {
      const updatedExpenses = await DataService.updateExpenses(userId, restaurant.id, data);
      setExpenses(updatedExpenses);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleSaveRestaurant = async (name: string, target: number) => {
    const userId = user ? user.uid : "demo";

    try {
      const updatedRest = await DataService.updateRestaurant(userId, { name, monthlyTargetProfit: target });
      setRestaurant(updatedRest);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleResetAll = async () => {
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
  };

  // Render correct tab view dynamically
  const renderView = () => {
    if (activeTab === "admin" && authInitialized) {
      return <AdminConsole />;
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
          />
        );
      case "biaya":
        return (
          <Biaya 
            expenses={expenses} 
            onSaveExpenses={handleSaveExpenses} 
          />
        );
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
        return <AdminConsole />;
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

  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-gray-50 dark:bg-zinc-950 dark:[background-image:none] flex flex-col font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <Suspense fallback={<SkeletonLoader />}>
          {renderView()}
        </Suspense>
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
