"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";

interface AppShellClientProps {
  children: ReactNode;
  businessName: string;
  industry: string;
  stageName: string;
  stageId: number;
}

export function AppShellClient({
  children,
  businessName,
  industry,
  stageName,
  stageId,
}: AppShellClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900">
      <TopNav
        stageName={stageName}
        stageId={stageId}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <Sidebar
        businessName={businessName}
        industry={industry}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />

      <main className="min-h-[calc(100vh-72px)] px-5 pb-10 pt-6 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-[1440px]">
          {children}
        </div>
      </main>
    </div>
  );
}