"use client";

import { Menu } from "lucide-react";

interface TopNavProps {
  stageName: string;
  stageId: number;
  onMenuClick: () => void;
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning!";
  if (hour < 17) return "Good afternoon!";
  return "Good evening!";
}

function getDate() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

export function TopNav({
  stageName,
  stageId,
  onMenuClick,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#f7f6f2]/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <div className="text-[30px] font-semibold tracking-[-0.055em] text-slate-950">
          Karya<span className="text-emerald-700">.</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-500">
              {getDate()}
            </p>

            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {getGreeting()}
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Stage {stageId}
            <span className="normal-case tracking-normal font-semibold text-slate-800">
              {stageName}
            </span>
          </div>

          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Menu className="h-5 w-5 text-slate-800" />
          </button>
        </div>
      </div>
    </header>
  );
}