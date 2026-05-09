"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl",
        isHome
          ? "px-0 py-0 pb-2 sm:px-6 sm:py-6 sm:pb-6"
          : "px-4 py-6 sm:px-6 lg:px-8",
      )}
    >
      {children}
    </main>
  )
}
