import React, { useState } from "react";
import { Restaurant } from "../types";
import { formatRupiah } from "../lib/utils";
import { Save, User, Store, Target as TargetIcon, ShieldCheck, Pencil, X, Lock, Trash2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "./Toast";
import { useTranslation } from "../lib/LanguageContext";

interface TargetProps {
  restaurant: Restaurant;
  onSaveRestaurant: (name: string, target: number) => Promise<void>;
  onSaveStaffCredentials: (username: string, password: string) => Promise<void>;
  onToggleStaffActive: (active: boolean) => Promise<void>;
  userEmail: string | null;
  onResetAll: () => Promise<void>;
}

export default function Target({ restaurant, onSaveRestaurant, onSaveStaffCredentials, onToggleStaffActive, userEmail, onResetAll }: TargetProps) {
  const { showToast } = useToast();
  const { lang, setLang, t, currency, setCurrency, currencySymbol } = useTranslation();
  const [name, setName] = useState(restaurant.name);
  
  const isDollar = currency === "dollar";
  const formatLocale = isDollar ? "en-US" : "id-ID";

  const [targetInput, setTargetInput] = useState(new Intl.NumberFormat(formatLocale).format(restaurant.monthlyTargetProfit));
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Reset confirmation states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Staff Credentials states
  const [staffUsername, setStaffUsername] = useState(restaurant.staffUsername || "");
  const [staffPassword, setStaffPassword] = useState(restaurant.staffPassword || "");
  const [staffPasswordConfirm, setStaffPasswordConfirm] = useState(restaurant.staffPassword || "");
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [showStaffGuide, setShowStaffGuide] = useState(false);

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffUsername.trim() || !staffPassword.trim() || !staffPasswordConfirm.trim()) {
      showToast("Username, password, dan konfirmasi password staff harus diisi.", "warning");
      return;
    }

    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(staffUsername.trim())) {
      showToast("Username staff hanya boleh berisi huruf kecil, angka, dan garis bawah (_).", "warning");
      return;
    }

    if (staffUsername.trim().length < 6) {
      showToast("Username staff minimal harus 6 karakter.", "warning");
      return;
    }

    if (staffPassword.trim().length < 6) {
      showToast("Password staff minimal harus 6 karakter.", "warning");
      return;
    }

    if (staffPassword.trim() !== staffPasswordConfirm.trim()) {
      showToast("Password dan konfirmasi password tidak cocok.", "warning");
      return;
    }

    setIsSavingStaff(true);
    try {
      await onSaveStaffCredentials(staffUsername.trim(), staffPassword.trim());
      showToast("Kredensial akses staff berhasil diperbarui!", "success");
      setIsEditingStaff(false);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || "Gagal memperbarui kredensial staff.";
      showToast(`Gagal memperbarui kredensial staff: ${errMsg}`, "error");
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleStaffCancel = () => {
    setStaffUsername(restaurant.staffUsername || "");
    setStaffPassword(restaurant.staffPassword || "");
    setStaffPasswordConfirm(restaurant.staffPassword || "");
    setIsEditingStaff(false);
  };

  const checkCanEditStaff = (): boolean => {
    if (!restaurant.staffUpdatedAt) return true; // allow edit if never updated before

    const lastUpdate = new Date(restaurant.staffUpdatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 60) {
      const remaining = 60 - diffDays;
      showToast(`Perubahan akun staff hanya diperbolehkan minimal 60 hari sekali. Terakhir diubah ${diffDays} hari yang lalu (butuh ${remaining} hari lagi).`, "warning");
      return false;
    }

    return true;
  };

  const handleStartEditStaff = () => {
    if (checkCanEditStaff()) {
      setIsEditingStaff(true);
    }
  };

  const handleToggleActive = async () => {
    const currentStatus = restaurant.staffActive !== false;
    const newStatus = !currentStatus;
    setIsTogglingActive(true);
    try {
      await onToggleStaffActive(newStatus);
      showToast(newStatus ? "Akun staff berhasil diaktifkan kembali!" : "Akun staff dinonaktifkan.", "success");
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || "Gagal mengubah status keaktifan staff.";
      showToast(`Gagal mengubah status keaktifan staff: ${errMsg}`, "error");
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setTargetInput("");
      return;
    }
    const formatted = new Intl.NumberFormat(formatLocale).format(Number(rawValue));
    setTargetInput(formatted);
  };

  const handleCurrencyToggle = (newCurrency: "rupiah" | "dollar") => {
    if (newCurrency === currency) return;
    
    const cleanStr = targetInput.replace(/[^0-9]/g, "");
    const parsed = parseInt(cleanStr, 10);
    
    setCurrency(newCurrency);
    
    if (!isNaN(parsed) && parsed > 0) {
      const newLocale = newCurrency === "dollar" ? "en-US" : "id-ID";
      setTargetInput(new Intl.NumberFormat(newLocale).format(parsed));
    }
  };

  const handleCancel = () => {
    setName(restaurant.name);
    setTargetInput(new Intl.NumberFormat(formatLocale).format(restaurant.monthlyTargetProfit));
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStr = targetInput.replace(/[^0-9]/g, "");
    const targetVal = parseInt(cleanStr, 10);
    if (isNaN(targetVal) || targetVal <= 0) {
      showToast(t("target.invalidTarget", "Harap masukkan nominal target yang valid."), "warning");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveRestaurant(name, targetVal);
      showToast(t("target.success", "Konfigurasi usaha dan target berhasil disimpan!"), "success");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      showToast(t("target.error", "Gagal menyimpan konfigurasi."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        <div className="mb-6">
          <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">{t("target.title", "Pengaturan Profil & Target")}</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">{t("target.subtitle", "Konfigurasikan nama usaha dan target laba bersih bulanan Anda.")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Restaurant Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              {t("target.restaurantName", "Nama Usaha Anda")}
            </label>
            <div className="relative">
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!isEditing}
                placeholder="e.g. Warung Rasa"
                className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Monthly Target Profit */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              {t("target.monthlyTarget", "Target Laba Bersih Bulanan")}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none font-mono">
                {currencySymbol}
              </span>
              <input
                type="text"
                value={targetInput}
                onChange={handleTargetChange}
                required
                disabled={!isEditing}
                placeholder={isDollar ? "e.g. 5,000" : "e.g. 50.000.000"}
                className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
              {t("target.targetHelp", "Angka ini akan menjadi rujukan utama perhitungan progress bar dan target harian Anda.")}
            </p>
          </div>

          {/* Language Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              {t("target.language", "Bahasa / Language")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLang("id")}
                disabled={!isEditing}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                  !isEditing ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${
                  lang === "id"
                    ? "bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 border-transparent font-black shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
                }`}
              >
                🇮🇩 {t("target.langIndonesian", "Bahasa Indonesia")}
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                disabled={!isEditing}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                  !isEditing ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${
                  lang === "en"
                    ? "bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 border-transparent font-black shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
                }`}
              >
                🇬🇧 {t("target.langEnglish", "English")}
              </button>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              {t("target.currency", "Mata Uang / Currency")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCurrencyToggle("rupiah")}
                disabled={!isEditing}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                  !isEditing ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${
                  currency === "rupiah"
                    ? "bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 border-transparent font-black shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
                }`}
              >
                🇮🇩 Rupiah (Rp)
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyToggle("dollar")}
                disabled={!isEditing}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                  !isEditing ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${
                  currency === "dollar"
                    ? "bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 border-transparent font-black shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
                }`}
              >
                💵 Dollar ($)
              </button>
            </div>
          </div>

          {/* Account Profile Connection */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/80 flex items-start gap-3">
            <User className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-300 block uppercase tracking-wider text-[10px]">{t("target.accountConnection", "Koneksi Akun")}</span>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                {userEmail ? (
                  t("target.connectedAs", "Terhubung sebagai {email}. Data tersimpan aman di cloud database Firestore.").replace("{email}", userEmail)
                ) : (
                  t("target.demoModeText", "Anda saat ini menggunakan Mode Demo Lokal (Guest). Data hanya tersimpan di browser Anda. Hubungkan ke Google di navigasi atas untuk sinkronisasi cloud.")
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold py-3 px-4 rounded-xl transition-all shadow-sm cursor-pointer text-sm"
            >
              <Pencil className="w-4 h-4" />
              <span>{t("target.edit", "Ubah Pengaturan")}</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 font-bold py-3 px-4 rounded-xl transition-all border border-zinc-200/50 dark:border-zinc-700/80 cursor-pointer text-sm disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>{t("nav.cancel", "Batal")}</span>
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer text-sm"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? t("target.saving", "Menyimpan...") : t("target.saveShort", "Simpan")}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Staff Access Configuration Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight flex flex-wrap items-center gap-2">
              Akses Staff Toko
              {restaurant.staffUsername && (
                restaurant.staffActive !== false ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">Aktif</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 uppercase tracking-wider">Nonaktif</span>
                )
              )}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium font-sans">
            Atur kredensial staff tunggal agar karyawan di semua cabang dapat login dan menginput omzet harian.
          </p>

          <button
            type="button"
            onClick={() => setShowStaffGuide(!showStaffGuide)}
            className="mt-2.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-450 dark:hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors outline-none focus:outline-none"
          >
            <span>💡</span>
            <span className="underline decoration-dotted underline-offset-4 font-bold">
              {showStaffGuide ? "Sembunyikan Panduan Penggunaan" : "Cara Menggunakan Akun Staff"}
            </span>
          </button>
          
          {showStaffGuide && (
            <div className="mt-3.5 p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 uppercase tracking-wider">
                <span>📖</span> Panduan Akses Staff Toko
              </h4>
              <ol className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-2 list-decimal pl-4 font-medium leading-relaxed">
                <li>
                  <strong>Bikin Akun Staff:</strong> Tentukan satu username & password di bawah ini, lalu klik Simpan.
                </li>
                <li>
                  <strong>Bisa Login di Perangkat Manapun:</strong> Berikan kredensial ini kepada karyawan Anda. Karyawan dapat login di perangkat/HP manapun melalui situs <span className="font-bold text-zinc-700 dark:text-zinc-200">taskwai.com</span>.
                </li>
                <li>
                  <strong>Khusus Input Omzet Saja:</strong> Demi keamanan data keuangan Anda, tampilan akun staff dibatasi secara penuh hanya untuk memasukkan data omzet harian cabang, tanpa bisa melihat riwayat profit ataupun dashboard performa utama owner.
                </li>
              </ol>
            </div>
          )}
        </div>

        <form onSubmit={handleStaffSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Username Staff <span className="text-[10px] font-normal lowercase">(min. 6 karakter)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                required
                disabled={!isEditingStaff || isSavingStaff}
                value={staffUsername}
                onChange={(e) => setStaffUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                placeholder="e.g. staff_senja"
                className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 disabled:bg-zinc-100/50 dark:disabled:bg-zinc-950/40 disabled:text-zinc-400 dark:disabled:text-zinc-500 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all text-xs font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Password Staff <span className="text-[10px] font-normal lowercase">(min. 6 karakter)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                required
                disabled={!isEditingStaff || isSavingStaff}
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder="Masukkan password staff"
                className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 disabled:bg-zinc-100/50 dark:disabled:bg-zinc-950/40 disabled:text-zinc-400 dark:disabled:text-zinc-500 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all text-xs font-mono"
              />
            </div>
          </div>

          {/* Confirm Password */}
          {(isEditingStaff || restaurant.staffUsername) && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Konfirmasi Password Staff
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  disabled={!isEditingStaff || isSavingStaff}
                  value={staffPasswordConfirm}
                  onChange={(e) => setStaffPasswordConfirm(e.target.value)}
                  placeholder="Ulangi password staff"
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 disabled:bg-zinc-100/50 dark:disabled:bg-zinc-950/40 disabled:text-zinc-400 dark:disabled:text-zinc-500 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Action Buttons Area */}
          {!isEditingStaff ? (
            restaurant.staffUsername ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isTogglingActive}
                  onClick={handleToggleActive}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    restaurant.staffActive !== false
                      ? "bg-rose-50 hover:bg-rose-100/70 border-rose-200/60 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 dark:border-rose-900/30 text-rose-600 dark:text-rose-450"
                      : "bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200/60 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {restaurant.staffActive !== false ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                </button>
                <button
                  type="button"
                  onClick={handleStartEditStaff}
                  className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold py-3 px-4 rounded-xl transition-all shadow-sm cursor-pointer text-xs uppercase tracking-wider"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Ubah Akses Staff</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingStaff(true)}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold py-3 px-4 rounded-xl transition-all shadow-sm cursor-pointer text-sm uppercase tracking-wider"
              >
                <Pencil className="w-4 h-4" />
                <span>Bikin Akun Staff</span>
              </button>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={handleStaffCancel}
                disabled={isSavingStaff}
                className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-750 dark:text-zinc-300 font-bold py-3 px-4 rounded-xl transition-all border border-zinc-200/50 dark:border-zinc-800 cursor-pointer text-sm disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>Batal</span>
              </button>
              <button
                type="submit"
                disabled={isSavingStaff}
                className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer text-sm"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingStaff ? "Menyimpan..." : "Simpan"}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Target calculation preview card */}
      <div className="bg-zinc-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden border border-zinc-900 dark:border-zinc-800">
        <div className="absolute right-0 bottom-0 opacity-5 translate-y-1/3 translate-x-1/12 pointer-events-none">
          <TargetIcon className="w-48 h-48" />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-zinc-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t("target.formulaTitle", "Targeting Formula")}</h3>
        </div>
        <p className="text-sm font-medium leading-relaxed text-zinc-300 italic">
          {t("target.formulaText", "\"Bisnis yang sukses dibangun dari kejelasan target harian. Dengan mengeset target bulanan, Taskwai memandu Anda merealisasikannya langkah demi langkah setiap hari.\"")}
        </p>
      </div>

      {/* Danger Zone: Reset All Data */}
      <div className="bg-red-50/50 dark:bg-rose-950/10 border border-red-200/65 dark:border-rose-900/30 rounded-2xl p-6 shadow-[0_1px_3px_rgba(239,68,68,0.02)]">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-5 h-5 text-red-600 dark:text-rose-400 animate-pulse" />
          <h3 className="text-sm font-black uppercase tracking-wider text-red-800 dark:text-rose-400">{t("target.dangerZone", "Danger Zone")}</h3>
        </div>
        <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-5 leading-relaxed font-semibold">
          {t("target.resetWarning", "Mereset semua data akan menghapus profil usaha, target bulanan, rincian biaya operasional tetap, dan seluruh riwayat pencatatan profit secara permanen. Anda akan mulai dari nol lagi.")}
        </p>
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="w-full flex items-center justify-center gap-2 bg-red-650 hover:bg-red-750 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm cursor-pointer text-xs uppercase tracking-wider border-0"
        >
          <Trash2 className="w-4 h-4" />
          <span>{t("target.resetButton", "Reset Semua Data")}</span>
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md transition-opacity duration-300"
              onClick={() => setShowResetConfirm(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-6 shadow-2xl border border-zinc-200/60 dark:border-zinc-800/80"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-3.5 rounded-full bg-red-50 dark:bg-rose-950/20 border border-red-100 dark:border-rose-900/35 text-red-600 dark:text-rose-450 mb-4 animate-bounce">
                  <AlertTriangle className="w-6 h-6 stroke-[2.25]" />
                </div>
                
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                  {t("target.resetConfirmTitle", "Konfirmasi Reset Total")}
                </h3>
                
                <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed font-semibold">
                  {t("target.resetConfirmDesc", "Apakah Anda benar-benar yakin ingin menghapus seluruh data usaha ini? Semua riwayat profit dan pengaturan akan hilang selamanya.")}
                </p>
                
                <div className="flex gap-2.5 w-full mt-6">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/65 font-bold text-xs transition-colors cursor-pointer bg-transparent"
                  >
                    {t("nav.cancel", "Batal")}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setShowResetConfirm(false);
                      setIsResetting(true);
                      try {
                        await onResetAll();
                      } catch (e) {
                        setIsResetting(false);
                      }
                    }}
                    disabled={isResetting}
                    className="flex-1 py-2.5 rounded-xl bg-red-650 hover:bg-red-750 text-white font-bold text-xs transition-colors cursor-pointer border-0 shadow-sm shadow-red-600/10 disabled:opacity-50"
                  >
                    {isResetting ? "Mereset..." : t("target.resetConfirmButton", "Ya, Reset Total")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
