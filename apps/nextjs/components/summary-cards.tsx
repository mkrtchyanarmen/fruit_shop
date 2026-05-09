import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

interface SummaryCardsProps {
  totalRevenue: number
  totalStockCost: number
  totalTransportCost: number
  netProfit: number
}

export function SummaryCards({
  totalRevenue,
  totalStockCost,
  totalTransportCost,
  netProfit,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Revenue" value={totalRevenue} />
      <MetricCard label="Stock Cost" value={totalStockCost} />
      <MetricCard label="Transport Cost" value={totalTransportCost} />
      <MetricCard
        label="Net Profit"
        value={netProfit}
        valueClassName={netProfit >= 0 ? "text-emerald-600" : "text-red-600"}
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: number
  valueClassName?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${valueClassName ?? ""}`}>{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  )
}
