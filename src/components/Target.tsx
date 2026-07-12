import React, { useState } from "react";
import { Restaurant } from "../types";
import { formatRupiah } from "../lib/utils";
import { Save, User, Store, Target as TargetIcon, ShieldCheck } from "lucide-react";
import { useToast } from "./Toast";

interface TargetProps {
  restaurant: Restaurant;
  onSaveRestaurant: (name: string, target: number) => Promise<void>;
  userEmail: string | null;
}

export default function Target({ restaurant, onSaveRestaurant, userEmail }: TargetProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(restaurant.name);
  const [targetInput, setTargetInput] = useState(new Intl.NumberFormat("id-ID").format(restaurant.monthlyTargetProfit));
  const [isSaving, setIsSaving] = useState(false);

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setTargetInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
    setTargetInput(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStr = targetInput.replace(/[^0-9]/g, "");
    const targetVal = parseInt(cleanStr, 10);
    if (isNaN(targetVal) || targetVal <= 0) {
      showToast("Harap masukkan nominal target yang valid.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveRestaurant(name, targetVal);
      showToast("Konfigurasi usaha dan target berhasil disimpan!", "success");
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan konfigurasi.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_24px_-10px_rgba(0,0,0,0.04)]">
        <div className="mb-6">
          <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">Pengaturan Profil & Target</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">Konfigurasikan nama usaha dan target laba bersih bulanan Anda.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Restaurant Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Nama Usaha Anda
            </label>
            <div className="relative">
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Warung Rasa"
                className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all"
              />
            </div>
          </div>

          {/* Monthly Target Profit */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Target Laba Bersih Bulanan
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none font-mono">
                Rp
              </span>
              <input
                type="text"
                value={targetInput}
                onChange={handleTargetChange}
                required
                placeholder="e.g. 50.000.000"
                className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-300 focus:bg-white dark:focus:bg-zinc-900 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all font-mono"
              />
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
              Angka ini akan menjadi rujukan utama perhitungan progress bar dan target harian Anda.
            </p>
          </div>

          {/* Account Profile Connection */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/80 flex items-start gap-3">
            <User className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-300 block uppercase tracking-wider text-[10px]">Koneksi Akun</span>
              <p className="text-zinc-500 dark:text-zinc-450 leading-relaxed font-medium">
                {userEmail ? (
                  <>Terhubung sebagai <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{userEmail}</span>. Data tersimpan aman di cloud database Firestore.</>
                ) : (
                  <>Anda saat ini menggunakan <span className="font-bold text-amber-800 dark:text-amber-400">Mode Demo Lokal (Guest)</span>. Data hanya tersimpan di browser Anda. Hubungkan ke Google di navigasi atas untuk sinkronisasi cloud.</>
                )}
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-955 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Konfigurasi"}</span>
          </button>
        </form>
      </div>

      {/* Target calculation preview card */}
      <div className="bg-zinc-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden border border-zinc-900 dark:border-zinc-800">
        <div className="absolute right-0 bottom-0 opacity-5 translate-y-1/3 translate-x-1/12 pointer-events-none">
          <TargetIcon className="w-48 h-48" />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-zinc-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Targeting Formula</h3>
        </div>
        <p className="text-sm font-medium leading-relaxed text-zinc-300 italic">
          "Bisnis yang sukses dibangun dari kejelasan target harian. Dengan mengeset target bulanan, Taskwai memandu Anda merealisasikannya langkah demi langkah setiap hari."
        </p>
      </div>
    </div>
  );
}
