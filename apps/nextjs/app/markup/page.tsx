"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
import { EmptyShopState, PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { STRAPI_BASE_URL } from "@/lib/constants"
import { formatCurrency } from "@/lib/format"
import {
  impliedMarkupPercentDisplay,
  markupAmountPerUnit,
  retailPriceRangeFromUnitCost,
} from "@/lib/pricing"
import { weightedAverageUnitCostByFruit } from "@/lib/inventory"
import { getAllStockArrivalsForShop, getFruits, updateFruit } from "@/lib/strapi"
import type { Fruit } from "@fruit-shop/types"

function resolvePreviewRetail(userDraft: string, fruit: Fruit): number | null {
  const trimmed = userDraft.trim()
  if (trimmed !== "") {
    const n = Number(trimmed.replace(",", "."))
    if (Number.isFinite(n) && n > 0) return n
    return null
  }
  return fruit.retailPricePerUnit ?? null
}

export default function MarkupPricingPage() {
  const { activeShopId } = useShopContext()
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [draftPrice, setDraftPrice] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const list = await getFruits()
      setFruits(list)
      const next: Record<number, string> = {}
      for (const f of list) {
        next[f.id] =
          f.retailPricePerUnit !== undefined && f.retailPricePerUnit !== null
            ? String(Math.round(f.retailPricePerUnit))
            : ""
      }
      setDraftPrice(next)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Բեռնումը ձախողվեց")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const [shopArrivals, setShopArrivals] = useState<Awaited<
    ReturnType<typeof getAllStockArrivalsForShop>
  >>([])

  useEffect(() => {
    if (!activeShopId) {
      setShopArrivals([])
      return
    }
    const run = async () => {
      try {
        setShopArrivals(await getAllStockArrivalsForShop(activeShopId))
      } catch {
        setShopArrivals([])
      }
    }
    void run()
  }, [activeShopId])

  const avgCostByFruitId = useMemo(() => {
    const { averages } = weightedAverageUnitCostByFruit(shopArrivals)
    return averages
  }, [shopArrivals])

  const saveRetailPrice = async (fruit: Fruit) => {
    setError(null)
    const raw = draftPrice[fruit.id]?.trim() ?? ""
    let payload: number | null
    if (raw === "") {
      payload = null
    } else {
      const n = Number(raw.replace(",", "."))
      if (!Number.isFinite(n) || n <= 0) {
        setError("Մուտքագրեք դրական գին կամ թողեք դատարկ՝ լռելյայն տոկոսային առաջարկի համար։")
        return
      }
      payload = Math.round(n * 100) / 100
    }

    if (!fruit.documentId) {
      setError(
        "Strapi documentId բացակայում է։ Թարմացրեք էջը կամ ստուգեք Strapi 5 REST պատասխանը։",
      )
      return
    }

    setSavingId(fruit.id)
    try {
      await updateFruit(fruit.documentId, { retailPricePerUnit: payload })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Պահպանումը ձախողվեց")
    } finally {
      setSavingId(null)
    }
  }

  const sortedFruits = useMemo(
    () => [...fruits].sort((a, b) => a.name.localeCompare(b.name)),
    [fruits],
  )

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Գներ և markup</h2>
        <p className="text-sm text-muted-foreground">
          Մուտքագրեք <strong>վաճառքի գինը դրամով / միավոր</strong>։ Markup-ը (դրամ և տոկոս)
          հաշվարկվում է ավտոմատ՝ միջին ինքնարժեքից։ Դատարկ դաշտը՝ լռելյայն տոկոսային միջակայք (30–40%)։
          Փոփոխությունը չի դիպում արդեն վաճառված գրառումներին։
        </p>
      </div>

      {!activeShopId ? (
        <EmptyShopState />
      ) : loadError ? (
        <PageError message={loadError} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ապրանքներ ըստ վաճառքի գնի</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ապրանք</TableHead>
                    <TableHead className="text-right">Միջին ինքնարժեք</TableHead>
                    <TableHead className="text-right">Վաճառքի գին (դրամ)</TableHead>
                    <TableHead className="text-right">Markup (AMD)</TableHead>
                    <TableHead className="text-right">≈ Տոկոս</TableHead>
                    <TableHead className="text-right">Առաջարկ</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFruits.map((fruit) => {
                    const unitCost = avgCostByFruitId.get(fruit.id)
                    const hasCost = unitCost !== undefined && unitCost > 0
                    const draftRaw = draftPrice[fruit.id] ?? ""
                    const previewRetail = resolvePreviewRetail(draftRaw, fruit)

                    const previewRange = hasCost
                      ? retailPriceRangeFromUnitCost(unitCost, previewRetail)
                      : null

                    const markupAmd = hasCost
                      ? markupAmountPerUnit(unitCost, previewRetail)
                      : null

                    const suggestedDisplay = previewRange
                      ? previewRange.min === previewRange.max
                        ? formatCurrency(previewRange.suggested)
                        : `${formatCurrency(previewRange.min)} – ${formatCurrency(previewRange.max)} · ${formatCurrency(previewRange.suggested)}`
                      : "—"

                    const pctDisplay =
                      hasCost && previewRange && unitCost > 0
                        ? impliedMarkupPercentDisplay(unitCost, previewRange.suggested)
                        : null

                    return (
                      <TableRow key={fruit.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {fruit.image?.url ? (
                              <Image
                                src={`${STRAPI_BASE_URL}${fruit.image.url}`}
                                alt={fruit.name}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted" />
                            )}
                            <span className="font-medium">{fruit.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {hasCost ? formatCurrency(unitCost) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            className="ml-auto h-9 w-[110px] text-right tabular-nums sm:w-28"
                            inputMode="decimal"
                            placeholder="լռելյայն"
                            value={draftPrice[fruit.id] ?? ""}
                            onChange={(e) =>
                              setDraftPrice((prev) => ({
                                ...prev,
                                [fruit.id]: e.target.value,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {markupAmd !== null ? formatCurrency(markupAmd) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                          {pctDisplay ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] text-right text-xs tabular-nums sm:text-sm">
                          {suggestedDisplay}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={savingId === fruit.id}
                            onClick={() => void saveRetailPrice(fruit)}
                          >
                            {savingId === fruit.id ? "…" : "Պահպանել"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
