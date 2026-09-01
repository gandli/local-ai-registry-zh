import Link from "next/link"
import type { ReactNode } from "react"

import { hrefWithFilter, recordHref } from "@/app/lib/catalog"
import {
  getSpeedSweep,
  marketPriceCount,
  recipeCountForHardware,
  runtimeGroup,
  type CompatibilityResult,
  type PriceResult,
} from "@/lib/registry"
import type { Benchmark, Hardware, Model, SpeedSweep } from "@/registry/schema/types"

export type RowTag = {
  label: string
  name: string
  value: string
}

const CNY_RATE = 7.18
const CNY_FORMATTER = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  maximumFractionDigits: 0,
  style: "currency",
})
const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
})

function formatCnyUsd(amount: number, currency: string): { amount: string; title: string } {
  if (currency === "USD") {
    const cny = Math.round(amount * CNY_RATE)
    return { amount: CNY_FORMATTER.format(cny), title: `${USD_FORMATTER.format(amount)} · 参考汇率 1 USD ≈ ${CNY_RATE} CNY，数据货币为 USD` }
  }
  return { amount: formatAmount(amount, currency), title: "" }
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function formatTokens(value: number | null): string {
  if (value === null) return "上下文未知"
  if (value >= 10000) return `约 ${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)} 万 tokens`
  if (value >= 1024) {
    const thousands = value / 1024
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K tokens`
  }
  return `${value.toLocaleString("zh-CN")} tokens`
}

function formatRate(value: number): string {
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })} tok/s`
}

function formatWan(value: number): string {
  return value >= 10000 ? `约 ${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)} 万` : value.toLocaleString("zh-CN")
}

function formatAmount(amount: number, currency: string): string {
  if (currency === "USD") return USD_FORMATTER.format(amount)
  if (currency === "CNY") return CNY_FORMATTER.format(amount)
  return `${currency} ${amount.toLocaleString("zh-CN")}`
}

function peakSpeed(rows: Array<{ decode_tok_s_per_stream?: number | null; decode_tok_s?: number | null; prefill_tok_s?: number | null }>): number | null {
  const values = rows.flatMap((row) => {
    const value = row.decode_tok_s_per_stream ?? row.decode_tok_s ?? row.prefill_tok_s
    return typeof value === "number" ? [value] : []
  })
  return values.length > 0 ? Math.max(...values) : null
}

function recipeEvidence(result: CompatibilityResult) {
  return result.recipe.speed_sweep_ids.flatMap((sweepId) => {
    const sweep = getSpeedSweep(sweepId)
    return sweep ? sweep.rows : []
  })
}

function TaxonomyTags({ state, tags }: { state: URLSearchParams; tags: RowTag[] }) {
  return (
    <span className="taxonomy-tags">
      {tags.slice(0, 4).map((tag) => (
        <Link aria-label={`按 ${tag.label} 筛选`} href={hrefWithFilter(state, tag.name, tag.value)} key={`${tag.name}:${tag.value}`}>
          {tag.label}
        </Link>
      ))}
    </span>
  )
}

function BrowserRow({
  children,
  className,
  href,
  label,
  state,
  status,
  tags,
}: {
  children: ReactNode
  className: string
  href: string
  label: string
  state: URLSearchParams
  status?: "validated" | "candidate"
  tags: RowTag[]
}) {
  return (
    <article className={`browser-row ${className}`}>
      <Link aria-label={label} className="row-open" href={href} />
      {status && <span className={`status-mark ${status}`} aria-hidden="true" />}
      {children}
      <TaxonomyTags state={state} tags={tags} />
      <svg aria-hidden="true" className="row-arrow" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg>
    </article>
  )
}

function BrowseEmpty() {
  return <p className="browse-empty">未找到匹配结果，试试调整搜索或筛选条件。</p>
}

export function RecipeRows({ by, data, state }: { by: "hardware" | "model"; data: CompatibilityResult[]; state: URLSearchParams }) {
  if (data.length === 0) return <BrowseEmpty />
  return (
    <div className="browser-list recipe-browser-list">
      {data.map((result) => {
        const context = numberField(result.recipe.serving, "max_context_tokens")
        const speed = peakSpeed(recipeEvidence(result))
        const validation = result.launchable ? "validated" : "candidate"
        const runtime = runtimeGroup(result.recipe.launch.kind)
        const tags: RowTag[] = [
          { label: validation === "validated" ? "已验证" : "候选", name: "validation", value: validation },
          { label: result.recipe.engine.name, name: "engine", value: result.recipe.engine.name },
          { label: runtime === "docker" ? "Docker" : runtime === "native" ? "原生" : "仅参考", name: "runtime", value: runtime },
          { label: result.speed_evidence.available ? "已实测" : "未实测", name: "evidence", value: String(result.speed_evidence.available) },
          { label: `${result.hardware.memory.vram_gb} GB+`, name: "min_vram_gb", value: String(result.hardware.memory.vram_gb) },
        ]
        const hardware = (
          <span className={by === "hardware" ? "row-primary" : undefined}>
            <strong>{result.hardware.name}</strong>
            <small>{result.recipe.hardware_count} × {result.hardware.memory.vram_gb} GB</small>
          </span>
        )
        const model = (
          <span className={by === "model" ? "row-primary" : undefined}>
            <strong>{result.model.name}</strong>
            <small>{result.model_instance.weights.precision ?? result.model_instance.weights.format ?? "精度未知"}</small>
          </span>
        )
        return (
          <BrowserRow
            className="recipe-browser-row"
            href={recordHref("recipes", result.id)}
            key={result.id}
            label={`打开 ${result.model.name} 部署方案`}
            state={state}
            status={validation}
            tags={tags}
          >
            {by === "hardware" ? hardware : model}
            {by === "hardware" ? model : hardware}
            <span><strong>{result.recipe.engine.name}</strong><small>{result.recipe.launch.kind}</small></span>
            <span><strong>{formatTokens(context)}</strong><small>上下文</small></span>
            <span><strong>{speed === null ? "—" : formatRate(speed)}</strong><small>{result.speed_evidence.available ? "实测" : "无证据"}</small></span>
          </BrowserRow>
        )
      })}
    </div>
  )
}

export function PriceRows({ data, state }: { data: PriceResult[]; state: URLSearchParams }) {
  if (data.length === 0) return <BrowseEmpty />
  return (
    <div className="browser-list collection-list">
      {data.map((record) => {
        const amount = record.summary.lowest_new ?? record.summary.lowest_refurbished ?? record.summary.lowest_used
        const condition = record.summary.lowest_new !== null
          ? "全新"
          : record.summary.lowest_refurbished !== null ? "翻新" : record.summary.lowest_used !== null ? "二手" : "无在售"
        const tags: RowTag[] = [
          { label: record.region.code, name: "region", value: record.region.code },
          { label: record.product.category, name: "category", value: record.product.category },
          { label: condition, name: "condition", value: condition },
        ]
        return (
          <BrowserRow
            className="price-row"
            href={recordHref("prices", record.id)}
            key={record.id}
            label={`打开 ${record.product.name} 市场观察`}
            state={state}
            tags={tags}
          >
            <span className="row-primary"><strong>{record.product.name}</strong><small>{record.product.id}</small></span>
            <span><strong>{amount === null ? "暂无在售" : formatCnyUsd(amount, record.region.currency).amount}</strong><small title={amount === null ? undefined : formatCnyUsd(amount, record.region.currency).title}>最低报价 · {condition}</small></span>
            <span><strong>{record.region.name}</strong><small>{record.region.currency}</small></span>
            <span><strong>{record.observed_at.slice(0, 10)}</strong><small>观察日期</small></span>
            <span><strong>{record.summary.listing_count.toLocaleString("zh-CN")} 条在售</strong><small>{record.summary.retailer_count} 家零售商</small></span>
          </BrowserRow>
        )
      })}
    </div>
  )
}

export function HardwareRows({ data, state }: { data: Hardware[]; state: URLSearchParams }) {
  if (data.length === 0) return <BrowseEmpty />
  return (
    <div className="browser-list collection-list">
      {data.map((hardware) => {
        const hasPrices = marketPriceCount(hardware.id) > 0
        const recipes = recipeCountForHardware(hardware.id)
        const tags: RowTag[] = [
          { label: hardware.vendor, name: "vendor", value: hardware.vendor },
          { label: hardware.accelerator_backend, name: "backend", value: hardware.accelerator_backend },
          { label: `${hardware.memory.vram_gb} GB+`, name: "min_vram_gb", value: String(hardware.memory.vram_gb) },
          ...(hasPrices ? [{ label: "有报价", name: "priced_only", value: "true" }] : []),
          { label: recipes > 0 ? `${recipes} 个部署方案` : "暂无部署方案", name: "has_recipes", value: recipes > 0 ? "true" : "false" },
        ]
        return (
          <BrowserRow
            className="collection-row"
            href={recordHref("hardware", hardware.id)}
            key={hardware.id}
            label={`打开 ${hardware.name}`}
            state={state}
            tags={tags}
          >
            <span className="row-primary"><strong>{hardware.name}</strong><small>{hardware.id}</small></span>
            <span><strong>{hardware.vendor}</strong><small>{hardware.kind}</small></span>
            <span><strong>{hardware.memory.vram_gb} GB</strong><small>{hardware.memory.vram_type ?? "内存类型未知"}</small></span>
            <span><strong>{recipes.toLocaleString("zh-CN")}</strong><small>部署方案</small></span>
          </BrowserRow>
        )
      })}
    </div>
  )
}

export function ModelRows({ data, state }: { data: Model[]; state: URLSearchParams }) {
  if (data.length === 0) return <BrowseEmpty />
  return (
    <div className="browser-list collection-list">
      {data.map((model) => {
        const tags: RowTag[] = [
          { label: model.family, name: "family", value: model.family },
          { label: model.architecture ?? "unknown", name: "architecture", value: model.architecture ?? "unknown" },
        ]
        return (
          <BrowserRow
            className="collection-row"
            href={recordHref("models", model.id)}
            key={model.id}
            label={`打开 ${model.name}`}
            state={state}
            tags={tags}
          >
            <span className="row-primary"><strong>{model.name}</strong><small>{model.id}</small></span>
            <span><strong>{model.family}</strong><small>系列</small></span>
            <span><strong>{model.architecture ?? "未知"}</strong><small>架构</small></span>
            <span><strong>{model.params ?? "—"}</strong><small>参数量</small></span>
            <span><strong>{model.downloads?.last_30d != null ? formatWan(model.downloads.last_30d) : "—"}</strong><small>HF 月下载</small></span>
          </BrowserRow>
        )
      })}
    </div>
  )
}

export function BenchmarkRows({ data, state }: { data: Benchmark[]; state: URLSearchParams }) {
  if (data.length === 0) return <BrowseEmpty />
  return (
    <div className="browser-list collection-list">
      {data.map((benchmark) => {
        const top = benchmark.rows[0]
        const tags: RowTag[] = [
          ...(benchmark.category ? [{ label: benchmark.category, name: "category", value: benchmark.category }] : []),
        ]
        return (
          <BrowserRow
            className="collection-row"
            href={recordHref("benchmark", benchmark.id)}
            key={benchmark.id}
            label={`打开 ${benchmark.id}`}
            state={state}
            tags={tags}
          >
            <span className="row-primary"><strong>{benchmark.name}</strong><small>{benchmark.id}</small></span>
            <span><strong>{benchmark.category ?? "未知"}</strong><small>类别</small></span>
            <span><strong>{benchmark.rows.length}</strong><small>评分模型</small></span>
            <span><strong>{top ? (top.score === null ? "—" : top.score.toLocaleString("zh-CN", { maximumFractionDigits: 1 })) : "—"}</strong><small>最高分</small></span>
          </BrowserRow>
        )
      })}
    </div>
  )
}
