"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { EmptyShopState, PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { weightedAverageUnitCostByFruit } from "@/lib/inventory"
import { retailPriceRangeFromUnitCost } from "@/lib/pricing"
import { quantityPresetsForUnit } from "@/lib/sale-presets"
import {
  createSaleItemsBulk,
  getAllStockArrivalsForShop,
  getFruits,
} from "@/lib/strapi"
import type { Fruit } from "@fruit-shop/types"

interface CartLine {
  fruitId: number
  fruit: Fruit
  quantity: number
  pricePerUnit: number
}

function suggestedPrice(fruit: Fruit, averages: Map<number, number>) {
  const cost = averages.get(fruit.id)
  const range = retailPriceRangeFromUnitCost(cost ?? 0, fruit.retailPricePerUnit ?? null)
  return range?.suggested ?? 0
}

export interface SalesFlowProps {
  /** Ավելի նեղ վերին բլոկ մոբայլում՝ նկարների համար առավելագույն տարածք */
  compactMobileChrome?: boolean
}

export function SalesFlow({ compactMobileChrome = false }: SalesFlowProps) {
  const today = getTodayLocalIsoDate()
  const { activeShopId } = useShopContext()
  const [date, setDate] = useState(today)
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [isFruitsLoading, setIsFruitsLoading] = useState(true)
  const [shopArrivalsLoading, setShopArrivalsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [cart, setCart] = useState<CartLine[]>([])
  const [dialogFruit, setDialogFruit] = useState<Fruit | null>(null)
  const [dialogQty, setDialogQty] = useState(1)
  const [manualUnitPrice, setManualUnitPrice] = useState("")

  const { sales, isLoading, error, refresh } = useDailyData(date, activeShopId)

  const [shopArrivals, setShopArrivals] = useState<Awaited<
    ReturnType<typeof getAllStockArrivalsForShop>
  >>([])

  useEffect(() => {
    const fetchFruits = async () => {
      setIsFruitsLoading(true)
      try {
        setFruits(await getFruits())
      } finally {
        setIsFruitsLoading(false)
      }
    }
    void fetchFruits()
  }, [])

  useEffect(() => {
    if (!activeShopId) {
      setShopArrivals([])
      return
    }
    const run = async () => {
      setShopArrivalsLoading(true)
      try {
        setShopArrivals(await getAllStockArrivalsForShop(activeShopId))
      } catch {
        setShopArrivals([])
      } finally {
        setShopArrivalsLoading(false)
      }
    }
    void run()
  }, [activeShopId])

  const avgCostByFruitId = useMemo(() => {
    const { averages } = weightedAverageUnitCostByFruit(shopArrivals)
    return averages
  }, [shopArrivals])

  const dialogPrice = useMemo(() => {
    if (!dialogFruit) return 0
    const p = suggestedPrice(dialogFruit, avgCostByFruitId)
    return p > 0 ? p : 0
  }, [dialogFruit, avgCostByFruitId])

  const presets = dialogFruit ? quantityPresetsForUnit(dialogFruit.unit) : []

  useEffect(() => {
    if (!dialogFruit) return
    const ps = quantityPresetsForUnit(dialogFruit.unit)
    setDialogQty(ps[0] ?? 1)
    setManualUnitPrice("")
  }, [dialogFruit])

  const effectiveDialogUnitPrice = useMemo(() => {
    if (dialogPrice > 0) return dialogPrice
    const parsed = Number(manualUnitPrice.replace(",", "."))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }, [dialogPrice, manualUnitPrice])

  const dialogLineTotal = dialogQty * effectiveDialogUnitPrice

  const openDialog = (fruit: Fruit) => {
    setDialogFruit(fruit)
  }

  const addLineToCart = () => {
    if (!dialogFruit || !activeShopId) return
    const effectivePrice = effectiveDialogUnitPrice
    if (effectivePrice <= 0) return

    setCart((prev) => {
      const idx = prev.findIndex((l) => l.fruitId === dialogFruit.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + dialogQty,
          pricePerUnit: effectivePrice,
        }
        return next
      }
      return [
        ...prev,
        {
          fruitId: dialogFruit.id,
          fruit: dialogFruit,
          quantity: dialogQty,
          pricePerUnit: effectivePrice,
        },
      ]
    })
    setDialogFruit(null)
  }

  const cartTotal = cart.reduce((s, l) => s + l.quantity * l.pricePerUnit, 0)

  const finishSale = async () => {
    if (!activeShopId || cart.length === 0) return
    setSubmitError(null)
    setIsSaving(true)
    try {
      await createSaleItemsBulk({
        date,
        shopId: activeShopId,
        items: cart.map((l) => ({
          fruitId: l.fruitId,
          quantity: l.quantity,
          pricePerUnit: l.pricePerUnit,
        })),
      })
      setCart([])
      setDate(date)
      await refresh()
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error ? requestError.message : "Վաճառքը պահպանել չհաջողվեց",
      )
    } finally {
      setIsSaving(false)
    }
  }

  const removeCartLine = (fruitId: number) => {
    setCart((prev) => prev.filter((l) => l.fruitId !== fruitId))
  }

  const headerBlock = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold">Վաճառք</h2>
        <p className="text-sm text-muted-foreground">
          Ընտրեք ապրանքը նկարի վրա՝ քանակ և գին մեկ պատուհանում, այնուհետև ավարտեք ամբողջ պատվերը։
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        <Label htmlFor="sale-date-top">Ամսաթիվ</Label>
        <Input
          id="sale-date-top"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
    </div>
  )

  const mobileDateFloating = compactMobileChrome ? (
    <div className="fixed right-2 top-12 z-30 sm:hidden">
      <Label htmlFor="sale-date-float" className="sr-only">
        Ամսաթիվ
      </Label>
      <Input
        id="sale-date-float"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="h-9 w-[148px] border bg-background/95 text-xs shadow-sm backdrop-blur"
      />
    </div>
  ) : null

  return (
    <section className={compactMobileChrome ? "space-y-4 pb-28 sm:space-y-6" : "space-y-6 pb-28"}>
      {compactMobileChrome ? (
        <>
          <div className="hidden sm:block">{headerBlock}</div>
          {mobileDateFloating}
        </>
      ) : (
        headerBlock
      )}

      {!activeShopId ? (
        <EmptyShopState />
      ) : (
        <>
          {isFruitsLoading ? (
            <div
              className={
                compactMobileChrome
                  ? "grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5"
                  : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              }
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : (
            <div
              className={
                compactMobileChrome
                  ? "grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5"
                  : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              }
            >
              {fruits.map((fruit) => (
                <button
                  key={fruit.id}
                  type="button"
                  onClick={() => openDialog(fruit)}
                  className="group relative aspect-square overflow-hidden rounded-lg border bg-muted text-left shadow-sm transition hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-xl bg-white p-4"
                >
                  {fruit.image?.url ? (
                    <Image
                      src={`${fruit.image.url}`}
                      alt={fruit.name}
                      fill
                      className="object-contain transition group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 20vw"
                      priority={compactMobileChrome}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-4xl text-muted-foreground">
                      Missing image
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1.5 pt-6 sm:px-2 sm:pb-2 sm:pt-8">
                    <p className="text-xs font-semibold text-white drop-shadow sm:text-sm">{fruit.name}</p>
                    <p className="text-[10px] text-white/85 sm:text-xs">{formatFruitUnit(fruit.unit)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Dialog open={dialogFruit !== null} onOpenChange={(o) => !o && setDialogFruit(null)}>
            <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
              {dialogFruit ? (
                <>
                  <DialogHeader className="border-b px-4 pb-3 pt-4 text-left sm:px-6">
                    <DialogTitle>{dialogFruit.name}</DialogTitle>
                    <DialogDescription>
                      {shopArrivalsLoading
                        ? "Բեռնվում է ինքնարժեքը…"
                        : dialogFruit.retailPricePerUnit != null &&
                            dialogFruit.retailPricePerUnit > 0
                          ? `Ֆիքսված վաճառքի գին՝ ${formatCurrency(dialogPrice)} («Գներ և markup»)`
                          : dialogPrice > 0
                            ? `Առաջարկվող միավորի գին՝ ${formatCurrency(dialogPrice)}`
                            : "Մուտք չկա՝ գինը կարող եք փոխել ստորև (լռելյայն 1)։"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                    <div className="relative mx-auto mb-4 aspect-square w-full max-w-[280px] overflow-hidden rounded-lg bg-muted">
                      {dialogFruit.image?.url ? (
                        <Image
                          src={`${dialogFruit.image.url}`}
                          alt={dialogFruit.name}
                          fill
                          className="object-cover"
                          sizes="280px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-6xl">🍎</div>
                      )}
                    </div>

                    <p className="mb-2 text-sm font-medium">Քանակ ({formatFruitUnit(dialogFruit.unit)})</p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {presets.map((p) => (
                        <Button
                          key={p}
                          type="button"
                          variant={dialogQty === p ? "default" : "outline"}
                          size="sm"
                          className="min-w-[3.5rem]"
                          onClick={() => setDialogQty(p)}
                        >
                          {formatNumber(p)}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dialog-custom-qty">Յուրահատուկ քանակ</Label>
                      <Input
                        id="dialog-custom-qty"
                        type="number"
                        step="0.01"
                        min={0.01}
                        value={dialogQty}
                        onChange={(e) => setDialogQty(Number(e.target.value) || 0)}
                      />
                    </div>
                    {dialogPrice <= 0 ? (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="dialog-manual-price">Միավորի վաճառքի գին (դրամ)</Label>
                        <Input
                          id="dialog-manual-price"
                          inputMode="decimal"
                          placeholder="Օր․՝ 500"
                          value={manualUnitPrice}
                          onChange={(e) => setManualUnitPrice(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Միջին ինքնարժեք չկա՝ մուտքագրեք վաճառքի գինը։
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="sticky bottom-0 border-t bg-background px-4 py-4 sm:px-6">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Տողի գումար</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {effectiveDialogUnitPrice > 0 ? formatCurrency(dialogLineTotal) : "—"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={effectiveDialogUnitPrice <= 0 || dialogQty <= 0}
                      onClick={addLineToCart}
                    >
                      Ավելացնել զամբյուղ
                    </Button>
                  </div>
                </>
              ) : null}
            </DialogContent>
          </Dialog>

          {cart.length > 0 ? (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Ընթացիկ պատվեր</p>
                  <ul className="max-h-24 space-y-1 overflow-y-auto text-sm">
                    {cart.map((line) => (
                      <li
                        key={line.fruitId}
                        className="flex items-center justify-between gap-2 border-b border-border/60 pb-1 last:border-0"
                      >
                        <span className="truncate font-medium">{line.fruit.name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatNumber(line.quantity)} × {formatCurrency(line.pricePerUnit)}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-red-600 underline-offset-2 hover:underline"
                          onClick={() => removeCartLine(line.fruitId)}
                        >
                          Հանել
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <div className="text-right sm:text-left">
                    <p className="text-xs text-muted-foreground">Ընդամենը</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(cartTotal)}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="sm:h-10 sm:px-6"
                    disabled={isSaving}
                    onClick={() => void finishSale()}
                  >
                    {isSaving ? "Պահպանում…" : "Ավարտել և պահպանել"}
                  </Button>
                </div>
              </div>
              {submitError ? (
                <p className="mx-auto mt-2 max-w-7xl text-center text-sm text-red-600">
                  {submitError}
                </p>
              ) : null}
            </div>
          ) : submitError ? (
            <p className="text-center text-sm text-red-600">{submitError}</p>
          ) : null}

          {error ? <PageError message={error} /> : null}

          <Card className={compactMobileChrome ? "hidden sm:block" : undefined}>
            <CardHeader>
              <CardTitle>Վաճառքներ՝ {date}</CardTitle>
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
                      <TableHead className="text-right">Գին/միավոր</TableHead>
                      <TableHead className="text-right">Եկամուտ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Այս ամսաթվի վաճառքներ չկան։
                        </TableCell>
                      </TableRow>
                    ) : (
                      sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {sale.fruit.image?.url ? (
                                <Image
                                  src={`${sale.fruit.image.url}`}
                                  alt={sale.fruit.name}
                                  width={28}
                                  height={28}
                                  className="h-7 w-7 rounded object-cover"
                                />
                              ) : (
                                <div className="h-7 w-7 rounded bg-muted" />
                              )}
                              <span>{sale.fruit.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(sale.quantity)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(sale.pricePerUnit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(sale.quantity * sale.pricePerUnit)}
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
