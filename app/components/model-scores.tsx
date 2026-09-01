import Link from "next/link"

import { getModelBenchmarkScores } from "@/lib/registry"

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
        通过 Hugging Face 仓库关联到该模型的公开质量分数抓取结果。分数描述所列变体本身，而非任何本地量化版本，且从不表示速度测量。
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
              <td>{row.category ?? "—"}</td>
              <td>{row.score ?? "—"}</td>
              <td>{row.rank ?? "—"}</td>
              <td>{row.variant ?? "—"}</td>
              <td>{row.conf ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
