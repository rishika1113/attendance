import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { byNumber } from '../lib/data'
import { formatDate } from '../lib/dates'
import { formatPct, indexMarks, studentStats } from '../lib/stats'
import NotFound from './NotFound'

export default function StudentPage() {
  const { studentId } = useParams()
  const data = useLiveQuery(async () => {
    const student = await db.students.get(studentId!)
    if (!student) return null
    const [batch, modules, marks] = await Promise.all([
      db.batches.get(student.batchId),
      db.modules.where('batchId').equals(student.batchId).toArray(),
      db.marks.where('studentId').equals(student.id).toArray(),
    ])
    const rows = await Promise.all(
      modules
        .sort((a, b) => a.code.localeCompare(b.code))
        .map(async (module) => ({
          module,
          sessions: (await db.sessions.where('moduleId').equals(module.id).toArray()).sort(byNumber),
        })),
    )
    return { student, batch, rows, marks }
  }, [studentId])

  if (data === undefined) return null
  if (data === null) return <NotFound />
  const { student, batch, rows, marks } = data
  const idx = indexMarks(marks)

  return (
    <section>
      <p className="crumbs">
        {batch && <Link to={`/batches/${batch.id}`}>{`${batch.programme} · ${batch.name}`}</Link>}
      </p>
      <h1>{student.name}</h1>
      <p className="muted">
        AP No {student.apNo}
        {student.regNo && ` · Reg. No ${student.regNo}`}
      </p>

      {rows.length === 0 ? (
        <p className="muted">This student’s batch has no modules yet.</p>
      ) : (
        rows.map(({ module: m, sessions }) => {
          const s = studentStats(student.id, sessions, idx, m.minAttendance)
          return (
            <div key={m.id} className="panel">
              <div className="page-head">
                <h2>
                  <Link to={`/modules/${m.id}`}>{m.code}</Link> <span className="muted">{m.title}</span>
                </h2>
                <span className={`chip ${s.status === 'Below' ? 'chip-A' : s.status === 'OK' ? 'chip-P' : 'chip-none'}`}>
                  {formatPct(s.pct)} {s.status ?? ''}
                </span>
              </div>
              <dl className="stats">
                <div>
                  <dt>Present</dt>
                  <dd>{s.present}</dd>
                </div>
                <div>
                  <dt>Absent</dt>
                  <dd>{s.absent}</dd>
                </div>
                <div>
                  <dt>Excused</dt>
                  <dd>{s.excused}</dd>
                </div>
                <div>
                  <dt>Held</dt>
                  <dd>{s.held}</dd>
                </div>
              </dl>
              {sessions.length > 0 && (
                <div className="history">
                  {sessions.map((sess) => {
                    const status = idx.get(sess.id)?.get(student.id)
                    return (
                      <span
                        key={sess.id}
                        className={`chip chip-${status ?? 'none'}`}
                        title={`S${sess.number} · ${formatDate(sess.date)}${sess.title ? ` · ${sess.title}` : ''}`}
                      >
                        S{sess.number} {status ?? '·'}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}
