"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Controller, useForm } from "react-hook-form"
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
import { createStockArrival, getFruits } from "@/lib/strapi"
import type { Fruit } from "@fruit-shop/types"

const stockSchema = z.object({
  date: z.string().min(1, "Date is required"),
  fruitId: z.string().min(1, "Fruit is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unitCost: z.coerce.number().nonnegative("Unit cost cannot be negative"),
  transportCost: z.coerce.number().nonnegative("Transport cost cannot be negative"),
})

type StockFormValues = z.infer<typeof stockSchema>

export default function StockPage() {
  const today = getTodayLocalIsoDate()
  const { activeShopId } = useShopContext()
  const [date, setDate] = useState(today)
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [isFruitsLoading, setIsFruitsLoading] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { arrivals, isLoading, error, refresh } = useDailyData(date, activeShopId)

  const form = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      date: today,
      fruitId: "",
      quantity: 0,
      unitCost: 0,
      transportCost: 0,
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

  const onSubmit = form.handleSubmit(async (values) => {
    if (!activeShopId) return
    setSubmitError(null)
    try {
      await createStockArrival({
        date: values.date,
        fruitId: Number(values.fruitId),
        shopId: activeShopId,
        quantity: values.quantity,
        unitCost: values.unitCost,
        transportCost: values.transportCost,
      })
      setDate(values.date)
      await refresh()
      form.reset({
        ...values,
        fruitId: "",
        quantity: 0,
        unitCost: 0,
        transportCost: 0,
      })
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error ? requestError.message : "Could not save arrival",
      )
    }
  })

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Stock Arrivals</h2>
      {!activeShopId ? (
        <EmptyShopState />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Log New Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="stock-date">Date</Label>
                  <Input id="stock-date" type="date" {...form.register("date")} />
                  {form.formState.errors.date ? (
                    <p className="text-xs text-red-600">{form.formState.errors.date.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Fruit</Label>
                  <Controller
                    control={form.control}
                    name="fruitId"
                    render={({ field }) => (
                      <FruitSelect
                        fruits={fruits}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isFruitsLoading}
                        placeholder={isFruitsLoading ? "Loading fruits..." : "Select fruit"}
                      />
                    )}
                  />
                  {form.formState.errors.fruitId ? (
                    <p className="text-xs text-red-600">{form.formState.errors.fruitId.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-qty">Quantity</Label>
                  <Input id="stock-qty" type="number" step="0.01" {...form.register("quantity")} />
                  {form.formState.errors.quantity ? (
                    <p className="text-xs text-red-600">{form.formState.errors.quantity.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-unit-cost">Unit Cost</Label>
                  <Input
                    id="stock-unit-cost"
                    type="number"
                    step="0.01"
                    {...form.register("unitCost")}
                  />
                  {form.formState.errors.unitCost ? (
                    <p className="text-xs text-red-600">{form.formState.errors.unitCost.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-transport-cost">Transport Cost</Label>
                  <Input
                    id="stock-transport-cost"
                    type="number"
                    step="0.01"
                    {...form.register("transportCost")}
                  />
                  {form.formState.errors.transportCost ? (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.transportCost.message}
                    </p>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Delivery"}
                  </Button>
                  {submitError ? <p className="mt-2 text-sm text-red-600">{submitError}</p> : null}
                </div>
              </form>
            </CardContent>
          </Card>

          {error ? <PageError message={error} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>Arrivals for {date}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fruit</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Transport</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arrivals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No arrivals for this date.
                        </TableCell>
                      </TableRow>
                    ) : (
                      arrivals.map((arrival) => (
                        <TableRow key={arrival.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {arrival.fruit.image?.url ? (
                                <Image
                                  src={`${STRAPI_BASE_URL}${arrival.fruit.image.url}`}
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
