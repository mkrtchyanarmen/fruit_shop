"use client"

import Image from "next/image"
import type { Fruit } from "@fruit-shop/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FruitSelectProps {
  fruits: Fruit[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function FruitSelect({
  fruits,
  value,
  onChange,
  disabled,
  placeholder = "Ընտրել միրգ",
}: FruitSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {fruits.map((fruit) => (
          <SelectItem key={fruit.id} value={String(fruit.id)}>
            <div className="flex items-center gap-2">
              {fruit.image?.url ? (
                <Image
                  src={`${fruit.image.url}`}
                  alt={fruit.image.alternativeText ?? fruit.name}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded object-cover"
                />
              ) : (
                <div className="h-6 w-6 rounded bg-muted" />
              )}
              <span>{fruit.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
