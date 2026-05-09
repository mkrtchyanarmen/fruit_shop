import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

interface SummaryCardsProps {
  totalRevenue: number
  totalStockCost: number
  totalTransportCost: number
  soldMarkup: number
}

export function SummaryCards({
  totalRevenue,
  totalStockCost,
  totalTransportCost,
  soldMarkup,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Եկամուտ (վաճառք)" value={totalRevenue} />
      <MetricCard label="Ապրանքի ինքնարժեք" value={totalStockCost} />
      <MetricCard label="Տրանսպորտի ծախս" value={totalTransportCost} />
      <MetricCard
        label="Շահույթ (ավելացված արժեք)"
        value={soldMarkup}
        valueClassName={soldMarkup >= 0 ? "text-emerald-600" : "text-red-600"}
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
