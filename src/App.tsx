/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./lib/firebase";
import { DataService } from "./lib/dataService";
import { Restaurant, DailyProfit, Expenses } from "./types";

import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import InputProfit from "./components/InputProfit";
import Biaya from "./components/Biaya";
import Laporan from "./components/Laporan";
import Target from "./components/Target";
import SkeletonLoader from "./components/SkeletonLoader";
import { ToastProvider, useToast } from "./components/Toast";

function MainApp() {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

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
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch data based on User Session (Real Firebase vs Demo)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const userId = user ? user.uid : "demo";

      try {
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
  }, [user]);

  // 3. Handlers for database updates (with automatic instant state update, NO reload)
  const handleSaveProfit = async (
    date: string, 
    profit: number, 
    notes?: string,
    omzet?: number,
    hppType?: "nominal" | "percentage",
    hppVal?: number,
    otherExpenses?: number
  ) => {
    if (!restaurant) return;
    const userId = user ? user.uid : "demo";

    try {
      const newEntry = await DataService.addDailyProfit(userId, restaurant.id, { 
        date, 
        profit, 
        notes,
        omzet,
        hppType,
        hppVal,
        otherExpenses
      });
      
      // Update profits list state instantly without page reload
      setProfits((prev) => {
        const filtered = prev.filter((p) => p.date !== date);
        return [newEntry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      });
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

  // Render correct tab view dynamically
  const renderView = () => {
    if (loading || !restaurant || !expenses) {
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
        return <Laporan profits={profits} />;
      case "target":
        return (
          <Target
            restaurant={restaurant}
            onSaveRestaurant={handleSaveRestaurant}
            userEmail={user ? user.email : null}
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
    <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950 flex flex-col font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        restaurantName={restaurant ? restaurant.name : "Taskwai"}
        isDark={isDark}
        toggleDark={toggleDark}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {renderView()}
      </main>

      <footer className="py-8 pb-24 lg:pb-8 border-t border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-400 dark:text-zinc-500 font-bold tracking-wider uppercase">
          Taskwai &copy; {new Date().getFullYear()} &bull; Dashboard Profit Harian khusus untuk Owner Restoran.
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
