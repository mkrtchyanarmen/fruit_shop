import type { Metadata } from "next"
import "@/app/globals.css"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/navbar"

export const metadata: Metadata = {
  title: "Fruit Shop Manager",
  description: "Multi-shop fruit store management frontend",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-background">
            <Navbar />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
