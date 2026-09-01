import Link from "next/link"

import { TOPICS, topicHref, type Topic } from "@/app/lib/catalog"

export function CollectionNav({ current, query = "" }: { current?: Topic | ""; query?: string }) {
  return (
    <nav aria-label="模型库分类" className="topic-tabs">
      {TOPICS.map((item) => (
        <Link aria-current={current === item.key ? "page" : undefined} href={topicHref(item.key, query)} key={item.key}>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
