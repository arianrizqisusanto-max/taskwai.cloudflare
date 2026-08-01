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
      {/* Small Floating Bug Button */}
      <div className="fixed bottom-5 right-5 z-[9990] flex items-center group">
        {/* Tooltip on Hover */}
        <div className="mr-2 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-medium rounded-lg shadow-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap translate-x-1 group-hover:translate-x-0 hidden sm:block">
          {t("bug.buttonTitle", "Laporkan Bug / Kendala")}
        </div>

        {/* Small Circle Button */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label={t("bug.buttonTitle", "Laporkan Bug")}

          className="relative p-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white rounded-full shadow-lg hover:shadow-rose-500/30 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-500/30"
        >
          <Bug className="w-5 h-5 animate-pulse" />
          
          {/* Subtle pulse indicator dot */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white dark:border-slate-900"></span>
          </span>
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
