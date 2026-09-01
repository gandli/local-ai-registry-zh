import { ConfigurationCard, configurationFromRecipe } from "@/app/components/configuration-card"
import { CopyActions } from "@/app/components/copy-actions"
import { RecordSheet } from "@/app/components/record-sheet"
import { HardwareMarket } from "@/app/components/hardware-market"
import { HuggingFaceCard } from "@/app/components/huggingface-card"
import { LaunchCommand } from "@/app/components/launch-command"
import { ModelScores } from "@/app/components/model-scores"
import { RecordEvidence } from "@/app/components/record-evidence"
import { RecordFacts } from "@/app/components/record-facts"
import { RelatedRecords } from "@/app/components/related-records"
import {
  copyItems,
  displayRecord,
  huggingFaceIdentity,
  recordDescription,
  recordFacts,
  relatedGroups,
  recipeIsLaunchable,
} from "@/app/lib/record-view"

export function RecordBody({
  collection,
  record,
  variant = "page",
}: {
  collection: string
  record: Record<string, unknown>
  variant?: "overlay" | "page"
}) {
  const recipe = collection === "recipes"
  const config = recipe ? configurationFromRecipe(record) : null
  const description = recordDescription(record)
  const facts = recordFacts(collection, record)
  const groups = relatedGroups(record)
  const copies = copyItems(collection, record)
  const tree = displayRecord(record)
  return (
    <>
      {description && <p className="record-lede">{description}</p>}
      <CopyActions items={copies} />
      <RecordFacts facts={facts} />
      <HuggingFaceCard identity={huggingFaceIdentity(record)} />
      {config && (
        <>
          <p className="trust-note">
            {recipeIsLaunchable(record)
              ? "已验证：模型文件版本和运行时镜像均已锁定，证据已采纳。可直接执行，结果可复现。"
              : "候选：有兼容性或速度证据，但尚未满足升级条件，不提供可直接运行的启动配置。"}
          </p>
          <ConfigurationCard config={config} />
          <LaunchCommand recipe={record as never} />
        </>
      )}
      <RecordEvidence collection={collection} record={record} />
      {collection === "hardware" && typeof record.id === "string" && <HardwareMarket hardwareId={record.id} />}
      {collection === "models" && typeof record.id === "string" && <ModelScores modelId={record.id} />}
      <RelatedRecords groups={groups} />
      {variant === "page" ? (
        <section className="record-sheet">
          <div className="record-sheet-heading">
            <h2>其余字段</h2>
            <p>身份、启动、关联记录和实测速度已在上方展示，此处为标准化记录的其余字段。</p>
          </div>
          <RecordSheet record={tree} />
        </section>
      ) : (
        <RecordSheet record={tree} />
      )}
    </>
  )
}
