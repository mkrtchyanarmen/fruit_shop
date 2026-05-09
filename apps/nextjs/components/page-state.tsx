import { Card, CardContent } from "@/components/ui/card"

export function PageError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-red-600">{message}</CardContent>
    </Card>
  )
}

export function EmptyShopState() {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">
        Ակտիվ խանութ ընտրված չէ։ Ստեղծեք կամ ակտիվացրեք խանութ «Կարգավորումներ» բաժնում։
      </CardContent>
    </Card>
  )
}
