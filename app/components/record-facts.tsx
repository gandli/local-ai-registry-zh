import Link from "next/link"

import type { RecordFact } from "@/app/lib/record-view"

export function RecordFacts({ facts }: { facts: RecordFact[] }) {
  if (facts.length === 0) return null
  return (
    <section aria-label="记录字段" className="record-facts">
      <p className="eyebrow">记录</p>
      <dl>
        {facts.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.href ? <Link href={item.href}>{item.value}</Link> : item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
