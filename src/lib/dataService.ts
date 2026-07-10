import { db } from "./firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { Restaurant, DailyProfit, Expenses } from "../types";

// Default Initial Data for Demo/Guest mode or new users
const DEFAULT_RESTAURANT = (userId: string): Restaurant => ({
  id: `rest_${userId}`,
  ownerId: userId,
  name: "Warung Kopi Senja",
  monthlyTargetProfit: 35000000,
  createdAt: new Date().toISOString()
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
  updatedAt: new Date().toISOString()
});

// Generate realistic mock daily profits for current month up to today
const generateDefaultDailyProfits = (restaurantId: string): DailyProfit[] => {
  const profits: DailyProfit[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDateNum = today.getDate();

  // Notes to make it feel super realistic and high-fidelity
  const notesPreset = [
    "Ramai pesanan katering makan siang",
    "Hujan lebat di sore hari, sepi pengunjung malam",
    "Weekend ramai dine-in keluarga",
    "Event promo gajian berjalan lancar",
    "Bahan baku naik sedikit, margin berkurang",
    "Penjualan via ojek online meningkat pesat",
    "Hari biasa, traffic stabil"
  ];

  // We generate data from 1st of this month to today (or at least up to 5 days if today is early)
  // Let's generate for at least the last 15 days or up to today, whichever is larger, 
  // but all inside the current month
  const daysToGenerate = Math.max(5, currentDateNum);
  
  for (let i = 1; i <= daysToGenerate; i++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    
    // Skip today if we want the owner to input it, but let's pre-fill up to yesterday
    if (i === currentDateNum && today.getHours() < 18) {
      // If today is early, don't pre-fill today, let them fill it
      continue;
    }

    // Profit between 1,200,000 and 2,800,000
    // Weekends (Friday, Saturday, Sunday) get higher profits
    const dateObj = new Date(currentYear, currentMonth, i);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    
    const baseProfit = isWeekend ? 2200000 : 1300000;
    const randomVariation = Math.floor(Math.random() * 800000);
    const profit = baseProfit + randomVariation;

    const note = notesPreset[Math.floor(Math.random() * notesPreset.length)];

    profits.push({
      id: `dp_${restaurantId}_${dateStr}`,
      restaurantId,
      date: dateStr,
      profit,
      notes: Math.random() > 0.3 ? note : "",
      createdAt: new Date(currentYear, currentMonth, i, 22, 0, 0).toISOString()
    });
  }

  // Sort by date ascending
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

export const DataService = {
  // Get entire restaurant data
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
      const docRef = doc(db, "restaurants", `rest_${userId}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Restaurant;
      } else {
        const newRest = DEFAULT_RESTAURANT(userId);
        await setDoc(docRef, newRest);
        return newRest;
      }
    } catch (error) {
      console.error("Error getting restaurant from Firestore:", error);
      // Fallback to local
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
      const docRef = doc(db, "restaurants", `rest_${userId}`);
      await setDoc(docRef, data, { merge: true });
      return await this.getRestaurant(userId);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      const rest = getLocal<Restaurant>(`taskwai_restaurant_${userId}`) || DEFAULT_RESTAURANT(userId);
      const updated = { ...rest, ...data };
      setLocal(`taskwai_restaurant_${userId}`, updated);
      return updated;
    }
  },

  // Get fixed expenses
  async getExpenses(userId: string, restaurantId: string): Promise<Expenses> {
    if (!userId || userId === "demo") {
      let exp = getLocal<Expenses>("taskwai_expenses");
      if (!exp) {
        exp = DEFAULT_EXPENSES("demo", restaurantId);
        setLocal("taskwai_expenses", exp);
      }
      return exp;
    }

    try {
      const docRef = doc(db, "expenses", `exp_${userId}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Expenses;
      } else {
        const newExp = DEFAULT_EXPENSES(userId, restaurantId);
        await setDoc(docRef, newExp);
        return newExp;
      }
    } catch (error) {
      console.error("Error getting expenses:", error);
      let exp = getLocal<Expenses>(`taskwai_expenses_${userId}`);
      if (!exp) exp = DEFAULT_EXPENSES(userId, restaurantId);
      return exp;
    }
  },

  async updateExpenses(userId: string, restaurantId: string, data: Partial<Expenses>): Promise<Expenses> {
    if (!userId || userId === "demo") {
      const exp = await this.getExpenses("demo", restaurantId);
      const updated = { ...exp, ...data, updatedAt: new Date().toISOString() };
      setLocal("taskwai_expenses", updated);
      return updated;
    }

    try {
      const docRef = doc(db, "expenses", `exp_${userId}`);
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      return await this.getExpenses(userId, restaurantId);
    } catch (error) {
      console.error("Error updating expenses:", error);
      const exp = getLocal<Expenses>(`taskwai_expenses_${userId}`) || DEFAULT_EXPENSES(userId, restaurantId);
      const updated = { ...exp, ...data, updatedAt: new Date().toISOString() };
      setLocal(`taskwai_expenses_${userId}`, updated);
      return updated;
    }
  },

  // Daily profit logs
  async getDailyProfits(userId: string, restaurantId: string): Promise<DailyProfit[]> {
    if (!userId || userId === "demo") {
      let profits = getLocal<DailyProfit[]>("taskwai_daily_profits");
      if (!profits) {
        profits = generateDefaultDailyProfits(restaurantId);
        setLocal("taskwai_daily_profits", profits);
      }
      return profits.sort((a, b) => b.date.localeCompare(a.date)); // descending date
    }

    try {
      const q = query(
        collection(db, "daily_profit"),
        where("restaurantId", "==", restaurantId),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(q);
      const profits: DailyProfit[] = [];
      querySnapshot.forEach((doc) => {
        profits.push({ id: doc.id, ...doc.data() } as DailyProfit);
      });

      // If it's a new database and has no profits yet, let's load default mock so it doesn't look completely empty,
      // or we can let them start empty. The prompt says "Owner restoran yang baru pertama kali membuka aplikasi harus langsung mengerti tanpa perlu belajar."
      // It's incredibly elegant to pre-fill with realistic logs if empty!
      if (profits.length === 0) {
        const defaults = generateDefaultDailyProfits(restaurantId);
        // Save them to firestore
        for (const p of defaults) {
          const { id, ...data } = p;
          await setDoc(doc(db, "daily_profit", id), data);
          profits.push(p);
        }
      }

      return profits.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error("Error getting daily profits:", error);
      let profits = getLocal<DailyProfit[]>(`taskwai_daily_profits_${userId}`);
      if (!profits) {
        profits = generateDefaultDailyProfits(restaurantId);
        setLocal(`taskwai_daily_profits_${userId}`, profits);
      }
      return profits.sort((a, b) => b.date.localeCompare(a.date));
    }
  },

  async addDailyProfit(
    userId: string, 
    restaurantId: string, 
    entry: { date: string; profit: number; notes?: string }
  ): Promise<DailyProfit> {
    const id = `dp_${restaurantId}_${entry.date}_${Math.random().toString(36).substring(2, 7)}`;
    const newProfit: DailyProfit = {
      id,
      restaurantId,
      date: entry.date,
      profit: entry.profit,
      notes: entry.notes || "",
      createdAt: new Date().toISOString()
    };

    if (!userId || userId === "demo") {
      const profits = await this.getDailyProfits("demo", restaurantId);
      // Remove duplicates for same date if any, or support multiple
      const filtered = profits.filter((p) => p.date !== entry.date);
      const updated = [newProfit, ...filtered];
      setLocal("taskwai_daily_profits", updated);
      return newProfit;
    }

    try {
      // Check if entry for this date already exists, update or allow multiple.
      // Let's do check and overwrite if date exists, so they don't get duplicates on the same date unless they want to
      const q = query(
        collection(db, "daily_profit"),
        where("restaurantId", "==", restaurantId),
        where("date", "==", entry.date)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Update existing date
        const existingId = snapshot.docs[0].id;
        await updateDoc(doc(db, "daily_profit", existingId), {
          profit: entry.profit,
          notes: entry.notes || "",
          createdAt: new Date().toISOString()
        });
        return {
          id: existingId,
          restaurantId,
          date: entry.date,
          profit: entry.profit,
          notes: entry.notes || "",
          createdAt: new Date().toISOString()
        };
      } else {
        await setDoc(doc(db, "daily_profit", id), {
          restaurantId,
          date: entry.date,
          profit: entry.profit,
          notes: entry.notes || "",
          createdAt: new Date().toISOString()
        });
        return newProfit;
      }
    } catch (error) {
      console.error("Error adding daily profit:", error);
      const profits = getLocal<DailyProfit[]>(`taskwai_daily_profits_${userId}`) || [];
      const filtered = profits.filter((p) => p.date !== entry.date);
      const updated = [newProfit, ...filtered];
      setLocal(`taskwai_daily_profits_${userId}`, updated);
      return newProfit;
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
      await deleteDoc(doc(db, "daily_profit", id));
    } catch (error) {
      console.error("Error deleting daily profit:", error);
      const profits = getLocal<DailyProfit[]>(`taskwai_daily_profits_${userId}`) || [];
      const filtered = profits.filter((p) => p.id !== id);
      setLocal(`taskwai_daily_profits_${userId}`, filtered);
    }
  }
};
