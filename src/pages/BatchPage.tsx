import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '../db'
import { addStudents, byOrder, deleteBatch, deleteStudent, parseStudentLines } from '../lib/data'
import type { Batch, Module, Student } from '../types'
import NotFound from './NotFound'

export default function BatchPage() {
  const { batchId } = useParams()
  const data = useLiveQuery(async () => {
    if (!batchId) return { batch: undefined, students: [] as Student[], modules: [] as Module[] }
    const batch = await db.batches.get(batchId)
    if (!batch) return null
    const [students, modules] = await Promise.all([
      db.students.where('batchId').equals(batchId).toArray(),
      db.modules.where('batchId').equals(batchId).toArray(),
    ])
    return { batch, students: students.sort(byOrder), modules }
  }, [batchId])

  if (data === undefined) return null
  if (data === null) return <NotFound />
  const { batch, students, modules } = data

  return (
    <section>
      <p className="crumbs">
        <Link to="/batches">Batches</Link>
      </p>
      <BatchDetails key={batch?.id ?? 'new'} batch={batch} />
      {batch && (
        <>
          <StudentsEditor batchId={batch.id} students={students} />
          <BatchModules batch={batch} modules={modules} />
        </>
      )}
    </section>
  )
}

function BatchDetails({ batch }: { batch?: Batch }) {
  const navigate = useNavigate()
  const [programme, setProgramme] = useState(batch?.programme ?? '')
  const [name, setName] = useState(batch?.name ?? '')
  const [description, setDescription] = useState(batch?.description ?? '')
  const [saved, setSaved] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const fields = { programme: programme.trim(), name: name.trim(), description: description.trim() || undefined }
    if (batch) {
      await db.batches.update(batch.id, fields)
      setSaved(true)
    } else {
      const id = newId()
      await db.batches.add({ id, ...fields, createdAt: new Date().toISOString() })
      navigate(`/batches/${id}`, { replace: true })
    }
  }

  return (
    <form className="panel" onSubmit={submit} onChange={() => setSaved(false)}>
      <h1>{batch ? `${batch.programme} · ${batch.name}` : 'New batch'}</h1>
      <div className="form-grid">
        <label>
          Programme
          <input required value={programme} onChange={(e) => setProgramme(e.target.value)} placeholder="e.g. CBIT" />
        </label>
        <label>
          Batch
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Batch 05" />
        </label>
        <label className="wide">
          Description <span className="muted">(optional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Year 01 Semester 02"
          />
        </label>
      </div>
      <div className="actions">
        <button className="btn" type="submit">
          {batch ? 'Save' : 'Create batch'}
        </button>
        {saved && <span className="ok-text">Saved</span>}
      </div>
    </form>
  )
}

function StudentsEditor({ batchId, students }: { batchId: string; students: Student[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  async function remove(st: Student) {
    if (!confirm(`Remove ${st.name}? Their attendance marks in every module of this batch will be deleted.`)) return
    await deleteStudent(st.id)
  }

  return (
    <div className="panel">
      <h2>Students ({students.length})</h2>
      {students.length > 0 && (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th className="num">S No</th>
                <th>Name</th>
                <th>AP No</th>
                <th>Reg. No</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students.map((st, i) =>
                editingId === st.id ? (
                  <EditStudentRow
                    key={st.id}
                    student={st}
                    sno={i + 1}
                    students={students}
                    onDone={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={st.id}>
                    <td className="num">{i + 1}</td>
                    <td>
                      <Link to={`/students/${st.id}`}>{st.name}</Link>
                    </td>
                    <td>{st.apNo}</td>
                    <td>{st.regNo ?? <span className="muted">–</span>}</td>
                    <td className="row-actions">
                      <button type="button" className="link-btn" onClick={() => setEditingId(st.id)}>
                        Edit
                      </button>
                      <button type="button" className="link-btn danger" onClick={() => remove(st)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      <AddStudent batchId={batchId} students={students} />
      <AddManyStudents batchId={batchId} students={students} />
    </div>
  )
}

function EditStudentRow(props: { student: Student; sno: number; students: Student[]; onDone: () => void }) {
  const { student, sno, students, onDone } = props
  const [name, setName] = useState(student.name)
  const [apNo, setApNo] = useState(student.apNo)
  const [regNo, setRegNo] = useState(student.regNo ?? '')
  const [error, setError] = useState('')

  async function save() {
    const ap = apNo.trim()
    if (!name.trim() || !ap) return setError('Name and AP No are required.')
    if (students.some((s) => s.id !== student.id && s.apNo === ap)) return setError(`AP No ${ap} is already used.`)
    await db.students.update(student.id, { name: name.trim(), apNo: ap, regNo: regNo.trim() || undefined })
    onDone()
  }

  return (
    <tr className="editing">
      <td className="num">{sno}</td>
      <td>
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        {error && <div className="error-text">{error}</div>}
      </td>
      <td>
        <input aria-label="AP No" value={apNo} onChange={(e) => setApNo(e.target.value)} />
      </td>
      <td>
        <input aria-label="Reg. No" value={regNo} onChange={(e) => setRegNo(e.target.value)} />
      </td>
      <td className="row-actions">
        <button type="button" className="link-btn" onClick={save}>
          Save
        </button>
        <button type="button" className="link-btn" onClick={onDone}>
          Cancel
        </button>
      </td>
    </tr>
  )
}

function AddStudent({ batchId, students }: { batchId: string; students: Student[] }) {
  const [name, setName] = useState('')
  const [apNo, setApNo] = useState('')
  const [regNo, setRegNo] = useState('')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const ap = apNo.trim()
    if (students.some((s) => s.apNo === ap)) return setError(`AP No ${ap} is already in this batch.`)
    await addStudents(batchId, [{ name: name.trim(), apNo: ap, regNo: regNo.trim() || undefined }])
    setName('')
    setApNo('')
    setRegNo('')
    setError('')
    ;(e.target as HTMLFormElement).querySelector('input')?.focus()
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <h3>Add a student</h3>
      <div className="form-row">
        <label>
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          AP No
          <input required value={apNo} onChange={(e) => setApNo(e.target.value)} />
        </label>
        <label>
          Reg. No <span className="muted">(optional)</span>
          <input value={regNo} onChange={(e) => setRegNo(e.target.value)} />
        </label>
        <button className="btn" type="submit">
          Add
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </form>
  )
}

function AddManyStudents({ batchId, students }: { batchId: string; students: Student[] }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ added: number; skipped: string[] } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const { rows, skipped } = parseStudentLines(text, students.map((s) => s.apNo))
    if (rows.length) await addStudents(batchId, rows)
    setResult({ added: rows.length, skipped })
    setText(skipped.length ? text : '')
  }

  return (
    <details className="inline-form">
      <summary>Add several at once</summary>
      <form onSubmit={submit}>
        <p className="muted">
          One student per line: <code>Name, AP No, Reg No</code>. Reg No is optional, and tab-separated lines work
          too.
        </p>
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'A.B. Perera, 26101, 062605001\nC.D. Silva, 26102'}
        />
        <div className="actions">
          <button className="btn" type="submit" disabled={!text.trim()}>
            Add students
          </button>
          {result && (
            <span className={result.skipped.length ? 'warn-text' : 'ok-text'}>
              Added {result.added}.{result.skipped.length > 0 && ` Skipped ${result.skipped.length}:`}
            </span>
          )}
        </div>
        {result && result.skipped.length > 0 && (
          <ul className="skipped">
            {result.skipped.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </form>
    </details>
  )
}

function BatchModules({ batch, modules }: { batch: Batch; modules: Module[] }) {
  const navigate = useNavigate()

  async function remove() {
    const what = modules.length ? ` and its ${modules.length} module(s), with all their sessions and marks` : ''
    if (!confirm(`Delete ${batch.programme} · ${batch.name}${what}? This cannot be undone.`)) return
    await deleteBatch(batch.id)
    navigate('/batches', { replace: true })
  }

  return (
    <div className="panel">
      <h2>Modules</h2>
      {modules.length === 0 ? (
        <p className="muted">No modules for this batch yet.</p>
      ) : (
        <ul className="plain-list">
          {modules.map((m) => (
            <li key={m.id}>
              <Link to={`/modules/${m.id}`}>
                {m.code} – {m.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="actions spread">
        <Link className="btn btn-secondary" to={`/modules/new?batch=${batch.id}`}>
          New module for this batch
        </Link>
        <button type="button" className="btn btn-danger" onClick={remove}>
          Delete batch
        </button>
      </div>
    </div>
  )
}
