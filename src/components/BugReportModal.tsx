import React, { useState, useEffect } from "react";
import { Bug, X, Send, CheckCircle2, Loader2, Mail, ChevronDown } from "lucide-react";
import { DataService } from "../lib/dataService";
import { useToast } from "./Toast";
import { useTranslation } from "../lib/LanguageContext";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  staffSession: { restaurantId: string; ownerId: string; role: "staff" } | null;
}

export default function BugReportModal({ isOpen, onClose, user, staffSession }: BugReportModalProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [emailInput, setEmailInput] = useState("");
  const [category, setCategory] = useState("UI/Tampilan");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const bugCategories = [
    { id: "UI/Tampilan",  label: t("bug.catUi",   "🎨 Tampilan / Layout"),          desc: t("bug.catUiDesc",   "Desain, tombol, atau respon halaman") },
    { id: "Kalkulasi",   label: t("bug.catCalc",  "📊 Kalkulasi Profit & Biaya"),    desc: t("bug.catCalcDesc", "Angka atau perhitungan tidak akurat") },
    { id: "Auth/Session",label: t("bug.catAuth",  "🔐 Akun & Login"),                desc: t("bug.catAuthDesc", "Autentikasi Google atau akses Staff") },
    { id: "Performa",    label: t("bug.catPerf",  "⚡ Lambat / Freeze"),             desc: t("bug.catPerfDesc", "Aplikasi lemot atau tidak merespon") },
    { id: "Lainnya",     label: t("bug.catOther", "💡 Kendala Lain / Masukan"),      desc: t("bug.catOtherDesc","Keluhan atau saran fitur baru") },
  ];

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

  const selectedCat = bugCategories.find(c => c.id === category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !description.trim()) {
      showToast(t("bug.toastError", "Harap lengkapi semua kolom wajib."), "error");
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
        showToast(t("bug.toastSuccess", "Laporan bug berhasil dikirim! Terima kasih."), "success");
        setTimeout(() => {
          setSubmitSuccess(false);
          setTitle("");
          setDescription("");
          onClose();
        }, 2000);
      } else {
        throw new Error(result.message || "Gagal mengirim laporan");
      }
    } catch (err: any) {
      showToast(err.message || t("bug.toastError", "Gagal mengirim. Coba lagi."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 sm:rounded-2xl rounded-t-2xl shadow-2xl border border-zinc-200/60 dark:border-zinc-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "92vh" }}
      >
        {/* Slim header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
            <Bug className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-tight">
              {t("bug.modalTitle", "Laporkan Bug / Kendala")}
            </h3>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">
              {t("bug.modalSubtitle", "Laporan terkirim ke tim pengembang Taskwai")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {submitSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {t("bug.successTitle", "Laporan Terkirim!")}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                {t("bug.successMessage", "Terima kasih. Tim kami akan segera meninjau laporan ini.")}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto" style={{ maxHeight: "calc(92vh - 73px)" }}>
            <div className="px-5 py-4 space-y-4">

              {/* Sender identity — compact pill */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex-1">
                  {emailInput || "—"}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 tracking-wide uppercase">
                  {t("bug.verified", "Verified")}
                </span>
              </div>

              {/* Guest email input */}
              {!user?.email && !staffSession && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {t("bug.yourEmail", "Email Anda")} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="email@contoh.com"
                    className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 transition-shadow"
                  />
                </div>
              )}

              {/* Category — pill select style */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {t("bug.categoryLabel", "Kategori")} <span className="text-rose-400">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {bugCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        category === cat.id
                          ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent"
                          : "bg-transparent text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-200"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                {selectedCat && (
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 pl-0.5">{selectedCat.desc}</p>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {t("bug.subjectLabel", "Subjek")}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t("bug.subjectPlaceholder", "Ringkasan singkat masalah...")}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 transition-shadow"
                />
              </div>

              {/* Detail */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {t("bug.descriptionLabel", "Detail Keluhan")} <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t("bug.descriptionPlaceholder", "Jelaskan apa yang terjadi, halaman mana, pesan error apa...")}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 resize-none transition-shadow"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>{t("bug.descriptionHint", "Mohon sejelas mungkin")}</span>
                  <span>{description.length} {t("bug.characters", "karakter")}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                {t("bug.cancel", "Batal")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white disabled:opacity-40 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t("bug.submitting", "Mengirim...")}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {t("bug.submit", "Kirim Laporan")}
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
