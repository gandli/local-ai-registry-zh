export type HuggingFaceIdentity = {
  link_type?: string
  reason?: string | { code: string; detail: string }
  repository?: string | null
  status?: string
  url?: string
}

export type RelatedLink = {
  href: string
  id: string
  label: string
}

export type RelatedGroup = {
  key: string
  label: string
  links: RelatedLink[]
  moreHref: string | null
  total: number
}

const RELATED_CAP = 8

const RELATION_LABELS: Record<string, string> = {
  hardware: "硬件",
  model: "模型",
  model_instance: "模型文件",
  model_instances: "模型文件",
  prices: "价格",
  recipe: "部署方案",
  recipes: "部署方案",
  speed_sweep: "速度实测",
}

const TREE_OMIT = new Set([
  "launch",
  "huggingface",
  "relationships",
  "description",
  "registry",
])

export type RecordFact = {
  href?: string
  label: string
  value: string
}

export type CopyItem = {
  label: string
  value: string
}

function nestedName(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (value && typeof value === "object" && "name" in value && typeof value.name === "string") return value.name
  return null
}

export function recordTitle(detail: Record<string, unknown>, fallback: string): string {
  if (typeof detail.name === "string" && detail.name) return detail.name
  if (typeof detail.repository === "string" && detail.repository) return detail.repository
  return nestedName(detail, "product") ?? nestedName(detail, "model") ?? (typeof detail.id === "string" ? detail.id : fallback)
}

export function huggingFaceIdentity(record: Record<string, unknown>): HuggingFaceIdentity | null {
  const value = record.huggingface
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as HuggingFaceIdentity
}

export function displayRecord(detail: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(detail).filter(([key]) => !TREE_OMIT.has(key)))
}

export function recipeIsLaunchable(record: Record<string, unknown>): boolean {
  const registry = record.registry
  return record.status === "validated"
    && !!registry
    && typeof registry === "object"
    && "launchable" in registry
    && registry.launchable === true
}

function isRecordLink(value: unknown): value is { href: string; id: string; name?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const link = value as { href?: unknown; id?: unknown }
  return typeof link.href === "string" && typeof link.id === "string"
}

function moreHrefFor(key: string, record: Record<string, unknown>): string | null {
  const id = typeof record.id === "string" ? record.id : ""
  if (key === "recipes" && id) {
    if (typeof record.vendor === "string" || typeof record.memory === "object") return `/?topic=recipes&hardware_id=${encodeURIComponent(id)}`
    if (typeof record.family === "string") return `/?topic=recipes&model_id=${encodeURIComponent(id)}`
  }
  return null
}

export function relatedGroups(record: Record<string, unknown>): RelatedGroup[] {
  const relationships = record.relationships
  if (!relationships || typeof relationships !== "object" || Array.isArray(relationships)) return []
  const groups: RelatedGroup[] = []
  for (const [key, value] of Object.entries(relationships as Record<string, unknown>)) {
    const items = (Array.isArray(value) ? value : [value]).filter(isRecordLink)
    if (items.length === 0) continue
    groups.push({
      key,
      label: RELATION_LABELS[key] ?? key.replaceAll("_", " "),
      links: items.slice(0, RELATED_CAP).map((item) => ({
        href: item.href,
        id: item.id,
        label: item.name || item.id,
      })),
      moreHref: items.length > RELATED_CAP ? moreHrefFor(key, record) : null,
      total: items.length,
    })
  }
  return groups
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function fact(label: string, value: unknown, href?: string): RecordFact | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number" && Number.isFinite(value)) return { label, value: value.toLocaleString(), href }
  if (typeof value === "boolean") return { label, value: value ? "是" : "否", href }
  if (typeof value === "string") return { label, value, href }
  return null
}

function capabilityFacts(record: Record<string, unknown>): RecordFact[] {
  const capabilities = asObject(record.capabilities)
  if (!capabilities) return []
  const labels: Record<string, string> = { chat: "对话", reasoning: "推理", tools: "工具", vision: "视觉" }
  return ["chat", "reasoning", "tools", "vision"].flatMap((key) => {
    const value = capabilities[key]
    if (value === true) return [{ label: labels[key] ?? key, value: "是" }]
    if (value === false) return [{ label: labels[key] ?? key, value: "否" }]
    return [{ label: labels[key] ?? key, value: "未知" }]
  })
}

export function recordDescription(record: Record<string, unknown>): string | null {
  return typeof record.description === "string" && record.description.trim() ? record.description : null
}

export function recordFacts(collection: string, record: Record<string, unknown>): RecordFact[] {
  const engine = asObject(record.engine)
  const serving = asObject(record.serving)
  const memory = asObject(record.memory)
  const weights = asObject(record.weights)
  const product = asObject(record.product)
  const region = asObject(record.region)
  const summary = asObject(record.summary)
  if (collection === "recipes") {
    return [
      fact("状态", record.status),
      fact("来源", record.recipe_source),
      fact("引擎", engine?.name),
      fact("引擎版本", engine?.version),
      fact("计算图", engine?.graph_mode),
      fact("加速器数", record.hardware_count),
      fact("张量并行", serving?.tensor_parallel),
      fact("上下文长度", serving?.max_context_tokens),
      fact("最大并发", serving?.max_concurrency),
      fact("KV 缓存", serving?.kv_cache_tokens),
      ...capabilityFacts(record),
    ].filter((item): item is RecordFact => item !== null)
  }
  if (collection === "hardware") {
    return [
      fact("厂商", record.vendor),
      fact("类型", record.kind),
      fact("后端", record.accelerator_backend),
      fact("显存", memory?.vram_gb === undefined ? null : `${memory.vram_gb} GB`),
      fact("内存类型", memory?.vram_type),
      fact("带宽", (() => {
        const bandwidth = memory?.bandwidth_gb_per_s
        if (bandwidth === undefined || bandwidth === null) return null
        if (typeof bandwidth === "object") {
          const range = bandwidth as { min?: number; max?: number }
          return `${range.min ?? "?"}–${range.max ?? "?"} GB/s`
        }
        return `${bandwidth} GB/s`
      })()),
    ].filter((item): item is RecordFact => item !== null)
  }
  if (collection === "models") {
    const downloads = asObject(record.downloads)
    const monthly = typeof downloads?.last_30d === "number" ? downloads.last_30d.toLocaleString("en-US") : null
    return [
      fact("系列", record.family),
      fact("架构", record.architecture),
      fact("参数量", record.params),
      fact("激活参数量", record.active_params),
      fact("HF 月下载量", monthly),
    ].filter((item): item is RecordFact => item !== null)
  }
  if (collection === "model-instances") {
    return [
      fact("仓库", record.repository),
      fact("版本", record.revision),
      fact("精度", weights?.precision),
      fact("格式", weights?.format),
    ].filter((item): item is RecordFact => item !== null)
  }
  if (collection === "prices") {
    return [
      fact("产品", product?.name),
      fact("区域", region?.name ?? region?.code),
      fact("货币", region?.currency),
      fact("条目数", summary?.listing_count),
    ].filter((item): item is RecordFact => item !== null)
  }
  if (collection === "speed-sweep") {
    const rows = Array.isArray(record.rows) ? record.rows.length : null
    return [
      fact("部署方案", record.recipe_id, typeof record.recipe_id === "string" ? `/recipes/${record.recipe_id}` : undefined),
      fact("测量于", record.measured_at),
      fact("接受于", record.accepted_at),
      fact("数据点数", rows),
    ].filter((item): item is RecordFact => item !== null)
  }
  if (collection === "benchmark") {
    const rows = Array.isArray(record.rows) ? record.rows.length : null
    return [
      fact("类别", record.category),
      fact("评分模型数", rows),
    ].filter((item): item is RecordFact => item !== null)
  }
  return []
}

export function copyItems(collection: string, record: Record<string, unknown>): CopyItem[] {
  const id = typeof record.id === "string" ? record.id : ""
  const items: CopyItem[] = []
  if (id) {
    items.push({ label: "ID", value: id })
    items.push({ label: "JSON API", value: `/api/v1/${collection}/${id}` })
    items.push({ label: "记录 URL", value: `/${collection}/${id}` })
  }
  const hub = huggingFaceIdentity(record)
  if (hub?.status === "known" && hub.url) items.push({ label: "Hub 仓库", value: hub.url })
  if (typeof record.revision === "string" && record.revision) items.push({ label: "版本", value: record.revision })
  if (recipeIsLaunchable(record)) {
    const launch = asObject(record.launch)
    const args = Array.isArray(launch?.arguments) ? launch.arguments.filter((item): item is string => typeof item === "string") : []
    if (args.length > 0) items.push({ label: "启动参数", value: args.join(" ") })
  }
  return items
}
