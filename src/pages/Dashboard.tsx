import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatPct, moduleSummary } from '../lib/stats'

export default function Dashboard() {
  const cards = useLiveQuery(async () => {
    const [modules, batches] = await Promise.all([db.modules.toArray(), db.batches.toArray()])
    const batchById = new Map(batches.map((b) => [b.id, b]))
    return Promise.all(
      modules.map(async (m) => {
        const [students, sessions] = await Promise.all([
          db.students.where('batchId').equals(m.batchId).toArray(),
          db.sessions.where('moduleId').equals(m.id).toArray(),
        ])
        const marks = await db.marks.where('sessionId').anyOf(sessions.map((s) => s.id)).toArray()
        return { module: m, batch: batchById.get(m.batchId), summary: moduleSummary(students, sessions, marks, m.minAttendance) }
      }),
    ).then((cards) => cards.sort((a, b) => a.module.code.localeCompare(b.module.code)))
  })

  if (!cards) return null

  if (cards.length === 0) {
    return (
      <section className="empty">
        <h1>No modules yet</h1>
        <p>Create a module and its batch, then add the students.</p>
        <Link className="btn" to="/modules/new">
          Create your first module
        </Link>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <h1>Modules</h1>
        <Link className="btn" to="/modules/new">
          New module
        </Link>
      </div>
      <div className="cards">
        {cards.map(({ module: m, batch, summary: s }) => (
          <Link key={m.id} to={`/modules/${m.id}`} className="card">
            <div className="card-kicker">
              {batch ? `${batch.programme} · ${batch.name}` : 'Unknown batch'}
            </div>
            <h2>
              {m.code} <span className="muted">{m.title}</span>
            </h2>
            <dl className="stats">
              <div>
                <dt>Sessions</dt>
                <dd>{s.sessionsHeld}</dd>
              </div>
              <div>
                <dt>Class avg</dt>
                <dd>{formatPct(s.classAverage)}</dd>
              </div>
              <div>
                <dt>Below {Math.round(m.minAttendance * 100)}%</dt>
                <dd className={s.belowMin ? 'warn' : undefined}>
                  {s.belowMin}/{s.students}
                </dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
    </section>
  )
}
