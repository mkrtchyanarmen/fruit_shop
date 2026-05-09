"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { ShopSelector } from "@/components/shop-selector"
import { Button } from "@/components/ui/button"
import { useShopContext } from "@/hooks/use-shop-context"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Վաճառք" },
  { href: "/today", label: "Այսօրվա գնում" },
  { href: "/stock", label: "Մուտք" },
  { href: "/inventory", label: "Պահեստ" },
  { href: "/markup", label: "Գներ և markup" },
  { href: "/history", label: "Պատմություն" },
  { href: "/settings", label: "Կարգավորումներ" },
]

function linkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Navbar() {
  const pathname = usePathname()
  const { shops } = useShopContext()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinkClass = (href: string) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted",
      linkActive(pathname, href) && "bg-primary text-primary-foreground hover:bg-primary/90",
    )

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur md:static">
        {/* Մոբայլ՝ միայն բուրգեր + կարճ վերնագիր */}
        <div className="mx-auto flex max-w-7xl items-center px-2 py-2 md:hidden">
          <div className="flex flex-1 justify-start">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label="Բացել մենյու"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <span className="pointer-events-none font-semibold">Մրգեր</span>
          <div className="flex flex-1 justify-end" aria-hidden />
        </div>

        {/* Դեսքթոփ՝ ամբողջական վերնագիր, խանութ, նավիգացիա */}
        <div className="mx-auto hidden max-w-7xl flex-col gap-3 px-6 py-4 md:flex lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-bold">Մրգերի խանութի կառավարում</h1>
            {shops.length > 1 ? <ShopSelector /> : null}
          </div>
          <nav className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Փակել մենյու"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="font-semibold">Մենյու</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Փակել"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-4 py-3 text-base font-medium",
                    linkActive(pathname, link.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {shops.length > 1 ? (
                <div className="mt-4 border-t pt-4">
                  <ShopSelector />
                </div>
              ) : null}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  )
}
