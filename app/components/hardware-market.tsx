import Link from "next/link"

import { REGION_LABELS } from "@/app/lib/catalog"
import { getHardwareMarket } from "@/lib/registry"

function money(amount: number | null, currency: string): string {
  if (amount === null) return "—"
  const symbol = { CNY: "¥", USD: "$", EUR: "€", GBP: "£", JPY: "¥", PLN: "zł " }[currency] ?? `${currency} `
  return `${symbol}${amount.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`
}

function day(value: string): string {
  return value.slice(0, 10)
}

export function HardwareMarket({ hardwareId }: { hardwareId: string }) {
  const market = getHardwareMarket(hardwareId)
  if (market.length === 0) return null
  return (
    <section aria-label="当前市场价格" className="record-evidence">
      <p className="eyebrow">当前市场</p>
      <p className="trust-note">
        来自市场价格集合的各区域最低在售零售商报价，以当地货币显示。每行链接到含零售商与 URL 的底层观察记录。
      </p>
      <table className="flag-table">
        <thead>
          <tr>
            <th>区域</th>
            <th>最低全新</th>
            <th>翻新</th>
            <th>二手</th>
            <th>在售数</th>
            <th>观察日期</th>
          </tr>
        </thead>
        <tbody>
          {market.map((row) => (
            <tr key={row.record_id}>
              <td><Link href={`/prices/${row.record_id}`}>{REGION_LABELS[row.region] ?? row.region}</Link></td>
              <td>{money(row.lowest_new, row.currency)}</td>
              <td>{money(row.lowest_refurbished, row.currency)}</td>
              <td>{money(row.lowest_used, row.currency)}</td>
              <td>{row.listing_count.toLocaleString("en-US")} · {row.retailer_count.toLocaleString("en-US")} 家零售商</td>
              <td>{day(row.observed_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
