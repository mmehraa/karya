"use client";

import { useRef, useState, type ReactNode } from "react";
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <TopNav
        stageName={stageName}
        stageId={stageId}
        onMenuClick={() => setIsMenuOpen(true)}
        menuButtonRef={menuButtonRef}
        isMenuOpen={isMenuOpen}
      />

      <Sidebar
        businessName={businessName}
        industry={industry}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        menuButtonRef={menuButtonRef}
      />

      <main className="min-h-[calc(100vh-68px)] px-4 pb-8 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
