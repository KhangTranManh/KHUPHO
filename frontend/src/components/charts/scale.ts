/** Tính thang trục Y "đẹp" (bước tròn 1/2/5 × 10^n) bao trọn khoảng [min, max]. */
export function niceScale(min: number, max: number, tickCount = 4) {
  if (max === min) max = min + 1;
  const rawStep = (max - min) / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = hi; v >= lo - step / 2; v -= step) ticks.push(Math.round(v));
  return { min: lo, max: hi, ticks };
}
