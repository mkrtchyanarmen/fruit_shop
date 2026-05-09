"use client"

import { DailySummarySection } from "@/components/daily-summary-section"
import { EmptyShopState, PageError } from "@/components/page-state"
import { useDailyData } from "@/hooks/use-daily-data"
import { useShopContext } from "@/hooks/use-shop-context"
import { getTodayLocalIsoDate } from "@/lib/date"

export default function TodayPurchasePage() {
  const { activeShopId } = useShopContext()
  const today = getTodayLocalIsoDate()
  const { summary, isLoading, error } = useDailyData(today, activeShopId)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Այսօրվա գնում</h2>
        <p className="text-sm text-muted-foreground">
          Այսօրվա եկամուտ, մուտք և շահույթը՝ վաճառված ապրանքի վրա միջին ինքնարժեքից վերևի մասը
          (markup), ոչ թե ամբողջ վաճառքի գումարը։
        </p>
        <p className="text-xs text-muted-foreground">Ամսաթիվ՝ {today}</p>
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
