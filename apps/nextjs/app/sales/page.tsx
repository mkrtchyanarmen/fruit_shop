"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { STRAPI_BASE_URL } from "@/lib/constants"
import { getTodayLocalIsoDate } from "@/lib/date"
import { formatCurrency, formatNumber } from "@/lib/format"
import { weightedAverageUnitCostByFruit } from "@/lib/inventory"
import { MARKUP_MAX, MARKUP_MIN, retailPriceRangeFromUnitCost } from "@/lib/pricing"
import { createSaleItem, getAllStockArrivalsForShop, getFruits } from "@/lib/strapi"
import type { Fruit } from "@fruit-shop/types"

const saleSchema = z.object({
  date: z.string().min(1, "Ամսաթիվը պարտադիր է"),
  fruitId: z.string().min(1, "Ընտրեք միրգ"),
  quantity: z.coerce.number().positive("Քանակը պետք է լինի զրոյից մեծ"),
  pricePerUnit: z.coerce.number().positive("Գինը պետք է լինի զրոյից մեծ"),
})

type SaleFormValues = z.infer<typeof saleSchema>

export default function SalesPage() {
  const today = getTodayLocalIsoDate()
  const { activeShopId } = useShopContext()
  const [date, setDate] = useState(today)
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [isFruitsLoading, setIsFruitsLoading] = useState(true)
  const [shopArrivalsLoading, setShopArrivalsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { sales, isLoading, error, refresh } = useDailyData(date, activeShopId)

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      date: today,
      fruitId: "",
      quantity: 0,
      pricePerUnit: 0,
    },
  })

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

  const [shopArrivals, setShopArrivals] = useState<Awaited<
    ReturnType<typeof getAllStockArrivalsForShop>
  >>([])

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

  const selectedFruitId = useWatch({ control: form.control, name: "fruitId" })
  const watchedCost =
    selectedFruitId !== "" ? avgCostByFruitId.get(Number(selectedFruitId)) : undefined
  const retailHint =
    watchedCost !== undefined ? retailPriceRangeFromUnitCost(watchedCost) : null

  const { setValue } = form
  useEffect(() => {
    if (!selectedFruitId) {
      setValue("pricePerUnit", 0)
      return
    }
    const cost = avgCostByFruitId.get(Number(selectedFruitId))
    const range = retailPriceRangeFromUnitCost(cost ?? 0)
    if (range) {
      setValue("pricePerUnit", range.suggested)
    } else {
      setValue("pricePerUnit", 0)
    }
  }, [selectedFruitId, avgCostByFruitId, setValue])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!activeShopId) return
    setSubmitError(null)
    try {
      await createSaleItem({
        date: values.date,
        fruitId: Number(values.fruitId),
        shopId: activeShopId,
        quantity: values.quantity,
        pricePerUnit: values.pricePerUnit,
      })
      setDate(values.date)
      await refresh()
      form.reset({
        ...values,
        fruitId: "",
        quantity: 0,
        pricePerUnit: 0,
      })
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error ? requestError.message : "Վաճառքը պահպանել չհաջողվեց",
      )
    }
  })

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Վաճառք</h2>
      {!activeShopId ? (
        <EmptyShopState />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Վաճառք գրանցել</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="sale-date">Ամսաթիվ</Label>
                  <Input id="sale-date" type="date" {...form.register("date")} />
                  {form.formState.errors.date ? (
                    <p className="text-xs text-red-600">{form.formState.errors.date.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Միրգ</Label>
                  <Controller
                    control={form.control}
                    name="fruitId"
                    render={({ field }) => (
                      <FruitSelect
                        fruits={fruits}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isFruitsLoading}
                        placeholder={isFruitsLoading ? "Մրգերի բեռնում…" : "Ընտրել միրգ"}
                      />
                    )}
                  />
                  {form.formState.errors.fruitId ? (
                    <p className="text-xs text-red-600">{form.formState.errors.fruitId.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sale-qty">Քանակ</Label>
                  <Input id="sale-qty" type="number" step="0.01" {...form.register("quantity")} />
                  {form.formState.errors.quantity ? (
                    <p className="text-xs text-red-600">{form.formState.errors.quantity.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sale-price">Միավորի գին</Label>
                  <Input
                    id="sale-price"
                    type="number"
                    step="0.01"
                    {...form.register("pricePerUnit")}
                  />
                  {shopArrivalsLoading ? (
                    <p className="text-xs text-muted-foreground">
                      Հաշվարկվում է միջին ինքնարժեքը…
                    </p>
                  ) : retailHint && watchedCost !== undefined ? (
                    <p className="text-xs text-muted-foreground">
                      Միջին ինքնարժեքի ({formatCurrency(watchedCost)}) նկատմամբ{" "}
                      {Math.round(MARKUP_MIN * 100)}–{Math.round(MARKUP_MAX * 100)}% ավելացում՝{" "}
                      {formatCurrency(retailHint.min)} – {formatCurrency(retailHint.max)}։
                      Լռելյայն՝ {Math.round(((MARKUP_MIN + MARKUP_MAX) / 2) * 100)}%։
                    </p>
                  ) : selectedFruitId ? (
                    <p className="text-xs text-muted-foreground">
                      Այս մրգի մուտք դեռ չի գրանցված՝ մուտքագրեք վաճառքի գինը։
                    </p>
                  ) : null}
                  {form.formState.errors.pricePerUnit ? (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.pricePerUnit.message}
                    </p>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Պահպանում…" : "Պահպանել վաճառքը"}
                  </Button>
                  {submitError ? <p className="mt-2 text-sm text-red-600">{submitError}</p> : null}
                </div>
              </form>
            </CardContent>
          </Card>

          {error ? <PageError message={error} /> : null}

          <Card>
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
                                  src={`${STRAPI_BASE_URL}${sale.fruit.image.url}`}
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
