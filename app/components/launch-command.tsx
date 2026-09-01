import { CopyActions } from "@/app/components/copy-actions"
import { dockerCommand } from "@/lib/registry"

import type { Recipe } from "@/registry/schema/types"

export function LaunchCommand({ recipe }: { recipe: Recipe }) {
  const command = dockerCommand(recipe)
  if (!command) return null
  return (
    <section aria-label="启动命令" className="record-evidence">
      <p className="eyebrow">启动</p>
      <p className="trust-note">
        上述启动配置的精确还原：镜像按摘要锁定、模型版本固定、参数经过审计。命令自包含——所需资源从本模型库获取，挂载前按记录的 sha256 校验。也可用 <code>local-ai run {recipe.id}</code> 运行。
      </p>
      <ol className="launch-steps">
        <li>按 sha256 摘要拉取容器镜像——校验过的字节，不是会漂移的浮动 tag。</li>
        <li>从本模型库获取所需引擎资源并逐项按记录的 sha256 校验；审计过的启动脚本会在容器内使用前再次校验。</li>
        <li>首次运行时将固定版本的模型下载到 Hugging Face 缓存（之后复用）。</li>
        <li>在 <code>localhost:{String((recipe.launch as Record<string, unknown>).host_port ?? "")}</code> 提供 OpenAI 兼容 API——任意客户端可直接接入。</li>
      </ol>
      <pre className="launch-command"><code>{command}</code></pre>
      <CopyActions items={[{ label: "Docker 命令", value: command }]} />
    </section>
  )
}
