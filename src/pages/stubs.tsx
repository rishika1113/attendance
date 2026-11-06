import type { ReactNode } from 'react'

/** Placeholder used by pages that are scaffolded but not built yet. */
export function Planned({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h1>{title}</h1>
      <div className="planned">
        <strong>Coming next.</strong> {children}
      </div>
    </section>
  )
}
