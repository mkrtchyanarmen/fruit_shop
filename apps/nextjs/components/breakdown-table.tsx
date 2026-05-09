import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BreakdownRow } from "@/lib/types"
import { formatCurrency, formatNumber } from "@/lib/format"

interface BreakdownTableProps {
  title: string
  amountLabel: string
  rows: BreakdownRow[]
}

export function BreakdownTable({ title, amountLabel, rows }: BreakdownTableProps) {
  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fruit</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">{amountLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No data for selected date.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.fruitId}>
                <TableCell className="font-medium">{row.fruitName}</TableCell>
                <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
