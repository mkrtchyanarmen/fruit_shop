"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Shop } from "@fruit-shop/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useShopContext } from "@/hooks/use-shop-context"
import { createShop, getShops, updateShop } from "@/lib/strapi"

const shopSchema = z.object({
  name: z.string().min(2, "Անվանումը պետք է լինի առնվազն 2 նիշ"),
  address: z.string().min(3, "Հասցեն պետք է լինի առնվազն 3 նիշ"),
})

type ShopFormValues = z.infer<typeof shopSchema>

export default function SettingsPage() {
  const { refreshShops } = useShopContext()
  const [shops, setShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  })

  const loadShops = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fetched = await getShops()
      setShops(fetched)
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Խանութները բեռնել չհաջողվեց",
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadShops()
  }, [])

  const onSubmit = form.handleSubmit(async (values) => {
    await createShop(values)
    await Promise.all([loadShops(), refreshShops()])
    form.reset()
  })

  const onToggleShop = async (shop: Shop, nextState: boolean) => {
    if (!shop.documentId) {
      setError("Խանութի documentId բացակայում է։ Թարմացրեք էջը։")
      return
    }
    await updateShop(shop.documentId, { isActive: nextState })
    await Promise.all([loadShops(), refreshShops()])
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Կարգավորումներ</h2>
      <Card>
        <CardHeader>
          <CardTitle>Նոր խանութ</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="shop-name">Անվանում</Label>
              <Input id="shop-name" {...form.register("name")} placeholder="Խանութի անվանում" />
              {form.formState.errors.name ? (
                <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-address">Հասցե</Label>
              <Input id="shop-address" {...form.register("address")} placeholder="Հասցե" />
              {form.formState.errors.address ? (
                <p className="text-xs text-red-600">{form.formState.errors.address.message}</p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Պահպանում…" : "Ավելացնել"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Խանութների կառավարում</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Անվանում</TableHead>
                  <TableHead>Հասցե</TableHead>
                  <TableHead className="text-right">Ակտիվ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell>{shop.address || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Switch
                          checked={shop.isActive}
                          onCheckedChange={(checked) => void onToggleShop(shop, checked)}
                          aria-label={`${shop.name} — ակտիվ`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {shops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Խանութներ չեն գտնվել։
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
