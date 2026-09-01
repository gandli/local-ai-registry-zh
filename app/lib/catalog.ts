export const REGION_LABELS: Record<string, string> = { CN: "中国大陆", DE: "德国", GB: "英国", JP: "日本", PL: "波兰", US: "美国" }

export type Topic = "recipes" | "hardware" | "models" | "prices" | "benchmark"

export type TopicSpec = {
  countKey: string | null
  description: string
  key: Topic
  label: string
}

export const TOPICS: TopicSpec[] = [
  { key: "recipes", label: "部署方案", countKey: "recipe", description: "模型文件 × 硬件 × 引擎的兼容单元。已验证条目可安全启动，每条部署方案均附带实测速度数据。" },
  { key: "hardware", label: "硬件", countKey: "hardware", description: "加速器规格，关联可兼容的模型、部署方案和区域价格。" },
  { key: "models", label: "模型", countKey: "model", description: "规范模型，关联模型文件、支持的硬件和部署方案。" },
  { key: "prices", label: "价格", countKey: "price", description: "最新区域市场观察价，以当地货币显示。候选匹配条目仍可查看。" },
  { key: "benchmark", label: "排行榜", countKey: "benchmark", description: "来自 GitHub Pages 排行榜（如 Terminal-Bench 2.1）的公开质量分数，非本地速度测量。" },
]

const COLLECTION_LABELS: Record<string, string> = {
  hardware: "硬件",
  "model-instances": "模型文件",
  models: "模型",
  prices: "区域市场价",
  recipes: "部署方案",
  benchmark: "排行榜",
  "speed-sweep": "速度实测",
}

const COLLECTION_TOPICS: Record<string, Topic> = {
  hardware: "hardware",
  "model-instances": "recipes",
  models: "models",
  prices: "prices",
  recipes: "recipes",
  benchmark: "benchmark",
  "speed-sweep": "recipes",
}

export const TOPIC_FILTERS: Record<Topic, string[]> = {
  hardware: ["vendor", "backend", "min_vram_gb", "priced_only", "has_recipes"],
  models: ["family", "architecture"],
  prices: ["region", "category", "condition", "retailer", "in_stock"],
  recipes: ["by", "hardware_id", "model_id", "validation", "engine", "runtime", "evidence", "min_context"],
  benchmark: ["category"],
}

export function isTopic(value: string): value is Topic {
  return TOPICS.some((topic) => topic.key === value)
}

export function topicSpec(value: string): TopicSpec | undefined {
  return TOPICS.find((topic) => topic.key === value)
}

export function isCollection(value: string): boolean {
  return value in COLLECTION_LABELS
}

export function collectionLabel(collection: string): string | undefined {
  return COLLECTION_LABELS[collection]
}

export function collectionTopic(collection: string): Topic | undefined {
  return COLLECTION_TOPICS[collection]
}

export function topicHref(key: Topic, query = ""): string {
  const selected = new URLSearchParams()
  selected.set("topic", key)
  if (query) selected.set("q", query)
  return `/?${selected.toString()}`
}

export function collectionHref(collection: string): string {
  const topic = collectionTopic(collection)
  return topic ? topicHref(topic) : "/"
}

export function recordHref(collection: string, id: string): string {
  return `/${collection}/${id}`
}

export function hrefWithRecord(state: URLSearchParams, id: string): string {
  const selected = new URLSearchParams(state)
  selected.set("record", id)
  return `/?${selected.toString()}`
}

export function hrefWithFilter(state: URLSearchParams, name: string, value: string): string {
  const selected = new URLSearchParams(state)
  selected.delete("record")
  selected.delete("offset")
  selected.set(name, value)
  return `/?${selected.toString()}`
}

export function stateHref(state: URLSearchParams): string {
  const query = state.toString()
  return query ? `/?${query}` : "/"
}
