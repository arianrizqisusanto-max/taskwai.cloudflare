/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { onAuthStateChanged, User, signInAnonymously } from "firebase/auth";
import { auth } from "./lib/firebase";
import { DataService } from "./lib/dataService";
import { Restaurant, DailyProfit, Expenses } from "./types";

import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import InputProfit from "./components/InputProfit";
import Biaya from "./components/Biaya";
import Laporan from "./components/Laporan";
import Target from "./components/Target";
import AdminConsole from "./components/AdminConsole";
import SkeletonLoader from "./components/SkeletonLoader";
import { ToastProvider, useToast } from "./components/Toast";
import { LanguageProvider, useTranslation } from "./lib/LanguageContext";

function MainApp() {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
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

  // App States
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [profits, setProfits] = useState<DailyProfit[]>([]);
  const [expenses, setExpenses] = useState<Expenses | null>(null);

  // 1. Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
      if (currentUser?.email === "arianrisqi@gmail.com") {
        setActiveTab("admin");
      } else {
        setActiveTab((prev) => (prev === "admin" ? "dashboard" : prev));
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch data based on User Session (Real Firebase vs Demo vs Staff)
  useEffect(() => {
    if (!authInitialized) return;

    const fetchData = async () => {
      setLoading(true);
      
      let currentUser = user;
      if (staffSession && !currentUser) {
        try {
          console.log("Restoring anonymous staff auth session...");
          const userCredential = await signInAnonymously(auth);
          currentUser = userCredential.user;
          setUser(currentUser);
        } catch (authErr) {
          console.error("Failed to restore anonymous staff auth:", authErr);
        }
      }

      const userId = staffSession ? staffSession.ownerId : (currentUser ? currentUser.uid : "demo");

      try {
        // If staff session is active locally but the Firestore session document is missing, restore it.
        if (staffSession && currentUser && currentUser.isAnonymous) {
          await DataService.ensureStaffSession(currentUser.uid, staffSession.restaurantId, staffSession.ownerId);
        }

        // Fetch restaurant config
        const restData = await DataService.getRestaurant(userId);
        setRestaurant(restData);

        // Fetch operating expenses
        const expData = await DataService.getExpenses(userId, restData.id);
        setExpenses(expData);

        // Fetch daily profits logs
        const profitsData = await DataService.getDailyProfits(userId, restData.id);
        setProfits(profitsData);

      } catch (err) {
        console.error("Error loading Taskwai data:", err);
        showToast("Ada masalah memuat data. Menggunakan cadangan lokal.", "warning");
      } finally {
        // Small synthetic timeout to demonstrate beautiful premium loading experience
        setTimeout(() => {
          setLoading(false);
        }, 600);
      }
    };

    fetchData();

    // If staff session is active, lock tab to "input"
    if (staffSession) {
      setActiveTab("input");
    }
  }, [user, authInitialized, staffSession]);

  // 3. Handlers for database updates (with automatic instant state update, NO reload)
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
      // Delay slightly for toast visibility, then reload to restore clean guest/fresh setup
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
    <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950 flex flex-col font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      <Navbar
        user={user}
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
        {renderView()}
      </main>

      <footer className="py-8 pb-24 lg:pb-8 border-t border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-400 dark:text-zinc-500 font-bold tracking-wider uppercase">
          Taskwai &copy; {new Date().getFullYear()} &bull; {t("nav.profitDashboard", "Dashboard Usaha Anda.")}
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
