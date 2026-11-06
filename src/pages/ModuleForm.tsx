import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '../db'
import { deleteModule } from '../lib/data'
import type { Batch, Module } from '../types'
import NotFound from './NotFound'

const NEW_BATCH = '__new__'

export default function ModuleForm() {
  const { moduleId } = useParams()
  const [params] = useSearchParams()
  const data = useLiveQuery(async () => {
    const batches = (await db.batches.toArray()).sort((a, b) =>
      `${a.programme} ${a.name}`.localeCompare(`${b.programme} ${b.name}`),
    )
    const module = moduleId ? ((await db.modules.get(moduleId)) ?? null) : undefined
    return { batches, module }
  }, [moduleId])

  if (!data) return null
  if (data.module === null) return <NotFound />
  return (
    <ModuleFormInner
      key={moduleId ?? 'new'}
      batches={data.batches}
      module={data.module}
      defaultBatchId={params.get('batch')}
    />
  )
}

function ModuleFormInner(props: { batches: Batch[]; module?: Module; defaultBatchId: string | null }) {
  const { batches, module, defaultBatchId } = props
  const navigate = useNavigate()
  const initialBatch =
    module?.batchId ??
    (defaultBatchId && batches.some((b) => b.id === defaultBatchId) ? defaultBatchId : batches[0]?.id) ??
    NEW_BATCH
  const [batchId, setBatchId] = useState(initialBatch)
  const [programme, setProgramme] = useState('')
  const [batchName, setBatchName] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState(module?.code ?? '')
  const [title, setTitle] = useState(module?.title ?? '')
  const [lecturers, setLecturers] = useState(module?.lecturers.join(', ') ?? '')
  const [minPct, setMinPct] = useState(String(Math.round((module?.minAttendance ?? 0.8) * 100)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    let bid = batchId
    if (bid === NEW_BATCH) {
      bid = newId()
      await db.batches.add({
        id: bid,
        programme: programme.trim(),
        name: batchName.trim(),
        description: description.trim() || undefined,
        createdAt: new Date().toISOString(),
      })
    }
    const fields = {
      batchId: bid,
      code: code.trim(),
      title: title.trim(),
      lecturers: lecturers
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
      minAttendance: Number(minPct) / 100,
    }
    if (module) {
      await db.modules.update(module.id, fields)
      navigate(`/modules/${module.id}`)
    } else {
      const id = newId()
      await db.modules.add({ id, ...fields, createdAt: new Date().toISOString() })
      navigate(`/modules/${id}`, { replace: true })
    }
  }

  async function remove() {
    if (!module) return
    if (!confirm(`Delete ${module.code} and all of its sessions and marks? This cannot be undone.`)) return
    await deleteModule(module.id)
    navigate('/', { replace: true })
  }

  return (
    <section>
      <p className="crumbs">
        <Link to="/">Modules</Link>
        {module && (
          <>
            {' / '}
            <Link to={`/modules/${module.id}`}>{module.code}</Link>
          </>
        )}
      </p>
      <form className="panel" onSubmit={submit}>
        <h1>{module ? `Edit ${module.code}` : 'New module'}</h1>
        <div className="form-grid">
          <label className="wide">
            Batch
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={!!module}>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.programme} · {b.name}
                  {b.description ? ` (${b.description})` : ''}
                </option>
              ))}
              <option value={NEW_BATCH}>+ New batch…</option>
            </select>
            {module && <span className="hint">A module’s batch can’t be changed after it’s created.</span>}
          </label>
          {batchId === NEW_BATCH && (
            <fieldset className="wide sub-fields">
              <legend>New batch</legend>
              <label>
                Programme
                <input required value={programme} onChange={(e) => setProgramme(e.target.value)} placeholder="e.g. CBIT" />
              </label>
              <label>
                Batch
                <input required value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="e.g. Batch 05" />
              </label>
              <label className="wide">
                Description <span className="muted">(optional)</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Year 01 Semester 02"
                />
              </label>
            </fieldset>
          )}
          <label>
            Module code
            <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CBIT014" />
          </label>
          <label>
            Minimum attendance %
            <input
              required
              type="number"
              min={1}
              max={100}
              value={minPct}
              onChange={(e) => setMinPct(e.target.value)}
            />
          </label>
          <label className="wide">
            Module title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fundamentals of Information Technology"
            />
          </label>
          <label className="wide">
            Lecturers <span className="muted">(comma separated)</span>
            <input value={lecturers} onChange={(e) => setLecturers(e.target.value)} />
          </label>
        </div>
        <div className="actions spread">
          <button className="btn" type="submit">
            {module ? 'Save' : 'Create module'}
          </button>
          {module && (
            <button type="button" className="btn btn-danger" onClick={remove}>
              Delete module
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
