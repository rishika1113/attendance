import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { newId } from '../db'
import { deleteSession, loadModule, saveSession, type ModuleData } from '../lib/data'
import { formatHours, todayIso } from '../lib/dates'
import { indexMarks, sessionHours } from '../lib/stats'
import type { MarkStatus, Session } from '../types'
import NotFound from './NotFound'

const STATUSES: MarkStatus[] = ['P', 'A', 'E']
const LABELS: Record<MarkStatus, string> = { P: 'Present', A: 'Absent', E: 'Excused' }

export default function SessionEntry() {
  const { moduleId, sessionId } = useParams()
  const data = useLiveQuery(() => loadModule(moduleId!), [moduleId])
  if (data === undefined) return null
  if (data === null) return <NotFound />
  const existing = sessionId ? data.sessions.find((s) => s.id === sessionId) : undefined
  if (sessionId && !existing) return <NotFound />
  return <SessionForm key={sessionId ?? 'new'} data={data} existing={existing} />
}

type Marks = Record<string, MarkStatus | undefined>

function initialState(data: ModuleData, existing?: Session) {
  if (existing) {
    const row = indexMarks(data.marks).get(existing.id)
    const marks: Marks = {}
    for (const st of data.students) marks[st.id] = row?.get(st.id)
    return { session: existing, marks }
  }
  const last = data.sessions.at(-1)
  const session: Session = {
    id: newId(),
    moduleId: data.module.id,
    number: data.sessions.reduce((max, s) => Math.max(max, s.number), 0) + 1,
    date: todayIso(),
    timeFrom: last?.timeFrom,
    timeTo: last?.timeTo,
    labNo: last?.labNo,
    groupNo: last?.groupNo,
  }
  const marks: Marks = Object.fromEntries(data.students.map((st) => [st.id, 'P' as const]))
  return { session, marks }
}

function SessionForm({ data, existing }: { data: ModuleData; existing?: Session }) {
  const navigate = useNavigate()
  const { module: m, students, sessions } = data
  const [init] = useState(() => initialState(data, existing))
  const [session, setSession] = useState<Session>(init.session)
  const [marks, setMarks] = useState<Marks>(init.marks)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [apText, setApText] = useState('')
  const [apResult, setApResult] = useState('')
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])
  const backTo = `/modules/${m.id}`

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const field = <K extends keyof Session>(key: K, value: Session[K]) => {
    setSession((s) => ({ ...s, [key]: value }))
    setDirty(true)
  }
  const text = (key: 'timeFrom' | 'timeTo' | 'title' | 'labNo' | 'groupNo') => ({
    value: session[key] ?? '',
    onChange: (e: { target: { value: string } }) => field(key, e.target.value || undefined),
  })

  const setMark = (studentId: string, status: MarkStatus | undefined) => {
    setMarks((prev) => ({ ...prev, [studentId]: status }))
    setDirty(true)
  }
  const setAll = (status: MarkStatus | undefined) => {
    setMarks(Object.fromEntries(students.map((st) => [st.id, status])))
    setDirty(true)
  }

  function markByApNo(status: MarkStatus) {
    const tokens = apText.split(/[\s,;]+/).filter(Boolean)
    const byAp = new Map(students.map((st) => [st.apNo, st.id]))
    const found: string[] = []
    const missing: string[] = []
    for (const t of tokens) (byAp.has(t) ? found : missing).push(t)
    if (found.length) {
      setMarks((prev) => ({ ...prev, ...Object.fromEntries(found.map((ap) => [byAp.get(ap)!, status])) }))
      setDirty(true)
    }
    setApResult(
      `Marked ${found.length} as ${LABELS[status].toLowerCase()}.` +
        (missing.length ? ` Not in this batch: ${missing.join(', ')}.` : ''),
    )
    if (!missing.length) setApText('')
  }

  function onRowKey(e: KeyboardEvent<HTMLLIElement>, index: number, studentId: string) {
    const key = e.key.toUpperCase()
    const move = (to: number) => rowRefs.current[Math.max(0, Math.min(students.length - 1, to))]?.focus()
    if (key === 'P' || key === 'A' || key === 'E') {
      setMark(studentId, key)
      move(index + 1)
    } else if (key === ' ') {
      setMark(studentId, marks[studentId] === 'P' ? 'A' : 'P')
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      move(index + 1)
    } else if (e.key === 'ArrowUp') {
      move(index - 1)
    } else return
    e.preventDefault()
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (sessions.some((s) => s.id !== session.id && s.number === session.number)) {
      return setError(`Session ${session.number} already exists in this module.`)
    }
    if (session.timeFrom && session.timeTo && sessionHours(session.timeFrom, session.timeTo) === null) {
      return setError('“Time to” must be after “Time from”.')
    }
    await saveSession(session, marks)
    setDirty(false)
    navigate(backTo)
  }

  async function remove() {
    if (!confirm(`Delete session ${session.number} and its attendance marks?`)) return
    await deleteSession(session.id)
    navigate(backTo, { replace: true })
  }

  const counts = { P: 0, A: 0, E: 0, none: 0 }
  for (const st of students) counts[marks[st.id] ?? 'none']++
  const hours = sessionHours(session.timeFrom, session.timeTo)

  return (
    <section>
      <p className="crumbs">
        <Link to="/">Modules</Link> / <Link to={backTo}>{m.code}</Link>
      </p>
      <form onSubmit={save}>
        <div className="panel">
          <h1>{existing ? `Session ${existing.number}` : 'New session'}</h1>
          <div className="form-grid session-grid">
            <label>
              Session no.
              <input
                required
                type="number"
                min={1}
                value={session.number}
                onChange={(e) => field('number', Number(e.target.value))}
              />
            </label>
            <label>
              Date
              <input required type="date" value={session.date} onChange={(e) => field('date', e.target.value)} />
            </label>
            <label>
              Time from
              <input type="time" {...text('timeFrom')} />
            </label>
            <label>
              Time to
              <input type="time" {...text('timeTo')} />
              {hours !== null && <span className="hint">{formatHours(hours)}</span>}
            </label>
            <label className="wide">
              Title / topic
              <input {...text('title')} placeholder="e.g. Computer Hardware" />
            </label>
            <label>
              Lab no.
              <input {...text('labNo')} />
            </label>
            <label>
              Group no. <span className="muted">(optional)</span>
              <input {...text('groupNo')} />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="page-head">
            <h2>Attendance</h2>
            <div className="counts">
              <span className="chip chip-P">P {counts.P}</span>
              <span className="chip chip-A">A {counts.A}</span>
              <span className="chip chip-E">E {counts.E}</span>
              {counts.none > 0 && <span className="chip chip-none">Unmarked {counts.none}</span>}
            </div>
          </div>

          {students.length === 0 ? (
            <p>
              This batch has no students yet. <Link to={`/batches/${m.batchId}`}>Add students</Link> first.
            </p>
          ) : (
            <>
              <div className="toolbar">
                <button type="button" className="btn btn-secondary" onClick={() => setAll('P')}>
                  All present
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setAll(undefined)}>
                  Clear all
                </button>
                <span className="hint">
                  Click a row to switch P/A. Keyboard: <kbd>P</kbd> <kbd>A</kbd> <kbd>E</kbd> to mark and move down,{' '}
                  <kbd>↑</kbd> <kbd>↓</kbd> to move.
                </span>
              </div>

              <details className="inline-form">
                <summary>Mark by AP No</summary>
                <p className="muted">Type or paste AP Nos separated by spaces, commas or new lines.</p>
                <textarea rows={2} value={apText} onChange={(e) => setApText(e.target.value)} />
                <div className="actions">
                  <button type="button" className="btn btn-secondary" disabled={!apText.trim()} onClick={() => markByApNo('A')}>
                    Mark absent
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={!apText.trim()} onClick={() => markByApNo('E')}>
                    Mark excused
                  </button>
                  {apResult && <span className="hint">{apResult}</span>}
                </div>
              </details>

              <ol className="mark-list">
                {students.map((st, i) => {
                  const status = marks[st.id]
                  return (
                    <li
                      key={st.id}
                      ref={(el) => {
                        rowRefs.current[i] = el
                      }}
                      tabIndex={0}
                      className={`mark-row status-${status ?? 'none'}`}
                      aria-label={`${st.name}, ${status ? LABELS[status] : 'unmarked'}`}
                      onKeyDown={(e) => onRowKey(e, i, st.id)}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return
                        setMark(st.id, status === 'P' ? 'A' : 'P')
                      }}
                    >
                      <span className="sno">{i + 1}</span>
                      <span className="name">{st.name}</span>
                      <span className="ap">{st.apNo}</span>
                      <span className="seg" role="group" aria-label={`Mark ${st.name}`}>
                        {STATUSES.map((code) => (
                          <button
                            key={code}
                            type="button"
                            tabIndex={-1}
                            title={LABELS[code]}
                            aria-pressed={status === code}
                            className={`seg-btn seg-${code}`}
                            onClick={() => setMark(st.id, code)}
                          >
                            {code}
                          </button>
                        ))}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </div>

        <div className="sticky-actions">
          {error && <span className="error-text">{error}</span>}
          {existing && (
            <button type="button" className="btn btn-danger" onClick={remove}>
              Delete session
            </button>
          )}
          <Link
            className="btn btn-secondary"
            to={backTo}
            onClick={(e) => {
              if (dirty && !confirm('Discard your changes to this session?')) e.preventDefault()
            }}
          >
            Cancel
          </Link>
          <button className="btn" type="submit">
            Save session
          </button>
        </div>
      </form>
    </section>
  )
}
