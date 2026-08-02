import React, { useState } from "react";
import { Bug } from "lucide-react";
import BugReportModal from "./BugReportModal";
import { useTranslation } from "../lib/LanguageContext";

interface BugReportButtonProps {
  user: any | null;
  staffSession: { restaurantId: string; ownerId: string; role: "staff" } | null;
}

export default function BugReportButton({ user, staffSession }: BugReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      {/* Minimal Floating Bug Button */}
      <div className="fixed bottom-[5.25rem] right-4 lg:bottom-4 lg:right-4 z-[9990] flex items-center group">
        {/* Tooltip on Hover */}
        <div className="mr-2 px-2.5 py-1 bg-zinc-900/80 dark:bg-zinc-800/90 text-white text-[11px] font-medium rounded-md shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none whitespace-nowrap translate-x-1 group-hover:translate-x-0 hidden sm:block tracking-wide">
          {t("bug.buttonTitle", "Laporkan Bug")}
        </div>

        {/* Compact Ghost Button */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label={t("bug.buttonTitle", "Laporkan Bug")}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-300/60 dark:hover:border-rose-800/60 hover:bg-white dark:hover:bg-zinc-900 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Bug className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal Popup */}
      <BugReportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        user={user}
        staffSession={staffSession}
      />
    </>
  );
}
