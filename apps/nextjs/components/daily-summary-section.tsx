import { BreakdownTable } from "@/components/breakdown-table"
import { SummaryCards } from "@/components/summary-cards"
import { Skeleton } from "@/components/ui/skeleton"
import type { DailyComputedSummary } from "@/lib/types"

interface DailySummarySectionProps {
  summary: DailyComputedSummary
  isLoading: boolean
}

export function DailySummarySection({ summary, isLoading }: DailySummarySectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SummaryCards
        totalRevenue={summary.totalRevenue}
        totalStockCost={summary.totalStockCost}
        totalTransportCost={summary.totalTransportCost}
        netProfit={summary.netProfit}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BreakdownTable
          title="Fruits Sold"
          amountLabel="Revenue"
          rows={summary.soldBreakdown}
        />
        <BreakdownTable
          title="Fruits Received"
          amountLabel="Cost"
          rows={summary.receivedBreakdown}
        />
      </div>
    </div>
  )
}
