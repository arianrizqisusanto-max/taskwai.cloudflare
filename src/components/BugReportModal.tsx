import React, { useState, useEffect } from "react";
import { Bug, X, Send, AlertCircle, CheckCircle2, Loader2, Mail, ShieldAlert, Sparkles } from "lucide-react";
import { DataService } from "../lib/dataService";
import { useToast } from "./Toast";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  staffSession: { restaurantId: string; ownerId: string; role: "staff" } | null;
}

const BUG_CATEGORIES = [
  { id: "UI/Tampilan", label: "🎨 Tampilan / Layout", desc: "Masalah desain, tombol, atau respon halaman" },
  { id: "Kalkulasi", label: "📊 Kalkulasi Profit & Biaya", desc: "Angka atau perhitungan tidak akurat" },
  { id: "Auth/Session", label: "🔐 Akun & Login", desc: "Masalah autentikasi Google atau akses Staff" },
  { id: "Performa", label: "⚡ Lambat / Freeze", desc: "Aplikasi lemot atau tidak merespon" },
  { id: "Lainnya", label: "💡 Kendala Lain / Masukan", desc: "Keluhan atau saran fitur baru" },
];

export default function BugReportModal({ isOpen, onClose, user, staffSession }: BugReportModalProps) {
  const { showToast } = useToast();
  
  const [emailInput, setEmailInput] = useState("");
  const [category, setCategory] = useState("UI/Tampilan");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmailInput(user.email);
    } else if (staffSession) {
      setEmailInput(`staff_${staffSession.restaurantId}@taskwai.app`);
    } else {
      setEmailInput("");
    }
  }, [user, staffSession, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailInput.trim()) {
      showToast("Harap masukkan email Anda.", "error");
      return;
    }
    if (!description.trim()) {
      showToast("Harap isi detail keluhan / bug yang Anda alami.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        userEmail: emailInput.trim(),
        userId: user?.uid || (staffSession ? `staff_${staffSession.restaurantId}` : undefined),
        category,
        title: title.trim() || `Laporan Kendala ${category}`,
        description: description.trim(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        pageUrl: typeof window !== "undefined" ? window.location.href : ""
      };

      const result = await DataService.reportBug(payload);

      if (result.success) {
        setSubmitSuccess(true);
        showToast("Laporan bug berhasil dikirim ke arianrisqi@gmail.com! Terima kasih.", "success");
        setTimeout(() => {
          setSubmitSuccess(false);
          setTitle("");
          setDescription("");
          onClose();
        }, 1800);
      } else {
        throw new Error(result.message || "Gagal mengirim laporan");
      }
    } catch (err: any) {
      console.error("Bug report submission error:", err);
      showToast(err.message || "Gagal mengirim laporan bug. Silakan coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 dark:from-rose-600 dark:via-amber-600 dark:to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shadow-inner">
                <Bug className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">Laporkan Bug / Kendala</h3>
                <p className="text-xs text-white/90">
                  Laporan akan terkirim langsung ke pengembang (<span className="font-semibold underline underline-offset-2">arianrisqi@gmail.com</span>)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {submitSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">Laporan Terkirim!</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Terima kasih atas laporan Anda. Tim pengembang akan meninjau dan menindaklanjuti kendala ini sesegera mungkin.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Registered User Identity Badge */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pengirim (Identitas Terdaftar)
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {emailInput || "Email belum disetel"}
                  </p>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 shrink-0">
                Terverifikasi
              </span>
            </div>

            {/* Email input field (editable if user wants to change reply email) */}
            {!user?.email && !staffSession && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Anda <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kategori Kendala <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BUG_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                      category === cat.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 font-semibold"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="font-semibold">{cat.label}</div>
                    <div className="text-[10px] opacity-75 truncate">{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subjek / Ringkasan Kendala
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Tombol simpan biaya tidak merespon saat diklik"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detail Keluhan / Langkah Reproduksi <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan secara detail apa yang terjadi, halaman tempat masalah muncul, atau pesan error yang tampak..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 resize-none"
              />
              <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                <span>Mohon jelaskan sejelas mungkin</span>
                <span>{description.length} karakter</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim Laporan
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
