import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export default function BatchList() {
  const batches = useLiveQuery(async () => {
    const [batches, students, modules] = await Promise.all([
      db.batches.toArray(),
      db.students.toArray(),
      db.modules.toArray(),
    ])
    return batches
      .map((b) => ({
        batch: b,
        students: students.filter((s) => s.batchId === b.id).length,
        modules: modules.filter((m) => m.batchId === b.id).length,
      }))
      .sort((a, b) => `${a.batch.programme} ${a.batch.name}`.localeCompare(`${b.batch.programme} ${b.batch.name}`))
  })
  if (!batches) return null

  return (
    <section>
      <div className="page-head">
        <h1>Batches</h1>
        <Link className="btn" to="/batches/new">
          New batch
        </Link>
      </div>
      {batches.length === 0 ? (
        <p className="muted">No batches yet. A batch holds the student list that its modules share.</p>
      ) : (
        <div className="cards">
          {batches.map(({ batch, students, modules }) => (
            <Link key={batch.id} to={`/batches/${batch.id}`} className="card">
              <div className="card-kicker">{batch.programme}</div>
              <h2>
                {batch.name} {batch.description && <span className="muted">{batch.description}</span>}
              </h2>
              <dl className="stats">
                <div>
                  <dt>Students</dt>
                  <dd>{students}</dd>
                </div>
                <div>
                  <dt>Modules</dt>
                  <dd>{modules}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
