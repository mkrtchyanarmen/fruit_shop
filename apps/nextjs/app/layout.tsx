import type { Metadata } from "next"
import "@/app/globals.css"
import { MainShell } from "@/components/main-shell"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/navbar"

export const metadata: Metadata = {
  title: "Մրգերի խանութի կառավարում",
  description: "Բազմախանութ մրգային կետի կառավարման վահանակ",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="hy">
      <body>
        <Providers>
          <div className="min-h-screen bg-background">
            <Navbar />
            <MainShell>{children}</MainShell>
          </div>
        </Providers>
      </body>
    </html>
  )
}
