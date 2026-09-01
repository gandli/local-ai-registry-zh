import Link from "next/link"

import { getModelBenchmarkScores } from "@/lib/registry"

const CATEGORY_LABELS: Record<string, string> = { coding: "编程", knowledge: "知识", math: "数学", multimodal: "多模态", reasoning: "推理", speech_asr: "语音识别", "speech-asr": "语音识别", instruction_following: "指令遵循", tool_use: "工具调用" }
const CONF_LABELS: Record<string, string> = { high: "高", medium: "中", low: "低" }

export function ModelScores({ modelId }: { modelId: string }) {
  const scores = getModelBenchmarkScores(modelId)
  if (scores.length === 0) return null
  const rows = [...scores].sort(
    (left, right) =>
      (left.category ?? "").localeCompare(right.category ?? "") ||
      left.benchmark_id.localeCompare(right.benchmark_id),
  )
  return (
    <section aria-label="公开排行榜分数" className="record-evidence">
      <p className="eyebrow">排行榜分数</p>
      <p className="trust-note">
        通过 Hugging Face 仓库关联抓取的公开排行榜分数。分数只描述所列变体本身，不代表本地量化版本，也不含速度数据。
      </p>
      <table className="flag-table">
        <thead>
          <tr>
            <th>基准</th>
            <th>类别</th>
            <th>分数</th>
            <th>排名</th>
            <th>评分变体</th>
            <th>置信度</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.benchmark_id}-${index}`}>
              <td><Link href={`/benchmark/${row.benchmark_id}`}>{row.benchmark_id}</Link></td>
              <td>{row.category ? (CATEGORY_LABELS[row.category] ?? row.category) : "—"}</td>
              <td>{row.score ?? "—"}</td>
              <td>{row.rank ?? "—"}</td>
              <td>{row.variant ?? "—"}</td>
              <td>{row.conf ? (CONF_LABELS[row.conf] ?? row.conf) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
