import Link from "next/link"

import {
  BenchmarkRows,
  HardwareRows,
  ModelRows,
  PriceRows,
  RecipeRows,
} from "@/app/components/browse-rows"
import { CollectionNav } from "@/app/components/collection-nav"
import { RecordBody } from "@/app/components/record-body"
import { ModalCloseButton, RecordModal } from "@/app/components/record-modal"
import { RegistrySearch, type SearchFilter } from "@/app/components/registry-search"
import {
  REGION_LABELS,
  TOPIC_FILTERS,
  TOPICS,
  isTopic,
  stateHref,
  topicHref,
  topicSpec,
  type Topic,
} from "@/app/lib/catalog"
import { recordTitle } from "@/app/lib/record-view"
import {
  collectionCounts,
  getEntityDetail,
  getFacets,
  listHardware,
  listBenchmarks,
  listModels,
  listPrices,
  queryCompatibility,
  type CompatibilityFilters,
} from "@/lib/registry"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function facetOptions(values: Array<string | number>, allLabel: string, format: (value: string | number) => string = String): SearchFilter["options"] {
  return [{ label: allLabel, value: "" }, ...values.map((value) => ({ label: format(value), value: String(value) }))]
}

function param(params: Record<string, string | string[] | undefined>, key: string): string {
  const selected = params[key]
  return Array.isArray(selected) ? selected[0] : selected ?? ""
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const value = (key: string) => param(params, key)
  const topicValue = value("topic")
  const topic: Topic | "" = isTopic(topicValue) ? topicValue : ""
  const query = value("q")
  const validation = value("validation")
  const recipeBrowse = value("by") === "model" ? "model" : "hardware"
  const offset = Math.max(0, Number(value("offset")) || 0)
  const limit = topic === "recipes" ? 24 : 32
  const pagination = { limit, offset }
  const facets = getFacets()
  const counts = collectionCounts()
  const spec = topic ? topicSpec(topic) : undefined

  const recipeFilters: CompatibilityFilters = {
    engine: value("engine"),
    evidence: value("evidence"),
    hardware_id: value("hardware_id"),
    launchable: validation === "validated" ? "true" : validation === "candidate" ? "false" : "",
    min_context: value("min_context"),
    min_vram_gb: value("min_vram_gb"),
    model_id: value("model_id"),
    q: query,
    runtime: value("runtime"),
    sort_by: recipeBrowse,
  }
  const overviewRecipes = queryCompatibility({ launchable: "true" }, { limit: 8, offset: 0 })
  const recipeResults = topic === "recipes" ? queryCompatibility(recipeFilters, pagination) : { data: [], total: 0 }
  const hardwareResults = topic === "hardware" ? listHardware({
    backend: value("backend"),
    has_recipes: value("has_recipes"),
    min_vram_gb: value("min_vram_gb"),
    priced_only: value("priced_only"),
    q: query,
    vendor: value("vendor"),
  }, pagination) : { data: [], total: 0 }
  const modelResults = topic === "models" ? listModels({
    architecture: value("architecture"),
    family: value("family"),
    q: query,
  }, pagination) : { data: [], total: 0 }
  const priceResults = topic === "prices" ? listPrices({
    category: value("category"),
    condition: value("condition"),
    in_stock: value("in_stock"),
    q: query,
    region: value("region"),
    retailer: value("retailer"),
  }, pagination) : { data: [], total: 0 }
  const priceTotal = counts.price ?? (topic === "prices" ? priceResults.total : listPrices({}, { limit: 1, offset: 0 }).total)
  const benchmarkResults = topic === "benchmark" ? listBenchmarks({ q: query, category: value("category") }, pagination) : { data: [], total: 0 }
  const matchCounts = !topic && query
    ? {
        recipes: queryCompatibility({ q: query }, { limit: 1, offset: 0 }).total,
        hardware: listHardware({ q: query }, { limit: 1, offset: 0 }).total,
        models: listModels({ q: query }, { limit: 1, offset: 0 }).total,
        prices: listPrices({ q: query }, { limit: 1, offset: 0 }).total,
        benchmark: listBenchmarks({ q: query }, { limit: 1, offset: 0 }).total,
      }
    : null

  const viewState = new URLSearchParams()
  if (topic) viewState.set("topic", topic)
  if (topic === "recipes") viewState.set("by", recipeBrowse)
  if (query) viewState.set("q", query)
  for (const key of topic ? TOPIC_FILTERS[topic] : []) {
    const selected = value(key)
    if (selected) viewState.set(key, selected)
  }
  if (offset > 0) viewState.set("offset", String(offset))

  const selectedId = value("record")
  const selectedRecord = topic && selectedId ? getEntityDetail(topic, selectedId) : undefined
  const closeHref = stateHref(viewState)
  const totals: Record<Topic, number> = {
    recipes: recipeResults.total,
    hardware: hardwareResults.total,
    models: modelResults.total,
    prices: priceResults.total,
    benchmark: benchmarkResults.total,
  }
  const total = topic ? totals[topic] : 0

  const pageState = new URLSearchParams(viewState)
  pageState.delete("offset")
  const previousState = new URLSearchParams(pageState)
  previousState.set("offset", String(Math.max(0, offset - limit)))
  const nextState = new URLSearchParams(pageState)
  nextState.set("offset", String(offset + limit))

  const recipeSearchFilters: SearchFilter[] = [
    { label: "浏览方式", name: "by", value: recipeBrowse, options: [{ label: "按硬件", value: "hardware" }, { label: "按模型", value: "model" }] },
    { label: "硬件", name: "hardware_id", value: value("hardware_id"), options: [{ label: "全部硬件", value: "" }, ...listHardware({}, { limit: 200, offset: 0 }).data.map((hardware) => ({ label: hardware.name, value: hardware.id }))] },
    { label: "模型", name: "model_id", value: value("model_id"), options: [{ label: "全部模型", value: "" }, ...listModels({}, { limit: 200, offset: 0 }).data.map((model) => ({ label: model.name, value: model.id }))] },
    { label: "状态", name: "validation", value: validation, options: facetOptions(["validated", "candidate"], "全部状态", (item) => item === "validated" ? "已验证 · 可启动" : "候选或参考") },
    { label: "引擎", name: "engine", value: value("engine"), options: facetOptions(facets.recipes.engine, "任意引擎") },
    { label: "运行方式", name: "runtime", value: value("runtime"), options: [
      { label: "任意运行方式", value: "" },
      { label: "Docker / compose", value: "docker" },
      { label: "原生（无 Docker）", value: "native" },
      { label: "仅参考", value: "reference" },
    ] },
    { label: "证据", name: "evidence", value: value("evidence"), options: facetOptions(["true", "false"], "任意证据", (item) => item === "true" ? "已附实测速度" : "无实测速度") },
    { label: "上下文", name: "min_context", value: value("min_context"), options: facetOptions(["32768", "65536", "131072", "262144", "499968"], "任意长度", (item) => `至少 ${Math.round(Number(item) / 1024)}K tokens`) },
  ]
  const topicFilters = topic === "recipes"
    ? recipeSearchFilters
    : topic === "hardware"
      ? [
          { label: "厂商", name: "vendor", value: value("vendor"), options: facetOptions(facets.hardware.vendor, "任意厂商") },
          { label: "后端", name: "backend", value: value("backend"), options: facetOptions(facets.hardware.backend, "任意后端") },
          { label: "显存", name: "min_vram_gb", value: value("min_vram_gb"), options: facetOptions(facets.hardware.vram_gb, "任意显存", (item) => `至少 ${item} GB`) },
          { label: "价格", name: "priced_only", value: value("priced_only"), options: facetOptions(["true"], "全部硬件", () => "仅看有报价") },
          { label: "部署方案", name: "has_recipes", value: value("has_recipes"), options: facetOptions(["true", "false"], "全部硬件", (item) => item === "true" ? "有部署方案" : "暂无部署方案") },
        ]
      : topic === "models"
        ? [
            { label: "系列", name: "family", value: value("family"), options: facetOptions(facets.models.family, "任意系列") },
            { label: "架构", name: "architecture", value: value("architecture"), options: facetOptions(facets.models.architecture, "任意架构") },
          ]
        : topic === "prices"
          ? [
              { label: "区域", name: "region", value: value("region"), options: facetOptions(facets.prices.region, "任意区域", (item) => REGION_LABELS[String(item)] ?? String(item)) },
              { label: "类别", name: "category", value: value("category"), options: facetOptions(facets.prices.category, "任意类别") },
              { label: "成色", name: "condition", value: value("condition"), options: facetOptions(facets.prices.condition, "任意成色") },
              { label: "零售商", name: "retailer", value: value("retailer"), options: facetOptions(facets.prices.retailer, "任意零售商") },
              { label: "库存", name: "in_stock", value: value("in_stock"), options: facetOptions(["true", "false", "unknown"], "任意库存", (item) => item === "true" ? "有货" : item === "false" ? "缺货" : "库存未知") },
            ]
          : topic === "benchmark"
            ? [{ label: "类别", name: "category", value: value("category"), options: facetOptions(facets.benchmarks.category, "任意类别") }]
            : []

  return (
    <main className="registry-main">
      <CollectionNav current={topic} query={query} />

      {!topic ? (
        <>
          <header className="overview-heading"><span className="mono-label">只读索引 · 数据可溯源</span><h1>模型库索引</h1></header>
          <section className="overview-search" aria-label="搜索模型库"><RegistrySearch filters={[]} query={query} topic="" /></section>
          <nav aria-label="模型库分类计数" className="topic-index">
            {TOPICS.map((item, index) => {
              const count = matchCounts
                ? matchCounts[item.key]
                : item.key === "prices" ? priceTotal : item.countKey ? counts[item.countKey] : undefined
              return (
                <Link href={topicHref(item.key, query)} key={item.key}>
                  <span className="mono-label">0{index + 1}</span><strong>{item.label}</strong><span>{typeof count === "number" ? count.toLocaleString() : "—"}</span>
                </Link>
              )
            })}
          </nav>
          {query ? (
            <p className="topic-description">匹配记录保留在各自分类中。公开分数（如 Terminal-Bench 2.1）请看排行榜，实测 tok/s 请看速度实测。</p>
          ) : (
            <section className="overview-recipes">
              <div className="section-heading"><div><span className="mono-label">已验证 / 可启动</span><h2>可安全启动的部署方案</h2></div><Link href="/?topic=recipes&validation=validated">查看全部</Link></div>
              <RecipeRows by="model" data={overviewRecipes.data} state={new URLSearchParams("topic=recipes&by=model&validation=validated")} />
            </section>
          )}
        </>
      ) : (
        <>
          <header className="topic-heading"><div><span className="mono-label">分类 / {spec?.label}</span><h1>{spec?.label}</h1><p className="topic-description">{spec?.description}</p></div><span className="topic-total">{total.toLocaleString()} 条记录</span></header>
          <section className="topic-search" aria-label={`${spec?.label} 搜索`}><RegistrySearch filters={topicFilters} query={query} topic={topic} /></section>
          {topic === "recipes" && <RecipeRows by={recipeBrowse} data={recipeResults.data} state={viewState} />}
          {topic === "hardware" && <HardwareRows data={hardwareResults.data} state={viewState} />}
          {topic === "models" && <ModelRows data={modelResults.data} state={viewState} />}
          {topic === "prices" && <PriceRows data={priceResults.data} state={viewState} />}
          {topic === "benchmark" && <BenchmarkRows data={benchmarkResults.data} state={viewState} />}
          {total === 0 && <div className="empty-state"><h2>未找到记录。</h2><p>请清除搜索词或移除筛选条件。</p></div>}
          {(offset > 0 || offset + limit < total) && (
            <nav aria-label={`${spec?.label} 分页`} className="pagination">
              {offset > 0 ? <Link href={stateHref(previousState)}>上一页</Link> : <span />}
              <span>{offset + 1}–{Math.min(offset + limit, total)} / 共 {total}</span>
              {offset + limit < total ? <Link href={stateHref(nextState)}>下一页</Link> : <span />}
            </nav>
          )}
        </>
      )}

      {selectedRecord && topic && (
        <RecordModal closeHref={closeHref} titleId="record-modal-title">
          <header className="record-modal-header">
            <div><span className="mono-label">{spec?.label} / 详情</span><h2 id="record-modal-title">{recordTitle(selectedRecord, selectedId)}</h2><code>{selectedId}</code></div>
            <ModalCloseButton className="modal-close" closeHref={closeHref} label="关闭记录详情">关闭</ModalCloseButton>
          </header>
          <div className="record-modal-body">
            <RecordBody collection={topic} record={selectedRecord} variant="overlay" />
          </div>
          <footer className="record-modal-footer">
            <a href={`/api/v1/${topic}/${selectedId}`}>JSON API</a>
            <Link href={`/${topic}/${selectedId}`}>永久记录链接</Link>
          </footer>
        </RecordModal>
      )}
    </main>
  )
}
