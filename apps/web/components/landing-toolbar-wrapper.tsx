"use client";

import { usePathname } from "@/i18n/navigation";
import { AppToolbar } from "@/components/app-toolbar";

export function LandingToolbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/" || pathname === "";

  return (
    <>
      {isLanding && <AppToolbar />}
      <main className={isLanding ? "pt-20" : "pt-0"}>{children}</main>
    </>
  );
}
