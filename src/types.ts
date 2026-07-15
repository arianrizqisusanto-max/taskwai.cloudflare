export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  monthlyTargetProfit: number;
  createdAt: string;
  staffUsername?: string;
  staffPassword?: string;
  staffHash?: string;
  staffActive?: boolean;
  staffUpdatedAt?: string;
  branches?: string[];
}

export interface DailyProfit {
  id: string;
  restaurantId: string;
  date: string; // YYYY-MM-DD
  profit: number; // Daily operational profit
  notes?: string;
  createdAt: string;
  omzet?: number;
  hppType?: "nominal" | "percentage";
  hppVal?: number;
  otherExpenses?: number;
  branchName?: string;
  inputterName?: string;
}

export interface Expenses {
  id: string;
  restaurantId: string;
  sewaTempat: number;
  gajiKaryawan: number;
  royaltiFranchise: number;
  listrik: number;
  air: number;
  internet: number;
  marketing: number;
  pajak: number;
  biayaLain: number;
  cicilanBank: number;
  updatedAt: string;
}
