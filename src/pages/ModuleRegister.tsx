import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadModule } from '../lib/data'
import { formatDate, formatHours, formatShortDate } from '../lib/dates'
import { formatPct, indexMarks, moduleSummary, sessionHours, sessionStats, studentStats } from '../lib/stats'
import NotFound from './NotFound'

export default function ModuleRegister() {
  const { moduleId } = useParams()
  const data = useLiveQuery(() => loadModule(moduleId!), [moduleId])
  if (data === undefined) return null
  if (data === null) return <NotFound />

  const { module: m, batch, students, sessions, marks } = data
  const idx = indexMarks(marks)
  const summary = moduleSummary(students, sessions, marks, m.minAttendance)
  const perSession = sessions.map((s) => sessionStats(s.id, students, idx))

  return (
    <section>
      <p className="crumbs">
        <Link to="/">Modules</Link>
      </p>
      <div className="page-head">
        <div>
          <div className="card-kicker">
            {batch ? (
              <Link to={`/batches/${batch.id}`}>
                {batch.programme} · {batch.name}
                {batch.description ? ` · ${batch.description}` : ''}
              </Link>
            ) : (
              'Unknown batch'
            )}
          </div>
          <h1>
            {m.code} <span className="muted">{m.title}</span>
          </h1>
          {m.lecturers.length > 0 && <p className="muted tight">{m.lecturers.join(', ')}</p>}
        </div>
        <div className="actions">
          <Link className="btn btn-secondary" to={`/modules/${m.id}/edit`}>
            Edit module
          </Link>
          <Link className="btn" to={`/modules/${m.id}/sessions/new`}>
            Add session
          </Link>
        </div>
      </div>

      <dl className="stats summary">
        <div>
          <dt>Students</dt>
          <dd>{summary.students}</dd>
        </div>
        <div>
          <dt>Sessions held</dt>
          <dd>{summary.sessionsHeld}</dd>
        </div>
        <div>
          <dt>Total hours</dt>
          <dd>{formatHours(summary.totalHours)}</dd>
        </div>
        <div>
          <dt>Class average</dt>
          <dd>{formatPct(summary.classAverage)}</dd>
        </div>
        <div>
          <dt>Below {Math.round(m.minAttendance * 100)}%</dt>
          <dd className={summary.belowMin ? 'warn' : undefined}>{summary.belowMin}</dd>
        </div>
      </dl>

      {students.length === 0 ? (
        <div className="panel">
          <p>
            This batch has no students yet. <Link to={`/batches/${m.batchId}`}>Add students</Link> to start taking
            attendance.
          </p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="panel">
          <p>
            No sessions yet. <Link to={`/modules/${m.id}/sessions/new`}>Add the first session</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="panel">
            <h2>Register</h2>
            <div className="table-scroll">
              <table className="table register">
                <thead>
                  <tr>
                    <th className="num">S No</th>
                    <th className="sticky-col">Name</th>
                    <th>AP No</th>
                    {sessions.map((s) => (
                      <th key={s.id} className="mark-col">
                        <Link
                          to={`/modules/${m.id}/sessions/${s.id}`}
                          title={`${formatDate(s.date)}${s.title ? ` · ${s.title}` : ''} (click to edit)`}
                        >
                          S{s.number}
                          <small>{formatShortDate(s.date)}</small>
                        </Link>
                      </th>
                    ))}
                    <th className="num">P</th>
                    <th className="num">A</th>
                    <th className="num">E</th>
                    <th className="num">Held</th>
                    <th className="num">%</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, i) => {
                    const s = studentStats(st.id, sessions, idx, m.minAttendance)
                    return (
                      <tr key={st.id} className={s.status === 'Below' ? 'below' : undefined}>
                        <td className="num">{i + 1}</td>
                        <td className="sticky-col">
                          <Link to={`/students/${st.id}`}>{st.name}</Link>
                        </td>
                        <td>{st.apNo}</td>
                        {sessions.map((sess) => {
                          const status = idx.get(sess.id)?.get(st.id)
                          return (
                            <td key={sess.id} className={`mark-col mark-${status ?? 'none'}`}>
                              {status ?? '·'}
                            </td>
                          )
                        })}
                        <td className="num">{s.present}</td>
                        <td className="num">{s.absent}</td>
                        <td className="num">{s.excused}</td>
                        <td className="num">{s.held}</td>
                        <td className="num">{formatPct(s.pct)}</td>
                        <td className={s.status === 'Below' ? 'warn' : 'ok-text'}>{s.status ?? '–'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3} className="sticky-col">
                      Present
                    </th>
                    {perSession.map((s, i) => (
                      <td key={sessions[i].id} className="mark-col">
                        {s.present}
                      </td>
                    ))}
                    <td colSpan={6} />
                  </tr>
                  <tr>
                    <th colSpan={3} className="sticky-col">
                      Absent
                    </th>
                    {perSession.map((s, i) => (
                      <td key={sessions[i].id} className="mark-col">
                        {s.absent}
                      </td>
                    ))}
                    <td colSpan={6} />
                  </tr>
                  <tr>
                    <th colSpan={3} className="sticky-col">
                      Session %
                    </th>
                    {perSession.map((s, i) => (
                      <td key={sessions[i].id} className="mark-col">
                        {formatPct(s.pct)}
                      </td>
                    ))}
                    <td colSpan={6} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="hint">
              % = Present ÷ (Held − Excused). A dot means no mark was recorded, which counts as absent.
            </p>
          </div>

          <div className="panel">
            <h2>Session log</h2>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Title</th>
                    <th>Lab</th>
                    <th>Group</th>
                    <th className="num">Hours</th>
                    <th className="num">Present</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => {
                    const h = sessionHours(s.timeFrom, s.timeTo)
                    return (
                      <tr key={s.id}>
                        <td>{String(s.number).padStart(2, '0')}</td>
                        <td>{formatDate(s.date)}</td>
                        <td>{s.timeFrom && s.timeTo ? `${s.timeFrom}–${s.timeTo}` : (s.timeFrom ?? '–')}</td>
                        <td>{s.title ?? <span className="muted">–</span>}</td>
                        <td>{s.labNo ?? '–'}</td>
                        <td>{s.groupNo ?? '–'}</td>
                        <td className="num">{h === null ? '–' : formatHours(h)}</td>
                        <td className="num">
                          {perSession[i].present}/{students.length}
                        </td>
                        <td>
                          <Link to={`/modules/${m.id}/sessions/${s.id}`}>Edit</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={6}>Total</th>
                    <td className="num">{formatHours(summary.totalHours)}</td>
                    <td colSpan={2}>
                      {sessions.length} session{sessions.length === 1 ? '' : 's'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
