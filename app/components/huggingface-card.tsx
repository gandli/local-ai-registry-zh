type HuggingFaceFields = {
  link_type?: string
  reason?: string | { code: string; detail: string }
  repository?: string | null
  status?: string
  url?: string
}

function reasonText(reason: HuggingFaceFields["reason"]): string {
  if (!reason) return "身份由模型库记录。"
  if (typeof reason === "string") return reason.replaceAll("-", " ")
  return `${reason.code.replaceAll("-", " ")}: ${reason.detail}`
}

export function HuggingFaceCard({ identity, title = "Hugging Face 模型卡片" }: { identity?: HuggingFaceFields | null; title?: string }) {
  if (!identity?.url) return null
  const known = identity.status === "known" && identity.link_type === "repository"
  return (
    <section aria-label={title} className="hf-card">
      <p className="eyebrow">{title}</p>
      <h3>身份</h3>
      <a href={identity.url} rel="noreferrer" target="_blank">{identity.url}</a>
      <dl>
        <div><dt>仓库</dt><dd>{identity.repository ?? "非精确仓库匹配"}</dd></div>
        <div><dt>状态</dt><dd>{{ known: "已确认", validated: "已验证", candidate: "候选" }[identity.status ?? ""] ?? identity.status ?? "未知"}</dd></div>
        <div><dt>链接类型</dt><dd>{identity.link_type === "repository" ? "精确 Hub 仓库" : identity.link_type === "search" ? "Hub 搜索兜底" : (identity.link_type ?? "—")}</dd></div>
      </dl>
      <p className="hf-card-note">
        {known
          ? "已通过 Hub API 确认的公开 Hugging Face 仓库。"
          : reasonText(identity.reason)}
      </p>
    </section>
  )
}
