-- Tabel Owner (Terhubung ke Google Account)
CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY, -- Menggunakan Google Sub ID atau UUID
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  createdAt TEXT NOT NULL,
  accountType TEXT DEFAULT 'regular'
);

-- Tabel Restoran
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  ownerId TEXT NOT NULL,
  name TEXT NOT NULL,
  monthlyTargetProfit REAL NOT NULL,
  createdAt TEXT NOT NULL,
  staffUsername TEXT,
  staffPassword TEXT,
  staffHash TEXT,
  staffActive INTEGER DEFAULT 0,
  staffUpdatedAt TEXT,
  branches TEXT, -- JSON string array
  authCode TEXT,
  authCodeExpiresAt TEXT,
  FOREIGN KEY (ownerId) REFERENCES owners(id) ON DELETE CASCADE
);

-- Tabel Biaya Operasional
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  restaurantId TEXT NOT NULL,
  month TEXT NOT NULL,
  sewaTempat REAL NOT NULL,
  gajiKaryawan REAL NOT NULL,
  royaltiFranchise REAL NOT NULL,
  listrik REAL NOT NULL,
  air REAL NOT NULL,
  internet REAL NOT NULL,
  marketing REAL NOT NULL,
  pajak REAL NOT NULL,
  biayaLain REAL NOT NULL,
  cicilanBank REAL NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Tabel Profit Harian
CREATE TABLE IF NOT EXISTS daily_profits (
  id TEXT PRIMARY KEY,
  restaurantId TEXT NOT NULL,
  date TEXT NOT NULL,
  profit REAL NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  omzet REAL,
  hppType TEXT,
  hppVal REAL,
  otherExpenses REAL,
  branchName TEXT,
  inputterName TEXT,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Tabel Sesi Aktif (Owner & Staff) untuk Autentikasi API
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  role TEXT NOT NULL, -- 'owner' atau 'staff'
  restaurantId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL
);

-- Tabel Akun Staff (Pemetaan Hash Kredensial Staff)
CREATE TABLE IF NOT EXISTS staff_accounts (
  hash TEXT PRIMARY KEY,
  restaurantId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  staffActive INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Tabel Hubungan Big Boss & Cabang
CREATE TABLE IF NOT EXISTS bigboss_links (
  id TEXT PRIMARY KEY,
  bossOwnerId TEXT NOT NULL,
  branchRestaurantId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (bossOwnerId) REFERENCES owners(id) ON DELETE CASCADE,
  FOREIGN KEY (branchRestaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
  UNIQUE(bossOwnerId, branchRestaurantId)
);
