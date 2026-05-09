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
import { createSaleItem, getFruits } from "@/lib/strapi"
import type { Fruit } from "@fruit-shop/types"

const saleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  fruitId: z.string().min(1, "Fruit is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  pricePerUnit: z.coerce.number().positive("Price must be greater than zero"),
})

type SaleFormValues = z.infer<typeof saleSchema>

export default function SalesPage() {
  const today = getTodayLocalIsoDate()
  const { activeShopId } = useShopContext()
  const [date, setDate] = useState(today)
  const [fruits, setFruits] = useState<Fruit[]>([])
  const [isFruitsLoading, setIsFruitsLoading] = useState(true)
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
        requestError instanceof Error ? requestError.message : "Could not save sale",
      )
    }
  })

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Sales</h2>
      {!activeShopId ? (
        <EmptyShopState />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Log Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="sale-date">Date</Label>
                  <Input id="sale-date" type="date" {...form.register("date")} />
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
                  <Label htmlFor="sale-qty">Quantity</Label>
                  <Input id="sale-qty" type="number" step="0.01" {...form.register("quantity")} />
                  {form.formState.errors.quantity ? (
                    <p className="text-xs text-red-600">{form.formState.errors.quantity.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sale-price">Price per Unit</Label>
                  <Input
                    id="sale-price"
                    type="number"
                    step="0.01"
                    {...form.register("pricePerUnit")}
                  />
                  {form.formState.errors.pricePerUnit ? (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.pricePerUnit.message}
                    </p>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Sale"}
                  </Button>
                  {submitError ? <p className="mt-2 text-sm text-red-600">{submitError}</p> : null}
                </div>
              </form>
            </CardContent>
          </Card>

          {error ? <PageError message={error} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>Sales for {date}</CardTitle>
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
                      <TableHead className="text-right">Price/Unit</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No sales for this date.
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
