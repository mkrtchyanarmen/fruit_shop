"use client"

import { allocateTransportAmongLines } from "@fruit-shop/allocate-transport"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { EmptyShopState, PageError } from "@/components/page-state"
import { FruitSelect } from "@/components/fruit-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDailyData } from "@/hooks/use-daily-data"
import { useShopContext } from "@/hooks/use-shop-context"
import { getTodayLocalIsoDate } from "@/lib/date"
import { formatCurrency, formatFruitUnit, formatNumber } from "@/lib/format"
import { createStockArrivalsBulk, getFruits } from "@/lib/strapi"
import type { Fruit } from "@fruit-shop/types"

function newLineKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

type DraftLine = {
  key: string
  fruitId: string
  quantity: number
  unitCost: number
}

export default function StockPage() {
  const today = getTodayLocalIsoDate()
  const { activeShopId } = useShopContext()
  const [date, setDate] = useState(today)
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [isFruitsLoading, setIsFruitsLoading] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lines, setLines] = useState<DraftLine[]>(() => [
    { key: newLineKey(), fruitId: "", quantity: 1, unitCost: 0 },
  ])
  const [totalTransportCost, setTotalTransportCost] = useState(0)

  const { arrivals, isLoading, error, refresh } = useDailyData(date, activeShopId)

  useEffect(() => {
    const fetchFruits = async () => {
      setIsFruitsLoading(true)
      try {
        const fetched = await getFruits()
        setFruits(fetched)
      } finally {
        setIsFruitsLoading(false)
      }
    }
    void fetchFruits()
  }, [])

  const fruitById = useMemo(() => new Map(fruits.map((f) => [f.id, f])), [fruits])

  const validLines = useMemo(
    () =>
      lines.filter((l) => {
        const id = Number(l.fruitId)
        return Number.isFinite(id) && id > 0 && l.quantity > 0
      }),
    [lines],
  )

  const allocationPreview = useMemo(() => {
    if (validLines.length === 0) return new Map<string, number>()
    const inputs = validLines.map((l) => ({
      quantity: l.quantity,
      unitCost: Math.max(0, l.unitCost),
    }))
    const shares = allocateTransportAmongLines(inputs, totalTransportCost)
    const map = new Map<string, number>()
    validLines.forEach((l, i) => {
      map.set(l.key, shares[i] ?? 0)
    })
    return map
  }, [validLines, totalTransportCost])

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  const onFruitChange = (key: string, fruitId: string) => {
    const prev = lines.find((l) => l.key === key)
    const patch: Partial<DraftLine> = { fruitId }
    if (fruitId && prev?.fruitId !== fruitId) {
      patch.quantity = 1
    }
    updateLine(key, patch)
  }

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { key: newLineKey(), fruitId: "", quantity: 1, unitCost: 0 },
    ])
  }

  const removeLine = (key: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((l) => l.key !== key)
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeShopId) return
    setSubmitError(null)

    if (validLines.length === 0) {
      setSubmitError("Ավելացրեք առնվազն մեկ տող՝ ընտրեք միրգ և մուտքագրեք քանակ (միավորի արժեքը կարող է լինել 0)։")
      return
    }

    if (totalTransportCost < 0 || Number.isNaN(totalTransportCost)) {
      setSubmitError("Ընդհանուր տրանսպորտի գումարը պետք է լինի ոչ բացասական։")
      return
    }

    for (const l of validLines) {
      if (l.unitCost < 0 || Number.isNaN(l.unitCost)) {
        setSubmitError("Միավորի արժեքը չի կարող բացասական լինել։")
        return
      }
    }

    setIsSaving(true)
    try {
      await createStockArrivalsBulk({
        date,
        shopId: activeShopId,
        totalTransportCost,
        items: validLines.map((l) => ({
          fruitId: Number(l.fruitId),
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      })
      setDate(date)
      await refresh()
      setLines([{ key: newLineKey(), fruitId: "", quantity: 1, unitCost: 0 }])
      setTotalTransportCost(0)
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error ? requestError.message : "Մուտքը պահպանել չհաջողվեց",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Ապրանքների մուտք</h2>
      {!activeShopId ? (
        <EmptyShopState />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Նոր մուտք գրանցել</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ավելացրեք մի քանի միրգ, մեկ անգամ մուտքագրեք ընդհանուր տրանսպորտի ծախսը՝ այն
                ավտոմատ կբաշխվի տողերի վրա՝ համամասնորեն (քանակ × միավորի արժեք), կամ եթե
                արժեք չկա՝ ըստ քանակի։ Միավորը (կգ / հատ / փունջ) գալիս է մրգի քարտից Strapi-ում։
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
                <div className="grid max-w-md gap-2">
                  <Label htmlFor="stock-date">Ամսաթիվ</Label>
                  <Input
                    id="stock-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-base">Մրգերի տողեր</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      Ավելացնել տող
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {lines.map((line) => {
                      const fruit = line.fruitId ? fruitById.get(Number(line.fruitId)) : undefined
                      const previewTransport = allocationPreview.get(line.key)
                      return (
                        <div
                          key={line.key}
                          className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_120px_120px_100px_auto]"
                        >
                          <div className="space-y-2 md:col-span-1">
                            <Label>Միրգ</Label>
                            <FruitSelect
                              fruits={fruits}
                              value={line.fruitId}
                              onChange={(v) => onFruitChange(line.key, v)}
                              disabled={isFruitsLoading}
                              placeholder={isFruitsLoading ? "Մրգերի բեռնում…" : "Ընտրել միրգ"}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`qty-${line.key}`}>
                              Քանակ
                              {fruit ? ` (${formatFruitUnit(fruit.unit)})` : ""}
                            </Label>
                            <Input
                              id={`qty-${line.key}`}
                              type="number"
                              step="0.01"
                              min={0.01}
                              value={line.quantity || ""}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  quantity: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`cost-${line.key}`}>Միավորի արժեք</Label>
                            <Input
                              id={`cost-${line.key}`}
                              type="number"
                              step="0.01"
                              min={0}
                              value={line.unitCost || ""}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  unitCost: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Տրանսպորտ (վիճակագրություն)</Label>
                            <p className="flex h-10 items-center text-sm tabular-nums text-muted-foreground">
                              {fruit && line.quantity > 0
                                ? formatCurrency(previewTransport ?? 0)
                                : "—"}
                            </p>
                          </div>
                          <div className="flex items-end justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => removeLine(line.key)}
                              disabled={lines.length <= 1}
                            >
                              Հանել
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid max-w-md gap-2">
                  <Label htmlFor="stock-total-transport">Ընդհանուր տրանսպորտի ծախս (դրամ)</Label>
                  <Input
                    id="stock-total-transport"
                    type="number"
                    step="0.01"
                    min={0}
                    value={totalTransportCost || ""}
                    onChange={(e) => setTotalTransportCost(Number(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Բաշխվում է տողերի միջև՝ ըստ տողի արժեքի (քանակ × միավորի արժեք)։
                  </p>
                </div>

                <div>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Պահպանում…" : "Պահպանել բոլոր մուտքերը"}
                  </Button>
                  {submitError ? <p className="mt-2 text-sm text-red-600">{submitError}</p> : null}
                </div>
              </form>
            </CardContent>
          </Card>

          {error ? <PageError message={error} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>Մուտքեր՝ {date}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Միրգ</TableHead>
                      <TableHead className="text-right">Քանակ</TableHead>
                      <TableHead className="text-right">Միավորի արժեք</TableHead>
                      <TableHead className="text-right">Տրանսպորտ</TableHead>
                      <TableHead className="text-right">Ծախս</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arrivals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Այս ամսաթվի մուտքեր չկան։
                        </TableCell>
                      </TableRow>
                    ) : (
                      arrivals.map((arrival) => (
                        <TableRow key={arrival.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {arrival.fruit.image?.url ? (
                                <Image
                                  src={`${arrival.fruit.image.url}`}
                                  alt={arrival.fruit.name}
                                  width={28}
                                  height={28}
                                  className="h-7 w-7 rounded object-cover"
                                />
                              ) : (
                                <div className="h-7 w-7 rounded bg-muted" />
                              )}
                              <span>{arrival.fruit.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(arrival.quantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(arrival.unitCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(arrival.transportCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(arrival.quantity * arrival.unitCost)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  )
}
