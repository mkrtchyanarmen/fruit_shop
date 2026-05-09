"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { EmptyShopState, PageError } from "@/components/page-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useShopContext } from "@/hooks/use-shop-context"
import { formatCurrency, formatFruitUnit, formatNumber } from "@/lib/format"
import { computeFruitInventoryRows } from "@/lib/inventory"
import { retailPriceRangeFromUnitCost } from "@/lib/pricing"
import { getAllSalesForShop, getAllStockArrivalsForShop } from "@/lib/strapi"

export default function InventoryPage() {
  const { activeShopId } = useShopContext()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [rows, setRows] = useState<ReturnType<typeof computeFruitInventoryRows>>([])

  const load = useCallback(async () => {
    if (!activeShopId) {
      setRows([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const [arrivals, sales] = await Promise.all([
        getAllStockArrivalsForShop(activeShopId),
        getAllSalesForShop(activeShopId),
      ])
      setRows(computeFruitInventoryRows(arrivals, sales))
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Պահեստի տվյալները բեռնել չհաջողվեց",
      )
    } finally {
      setIsLoading(false)
    }
  }, [activeShopId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Պահեստի մնացորդ</h2>
        <p className="text-sm text-muted-foreground">
          Ընտրված խանութում յուրաքանչյուր մրգի փաստացի քանակը՝ բոլոր մուտքերի և վաճառքների տարբերությամբ։
          Առաջարկվող գինը՝ միջին ինքնարժեք և markup (տես «Գներ և markup» էջը)։
        </p>
      </div>

      {!activeShopId ? (
        <EmptyShopState />
      ) : error ? (
        <PageError message={error} />
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Քանակներ ըստ մրգերի</CardTitle>
            <button
              type="button"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              Թարմացնել
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Միրգ</TableHead>
                    <TableHead className="text-right">Առկա է</TableHead>
                    <TableHead>Չափման միավոր</TableHead>
                    <TableHead className="text-right">Միջին ինքնարժեք</TableHead>
                    <TableHead className="text-right">Առաջարկվող գին</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Այս խանութի համար դեռ մուտք կամ վաճառք չի գրանցված։
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const retail = retailPriceRangeFromUnitCost(
                        row.weightedAverageUnitCost ?? 0,
                        row.fruit.retailPricePerUnit ?? null,
                      )
                      return (
                        <TableRow key={row.fruit.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {row.fruit.image?.url ? (
                                <Image
                                  src={`${row.fruit.image.url}`}
                                  alt={row.fruit.name}
                                  width={28}
                                  height={28}
                                  className="h-7 w-7 rounded object-cover"
                                />
                              ) : (
                                <div className="h-7 w-7 rounded bg-muted" />
                              )}
                              <span>{row.fruit.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatNumber(row.quantityOnHand)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatFruitUnit(row.fruit.unit)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.weightedAverageUnitCost !== undefined
                              ? formatCurrency(row.weightedAverageUnitCost)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {retail ? (
                              <span>
                                {formatCurrency(retail.min)} – {formatCurrency(retail.max)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
