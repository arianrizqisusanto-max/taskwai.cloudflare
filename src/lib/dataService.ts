import { Restaurant, DailyProfit, Expenses } from "../types";

// Helper for local hashing (for fallback or demo mode)
async function hashCredentials(username: string, password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(`${username.trim().toLowerCase()}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Default Initial Data for Demo/Guest mode or new users
const DEFAULT_RESTAURANT = (userId: string): Restaurant => ({
  id: `rest_${userId}`,
  ownerId: userId,
  name: "Warung Kopi Senja",
  monthlyTargetProfit: 35000000,
  createdAt: new Date().toISOString(),
  staffUsername: "",
  staffPassword: "",
  staffHash: "",
  branches: []
});

const DEFAULT_EXPENSES = (userId: string, restaurantId: string): Expenses => ({
  id: `exp_${userId}`,
  restaurantId,
  sewaTempat: 6000000,
  gajiKaryawan: 12000000,
  royaltiFranchise: 2000000,
  listrik: 1800000,
  air: 500000,
  internet: 350000,
  marketing: 1500000,
  pajak: 1200000,
  biayaLain: 1000000,
  cicilanBank: 0,
  updatedAt: new Date().toISOString()
});

// Generate realistic mock daily profits for current month up to today
const generateDefaultDailyProfits = (restaurantId: string): DailyProfit[] => {
  const profits: DailyProfit[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDateNum = today.getDate();

  const notesPreset = [
    "Ramai pesanan katering makan siang",
    "Hujan lebat di sore hari, sepi pengunjung malam",
    "Weekend ramai dine-in keluarga",
    "Event promo gajian berjalan lancar",
    "Bahan baku naik sedikit, margin berkurang",
    "Penjualan via ojek online meningkat pesat",
    "Hari biasa, traffic stabil"
  ];

  const daysToGenerate = Math.max(5, currentDateNum);
  
  for (let i = 1; i <= daysToGenerate; i++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    
    if (i === currentDateNum && today.getHours() < 18) {
      continue;
    }

    const dateObj = new Date(currentYear, currentMonth, i);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    
    const baseProfit = isWeekend ? 2200000 : 1300000;
    const randomVariation = Math.floor(Math.random() * 800000);
    const dbProfit = baseProfit + randomVariation;

    const otherExpenses = Math.random() > 0.4 ? Math.floor(Math.random() * 150000) + 50000 : 0;
    const hppPercent = 35;
    const omzet = Math.round((dbProfit + otherExpenses) / (1 - hppPercent / 100));

    const branches = ["jakarta", "bandung", "surabaya", "Pusat"];
    const branchName = branches[Math.floor(Math.random() * branches.length)];
    
    const staffNames = ["Andi", "Budi", "Siti", "Rian", "Dewi"];
    const inputterName = Math.random() > 0.3 ? staffNames[Math.floor(Math.random() * staffNames.length)] : undefined;

    const note = notesPreset[Math.floor(Math.random() * notesPreset.length)];

    profits.push({
      id: `dp_${restaurantId}_${dateStr}`,
      restaurantId,
      date: dateStr,
      profit: dbProfit,
      notes: Math.random() > 0.3 ? note : "",
      createdAt: new Date(currentYear, currentMonth, i, 22, 0, 0).toISOString(),
      omzet,
      hppType: "percentage",
      hppVal: hppPercent,
      otherExpenses,
      branchName,
      inputterName
    });
  }

  return profits.sort((a, b) => a.date.localeCompare(b.date));
};

// LocalStorage Helper functions
const getLocal = <T>(key: string): T | null => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const setLocal = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Session isolation helpers for Big Boss mode
function isBigBossRoute(): boolean {
  return typeof window !== "undefined" && window.location.pathname === "/bigboss";
}

function getSessionTokenKey(): string {
  return isBigBossRoute() ? "taskwai_bigboss_session_token" : "taskwai_session_token";
}

// Helper for API request headers
function getHeaders() {
  const token = localStorage.getItem(getSessionTokenKey());
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const DataService = {
  // --- CUSTOM CLOUDFLARE AUTHENTICATION ---
  async loginGoogle(idToken: string, accountType?: 'regular' | 'bigboss'): Promise<any> {
    const type = accountType || (isBigBossRoute() ? 'bigboss' : 'regular');
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, accountType: type })
    });
    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err.error || 'Gagal login dengan Google');
    }
    const data = await res.json() as any;
    if (data.token) {
      localStorage.setItem(getSessionTokenKey(), data.token);
    }
    return data;
  },

  async getMe(): Promise<any> {
    const token = localStorage.getItem(getSessionTokenKey());
    if (!token) return { user: null };

    try {
      const res = await fetch('/api/auth/me', {
        headers: getHeaders()
      });
      if (!res.ok) {
        localStorage.removeItem(getSessionTokenKey());
        return { user: null };
      }
      return await res.json();
    } catch (e) {
      console.error('Error fetching auth state:', e);
      return { user: null };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) {
      console.error('Error calling logout api:', e);
    } finally {
      localStorage.removeItem(getSessionTokenKey());
    }
  },

  // --- RESTAURANT ENDPOINTS ---
  async getRestaurant(userId: string): Promise<Restaurant> {
    if (!userId || userId === "demo") {
      let rest = getLocal<Restaurant>("taskwai_restaurant");
      if (!rest) {
        rest = DEFAULT_RESTAURANT("demo");
        setLocal("taskwai_restaurant", rest);
      }
      return rest;
    }

    try {
      const res = await fetch('/api/restaurant', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch restaurant');
      return await res.json() as Restaurant;
    } catch (error) {
      console.error("Error getting restaurant from Cloudflare API:", error);
      let rest = getLocal<Restaurant>(`taskwai_restaurant_${userId}`);
      if (!rest) rest = DEFAULT_RESTAURANT(userId);
      return rest;
    }
  },

  async updateRestaurant(userId: string, data: Partial<Restaurant>): Promise<Restaurant> {
    if (!userId || userId === "demo") {
      const rest = await this.getRestaurant("demo");
      const updated = { ...rest, ...data };
      setLocal("taskwai_restaurant", updated);
      return updated;
    }

    try {
      const res = await fetch('/api/restaurant', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update restaurant');
      return await res.json() as Restaurant;
    } catch (error) {
      console.error("Error updating restaurant:", error);
      const rest = getLocal<Restaurant>(`taskwai_restaurant_${userId}`) || DEFAULT_RESTAURANT(userId);
      const updated = { ...rest, ...data };
      setLocal(`taskwai_restaurant_${userId}`, updated);
      return updated;
    }
  },

  // --- EXPENSES ENDPOINTS ---
  async getExpenses(userId: string, restaurantId: string, month?: string): Promise<Expenses> {
    if (!userId || userId === "demo") {
      let exp = getLocal<Expenses>("taskwai_expenses");
      if (!exp) {
        exp = DEFAULT_EXPENSES("demo", restaurantId);
        setLocal("taskwai_expenses", exp);
      }
      return exp;
    }

    try {
      const monthParam = month ? `?month=${month}` : '';
      const res = await fetch(`/api/expenses${monthParam}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return await res.json() as Expenses;
    } catch (error) {
      console.error("Error getting expenses:", error);
      let exp = getLocal<Expenses>(`taskwai_expenses_${userId}`);
      if (!exp) exp = DEFAULT_EXPENSES(userId, restaurantId);
      return exp;
    }
  },

  async updateExpenses(userId: string, restaurantId: string, data: Partial<Expenses> & { month?: string }): Promise<Expenses> {
    if (!userId || userId === "demo") {
      const exp = await this.getExpenses("demo", restaurantId);
      const updated = { ...exp, ...data, updatedAt: new Date().toISOString() };
      setLocal("taskwai_expenses", updated);
      return updated;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update expenses');
      return await res.json() as Expenses;
    } catch (error) {
      console.error("Error updating expenses:", error);
      const exp = getLocal<Expenses>(`taskwai_expenses_${userId}`) || DEFAULT_EXPENSES(userId, restaurantId);
      const updated = { ...exp, ...data, updatedAt: new Date().toISOString() };
      setLocal(`taskwai_expenses_${userId}`, updated);
      return updated;
    }
  },

  // --- DAILY PROFITS ENDPOINTS ---
  async getDailyProfits(userId: string, restaurantId: string): Promise<DailyProfit[]> {
    if (!userId || userId === "demo") {
      let profits = getLocal<DailyProfit[]>("taskwai_daily_profits");
      if (!profits || (profits.length > 0 && profits[0].omzet === undefined)) {
        profits = generateDefaultDailyProfits(restaurantId);
        setLocal("taskwai_daily_profits", profits);
      }
      return profits.sort((a, b) => b.date.localeCompare(a.date));
    }

    try {
      const res = await fetch('/api/profits', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch profits');
      return await res.json() as DailyProfit[];
    } catch (error) {
      console.error("Error getting daily profits:", error);
      let profits = getLocal<DailyProfit[]>(`taskwai_daily_profits_${userId}`);
      if (!profits || (profits.length > 0 && profits[0].omzet === undefined)) {
        profits = generateDefaultDailyProfits(restaurantId);
        setLocal(`taskwai_daily_profits_${userId}`, profits);
      }
      return profits.sort((a, b) => b.date.localeCompare(a.date));
    }
  },

  async addDailyProfit(
    userId: string, 
    restaurantId: string, 
    entry: { 
      date: string; 
      profit: number; 
      notes?: string;
      omzet?: number;
      hppType?: "nominal" | "percentage";
      hppVal?: number;
      otherExpenses?: number;
      branchName?: string;
      inputterName?: string;
    }
  ): Promise<DailyProfit> {
    if (!userId || userId === "demo") {
      const id = `dp_${restaurantId}_${entry.date}_${Math.random().toString(36).substring(2, 7)}`;
      const newProfit: DailyProfit = {
        id,
        restaurantId,
        date: entry.date,
        profit: entry.profit,
        notes: entry.notes || "",
        createdAt: new Date().toISOString(),
        omzet: entry.omzet,
        hppType: entry.hppType,
        hppVal: entry.hppVal,
        otherExpenses: entry.otherExpenses,
        branchName: entry.branchName,
        inputterName: entry.inputterName
      };

      const profits = await this.getDailyProfits("demo", restaurantId);
      const targetBranch = entry.branchName || "";
      const filtered = profits.filter((p) => {
        const pBranch = p.branchName || "";
        return !(p.date === entry.date && pBranch.trim().toLowerCase() === targetBranch.trim().toLowerCase());
      });
      const updated = [newProfit, ...filtered];
      setLocal("taskwai_daily_profits", updated);

      if (entry.branchName && entry.branchName.trim()) {
        const cleanedBranch = entry.branchName.trim();
        const rest = getLocal<Restaurant>("taskwai_restaurant") || DEFAULT_RESTAURANT("demo");
        const currentBranches = rest.branches || [];
        if (!currentBranches.includes(cleanedBranch)) {
          rest.branches = [...currentBranches, cleanedBranch];
          setLocal("taskwai_restaurant", rest);
        }
      }

      return newProfit;
    }

    try {
      const res = await fetch('/api/profits', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(entry)
      });
      if (!res.ok) throw new Error('Failed to add daily profit');
      return await res.json() as DailyProfit;
    } catch (error) {
      console.error("Error adding daily profit:", error);
      throw error;
    }
  },

  async deleteDailyProfit(userId: string, restaurantId: string, id: string): Promise<void> {
    if (!userId || userId === "demo") {
      const profits = await this.getDailyProfits("demo", restaurantId);
      const filtered = profits.filter((p) => p.id !== id);
      setLocal("taskwai_daily_profits", filtered);
      return;
    }

    try {
      const res = await fetch(`/api/profits?id=${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete daily profit');
    } catch (error) {
      console.error("Error deleting daily profit:", error);
      throw error;
    }
  },

  // --- STAFF ENDPOINTS ---
  async saveStaffCredentials(userId: string, restaurantId: string, username: string, password: string): Promise<void> {
    if (!userId || userId === "demo") {
      const rest = getLocal<Restaurant>("taskwai_restaurant") || DEFAULT_RESTAURANT("demo");
      rest.staffUsername = username;
      rest.staffPassword = password;
      rest.staffActive = true;
      rest.staffUpdatedAt = new Date().toISOString();
      setLocal("taskwai_restaurant", rest);
      return;
    }

    try {
      const res = await fetch('/api/staff/setup', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error('Failed to save staff credentials');
    } catch (error) {
      console.error("Error saving staff credentials:", error);
      throw error;
    }
  },

  async toggleStaffActive(userId: string, restaurantId: string, active: boolean): Promise<void> {
    if (!userId || userId === "demo") {
      const rest = getLocal<Restaurant>("taskwai_restaurant") || DEFAULT_RESTAURANT("demo");
      rest.staffActive = active;
      setLocal("taskwai_restaurant", rest);
      return;
    }

    try {
      const res = await fetch('/api/staff/toggle', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ active })
      });
      if (!res.ok) throw new Error('Failed to toggle staff status');
    } catch (error) {
      console.error("Error toggling staff status:", error);
      throw error;
    }
  },

  async loginStaff(username: string, password: string): Promise<{ restaurantId: string; ownerId: string }> {
    if (username === "demo_staff" && password === "demo123") {
      return { restaurantId: "rest_demo", ownerId: "demo" };
    }

    const localRest = getLocal<Restaurant>("taskwai_restaurant");
    if (localRest && localRest.staffUsername === username && localRest.staffPassword === password) {
      if (localRest.staffActive === false) {
        throw new Error("Akun staff telah dinonaktifkan oleh pemilik usaha.");
      }
      return { restaurantId: localRest.id, ownerId: localRest.ownerId };
    }

    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json() as any;
        throw new Error(err.error || 'Username atau password staff salah.');
      }
      const data = await res.json() as any;
      if (data.token) {
        localStorage.setItem('taskwai_session_token', data.token);
      }
      return { restaurantId: data.restaurantId, ownerId: data.ownerId };
    } catch (error: any) {
      console.error("Staff login error:", error);
      throw error;
    }
  },

  // --- GENERAL SYSTEM ENDPOINTS ---
  async resetAllData(userId: string, restaurantId: string): Promise<void> {
    if (!userId || userId === "demo") {
      localStorage.removeItem("taskwai_restaurant");
      localStorage.removeItem("taskwai_daily_profits");
      localStorage.removeItem("taskwai_expenses");
      localStorage.removeItem("taskwai_staff_local_history");
      localStorage.removeItem("taskwai_last_branch");
      localStorage.removeItem("taskwai_last_inputter");
      localStorage.removeItem(`taskwai_restaurant_${userId}`);
      localStorage.removeItem(`taskwai_daily_profits_${userId}`);
      localStorage.removeItem(`taskwai_expenses_${userId}`);
      return;
    }

    try {
      const res = await fetch('/api/restaurant/reset', {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to reset all data');
    } catch (error) {
      console.error("Error resetting all data:", error);
      throw error;
    }
  },

  async getSystemStats(todayStr: string): Promise<{
    totalRestaurants: number;
    activeTodayCount: number;
  }> {
    try {
      const res = await fetch(`/api/restaurant/stats?today=${todayStr}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return await res.json() as any;
    } catch (e) {
      console.error("Error getting system stats:", e);
      const localRest = getLocal<Restaurant>("taskwai_restaurant");
      const localProfits = getLocal<any[]>("taskwai_daily_profits") || [];
      const hasToday = localProfits.some(p => p.date === todayStr);

      return {
        totalRestaurants: localRest ? 1 : 0,
        activeTodayCount: (localRest && hasToday) ? 1 : 0
      };
    }
  },

  async generateBigBossCode(): Promise<{ code: string; expiresAt: string }> {
    const res = await fetch('/api/restaurant/auth-code', {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err.error || 'Gagal menghasilkan kode otorisasi');
    }
    return await res.json();
  },

  async getBigBossBranches(): Promise<{ branches: any[] }> {
    const res = await fetch('/api/bigboss', {
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err.error || 'Gagal mengambil data cabang');
    }
    return await res.json();
  },

  async linkBigBossBranch(code: string): Promise<any> {
    const res = await fetch('/api/bigboss', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code })
    });
    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err.error || 'Gagal menautkan cabang');
    }
    return await res.json();
  },

  async unlinkBigBossBranch(restaurantId: string): Promise<any> {
    const res = await fetch(`/api/bigboss?restaurantId=${encodeURIComponent(restaurantId)}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err.error || 'Gagal menghapus cabang');
    }
    return await res.json();
  }
};
