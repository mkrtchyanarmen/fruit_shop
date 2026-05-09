"use client"

import { useState } from "react"
import { DailySummarySection } from "@/components/daily-summary-section"
import { EmptyShopState, PageError } from "@/components/page-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDailyData } from "@/hooks/use-daily-data"
import { useShopContext } from "@/hooks/use-shop-context"
import { getTodayLocalIsoDate } from "@/lib/date"

export default function HistoryPage() {
  const { activeShopId } = useShopContext()
  const [date, setDate] = useState(getTodayLocalIsoDate())
  const { summary, isLoading, error } = useDailyData(date, activeShopId)

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Պատմություն</h2>
          <p className="text-sm text-muted-foreground">
            Դիտեք ցանկացած ամսաթիվ ընտրված խանութի համար
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Label htmlFor="history-date">Ամսաթիվ</Label>
          <Input
            id="history-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </div>
      {!activeShopId ? (
        <EmptyShopState />
      ) : error ? (
        <PageError message={error} />
      ) : (
        <DailySummarySection summary={summary} isLoading={isLoading} />
      )}
    </section>
  )
}
