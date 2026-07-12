import { db, auth } from "./firebase";
import { signInAnonymously } from "firebase/auth";
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
  limit
} from "firebase/firestore";
import { Restaurant, DailyProfit, Expenses } from "../types";

// Helper for secure client-side hashing
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
      if (!userId || userId === "demo") {
        const rest = getLocal<Restaurant>(`taskwai_restaurant_${userId}`) || DEFAULT_RESTAURANT(userId);
        const updated = { ...rest, ...data };
        setLocal(`taskwai_restaurant_${userId}`, updated);
        return updated;
      }
      throw error;
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
      if (!userId || userId === "demo") {
        const exp = getLocal<Expenses>(`taskwai_expenses_${userId}`) || DEFAULT_EXPENSES(userId, restaurantId);
        const updated = { ...exp, ...data, updatedAt: new Date().toISOString() };
        setLocal(`taskwai_expenses_${userId}`, updated);
        return updated;
      }
      throw error;
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
        where("restaurantId", "==", restaurantId)
      );
      const querySnapshot = await getDocs(q);
      const profits: DailyProfit[] = [];
      querySnapshot.forEach((doc) => {
        profits.push({ id: doc.id, ...doc.data() } as DailyProfit);
      });

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

    // Update branches autocomplete list
    if (entry.branchName && entry.branchName.trim()) {
      const cleanedBranch = entry.branchName.trim();
      if (!userId || userId === "demo") {
        const rest = getLocal<Restaurant>("taskwai_restaurant") || DEFAULT_RESTAURANT("demo");
        const currentBranches = rest.branches || [];
        if (!currentBranches.includes(cleanedBranch)) {
          rest.branches = [...currentBranches, cleanedBranch];
          setLocal("taskwai_restaurant", rest);
        }
      } else {
        try {
          const restDocRef = doc(db, "restaurants", restaurantId);
          const restSnap = await getDoc(restDocRef);
          if (restSnap.exists()) {
            const restData = restSnap.data() as Restaurant;
            const currentBranches = restData.branches || [];
            if (!currentBranches.includes(cleanedBranch)) {
              await updateDoc(restDocRef, { branches: [...currentBranches, cleanedBranch] });
            }
          }
        } catch (e) {
          console.warn("Failed to update branches list in Firestore:", e);
        }
      }
    }

    if (!userId || userId === "demo") {
      const profits = await this.getDailyProfits("demo", restaurantId);
      const targetBranch = entry.branchName || "";
      // Remove duplicate for same date AND same branchName
      const filtered = profits.filter((p) => {
        const pBranch = p.branchName || "";
        return !(p.date === entry.date && pBranch.trim().toLowerCase() === targetBranch.trim().toLowerCase());
      });
      const updated = [newProfit, ...filtered];
      setLocal("taskwai_daily_profits", updated);
      return newProfit;
    }

    try {
      // Check if entry for this date AND branch already exists, update or allow multiple.
      const q = query(
        collection(db, "daily_profit"),
        where("restaurantId", "==", restaurantId),
        where("date", "==", entry.date)
      );
      const snapshot = await getDocs(q);
      
      const targetBranch = entry.branchName || "";
      const existingDoc = snapshot.docs.find(doc => {
        const data = doc.data();
        const docBranch = data.branchName || "";
        return docBranch.trim().toLowerCase() === targetBranch.trim().toLowerCase();
      });

      if (existingDoc) {
        // Update existing date for this specific branch
        const existingId = existingDoc.id;
        const updateData: any = {
          restaurantId,
          profit: entry.profit,
          notes: entry.notes || "",
          createdAt: new Date().toISOString(),
          omzet: entry.omzet ?? null,
          hppType: entry.hppType ?? null,
          hppVal: entry.hppVal ?? null,
          otherExpenses: entry.otherExpenses ?? null,
          branchName: entry.branchName ?? null,
          inputterName: entry.inputterName ?? null
        };
        await updateDoc(doc(db, "daily_profit", existingId), updateData);
        return {
          id: existingId,
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
      } else {
        await setDoc(doc(db, "daily_profit", id), {
          restaurantId,
          date: entry.date,
          profit: entry.profit,
          notes: entry.notes || "",
          createdAt: new Date().toISOString(),
          omzet: entry.omzet ?? null,
          hppType: entry.hppType ?? null,
          hppVal: entry.hppVal ?? null,
          otherExpenses: entry.otherExpenses ?? null,
          branchName: entry.branchName ?? null,
          inputterName: entry.inputterName ?? null
        });
        return newProfit;
      }
    } catch (error) {
      console.error("Error adding daily profit:", error);
      if (!userId || userId === "demo") {
        const profits = getLocal<DailyProfit[]>(`taskwai_daily_profits_${userId}`) || [];
        const filtered = profits.filter((p) => p.date !== entry.date);
        const updated = [newProfit, ...filtered];
        setLocal(`taskwai_daily_profits_${userId}`, updated);
        return newProfit;
      }
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
      await deleteDoc(doc(db, "daily_profit", id));
    } catch (error) {
      console.error("Error deleting daily profit:", error);
      if (!userId || userId === "demo") {
        const profits = getLocal<DailyProfit[]>(`taskwai_daily_profits_${userId}`) || [];
        const filtered = profits.filter((p) => p.id !== id);
        setLocal(`taskwai_daily_profits_${userId}`, filtered);
        return;
      }
      throw error;
    }
  },

  async saveStaffCredentials(userId: string, restaurantId: string, username: string, password: string): Promise<void> {
    const updatedAtIso = new Date().toISOString();

    if (!userId || userId === "demo") {
      const rest = getLocal<Restaurant>("taskwai_restaurant") || DEFAULT_RESTAURANT("demo");
      rest.staffUsername = username;
      rest.staffPassword = password;
      rest.staffActive = true;
      rest.staffUpdatedAt = updatedAtIso;
      setLocal("taskwai_restaurant", rest);
      return;
    }

    const hash = await hashCredentials(username, password);

    // Get the current restaurant doc to check for an existing hash
    const restDocRef = doc(db, "restaurants", restaurantId);
    const restSnap = await getDoc(restDocRef);
    let oldHash = "";
    if (restSnap.exists()) {
      oldHash = restSnap.data().staffHash || "";
    }

    // Delete old hash mapping if it changed
    if (oldHash && oldHash !== hash) {
      try {
        await deleteDoc(doc(db, "staff_accounts", oldHash));
      } catch (err) {
        console.warn("Failed to delete old staff hash doc:", err);
      }
    }

    // Write new mapping
    await setDoc(doc(db, "staff_accounts", hash), {
      restaurantId,
      ownerId: userId,
      staffActive: true
    });

    // Update restaurant doc
    await updateDoc(restDocRef, {
      staffUsername: username,
      staffPassword: password,
      staffHash: hash,
      staffActive: true,
      staffUpdatedAt: updatedAtIso
    });
  },

  async toggleStaffActive(userId: string, restaurantId: string, active: boolean): Promise<void> {
    if (!userId || userId === "demo") {
      const rest = getLocal<Restaurant>("taskwai_restaurant") || DEFAULT_RESTAURANT("demo");
      rest.staffActive = active;
      setLocal("taskwai_restaurant", rest);
      return;
    }

    const restDocRef = doc(db, "restaurants", restaurantId);
    
    // Also update staffActive status in staff_accounts mapping
    const restSnap = await getDoc(restDocRef);
    if (restSnap.exists()) {
      const hash = restSnap.data().staffHash || "";
      if (hash) {
        await updateDoc(doc(db, "staff_accounts", hash), {
          staffActive: active
        });
      }
    }

    await updateDoc(restDocRef, {
      staffActive: active
    });
  },

  async loginStaff(username: string, password: string): Promise<{ restaurantId: string; ownerId: string }> {
    // Demo Mode fallback
    if (username === "demo_staff" && password === "demo123") {
      return { restaurantId: "rest_demo", ownerId: "demo" };
    }

    // Also check local storage for custom local credentials
    const localRest = getLocal<Restaurant>("taskwai_restaurant");
    if (localRest && localRest.staffUsername === username && localRest.staffPassword === password) {
      if (localRest.staffActive === false) {
        throw new Error("Akun staff telah dinonaktifkan oleh pemilik usaha.");
      }
      return { restaurantId: localRest.id, ownerId: localRest.ownerId };
    }

    const hash = await hashCredentials(username, password);

    // Read staff account credentials hash document
    const accountRef = doc(db, "staff_accounts", hash);
    const accountSnap = await getDoc(accountRef);

    if (!accountSnap.exists()) {
      throw new Error("Username atau Password staff salah.");
    }

    const { restaurantId, ownerId, staffActive } = accountSnap.data() as { restaurantId: string; ownerId: string; staffActive?: boolean };

    if (staffActive === false) {
      throw new Error("Akun staff telah dinonaktifkan oleh pemilik usaha.");
    }

    // Authenticate anonymously in Firebase Auth
    const userCredential = await signInAnonymously(auth);
    const anonymousUid = userCredential.user.uid;

    // Write temporary active staff session
    await setDoc(doc(db, "staff_sessions", anonymousUid), {
      restaurantId,
      ownerId,
      createdAt: new Date().toISOString()
    });

    return { restaurantId, ownerId };
  },

  async ensureStaffSession(anonymousUid: string, restaurantId: string, ownerId: string): Promise<void> {
    if (!anonymousUid || anonymousUid === "demo") return;
    try {
      const sessionRef = doc(db, "staff_sessions", anonymousUid);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) {
        console.log("Restoring missing staff session doc in Firestore for UID:", anonymousUid);
        await setDoc(sessionRef, {
          restaurantId,
          ownerId,
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("Failed to check/restore staff session in Firestore:", e);
    }
  }
};
