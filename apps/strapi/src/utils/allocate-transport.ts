/**
 * Same logic as @fruit-shop/allocate-transport (Next.js). Kept locally so Strapi’s
 * Node CJS runtime does not require() the workspace TS/ESM package (SyntaxError).
 */
export interface TransportLineInput {
  quantity: number;
  unitCost: number;
}

export function allocateTransportAmongLines(
  lines: TransportLineInput[],
  totalTransport: number,
): number[] {
  const n = lines.length;
  if (n === 0) return [];

  const target = Math.max(0, Number(totalTransport) || 0);

  const weights = lines.map((l) => {
    const q = Math.max(0, Number(l.quantity) || 0);
    const c = Math.max(0, Number(l.unitCost) || 0);
    const valueWeight = q * c;
    if (valueWeight > 0) return valueWeight;
    if (q > 0) return q;
    return 0;
  });

  const sumW = weights.reduce((a, b) => a + b, 0);

  let exact: number[];
  if (sumW <= 0) {
    const active = lines.filter((l) => (Number(l.quantity) || 0) > 0).length;
    if (active === 0) {
      return lines.map(() => 0);
    }
    const each = target / active;
    exact = lines.map((l) => ((Number(l.quantity) || 0) > 0 ? each : 0));
  } else {
    exact = weights.map((w) => (w / sumW) * target);
  }

  const targetCents = Math.round(target * 100);
  const rawCents = exact.map((x) => x * 100);
  const floorCents = rawCents.map((x) => Math.floor(x + 1e-9));
  let remainder = targetCents - floorCents.reduce((a, b) => a + b, 0);

  const fractionalOrder = rawCents
    .map((x, i) => ({
      i,
      frac: x - Math.floor(x + 1e-9),
    }))
    .sort((a, b) => b.frac - a.frac);

  const outCents = [...floorCents];
  for (let k = 0; k < fractionalOrder.length && remainder > 0; k++) {
    outCents[fractionalOrder[k].i] += 1;
    remainder -= 1;
  }

  return outCents.map((c) => c / 100);
}
