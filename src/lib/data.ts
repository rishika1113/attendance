import { db, newId } from '../db'
import type { MarkStatus, Session, Student } from '../types'

export const byOrder = (a: Student, b: Student) => a.order - b.order
export const byNumber = (a: Session, b: Session) => a.number - b.number || a.date.localeCompare(b.date)

/** Everything needed to show one module's register. null = module not found. */
export async function loadModule(moduleId: string) {
  const module = await db.modules.get(moduleId)
  if (!module) return null
  const [batch, students, sessions] = await Promise.all([
    db.batches.get(module.batchId),
    db.students.where('batchId').equals(module.batchId).toArray(),
    db.sessions.where('moduleId').equals(moduleId).toArray(),
  ])
  const marks = sessions.length
    ? await db.marks.where('sessionId').anyOf(sessions.map((s) => s.id)).toArray()
    : []
  return { module, batch, students: students.sort(byOrder), sessions: sessions.sort(byNumber), marks }
}

export type ModuleData = NonNullable<Awaited<ReturnType<typeof loadModule>>>

/** Save a session and replace all of its marks. */
export async function saveSession(session: Session, marks: Record<string, MarkStatus | undefined>) {
  await db.transaction('rw', db.sessions, db.marks, async () => {
    await db.sessions.put(session)
    await db.marks.where('sessionId').equals(session.id).delete()
    await db.marks.bulkPut(
      Object.entries(marks)
        .filter((e): e is [string, MarkStatus] => !!e[1])
        .map(([studentId, status]) => ({ sessionId: session.id, studentId, status })),
    )
  })
}

export async function deleteSession(sessionId: string) {
  await db.transaction('rw', db.sessions, db.marks, async () => {
    await db.marks.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

export async function deleteStudent(studentId: string) {
  await db.transaction('rw', db.students, db.marks, async () => {
    await db.marks.where('studentId').equals(studentId).delete()
    await db.students.delete(studentId)
  })
}

export async function deleteModule(moduleId: string) {
  await db.transaction('rw', db.modules, db.sessions, db.marks, async () => {
    const sessionIds = (await db.sessions.where('moduleId').equals(moduleId).primaryKeys()) as string[]
    if (sessionIds.length) await db.marks.where('sessionId').anyOf(sessionIds).delete()
    await db.sessions.bulkDelete(sessionIds)
    await db.modules.delete(moduleId)
  })
}

export async function deleteBatch(batchId: string) {
  await db.transaction('rw', [db.batches, db.students, db.modules, db.sessions, db.marks], async () => {
    const moduleIds = (await db.modules.where('batchId').equals(batchId).primaryKeys()) as string[]
    for (const id of moduleIds) await deleteModule(id)
    const studentIds = (await db.students.where('batchId').equals(batchId).primaryKeys()) as string[]
    if (studentIds.length) await db.marks.where('studentId').anyOf(studentIds).delete()
    await db.students.bulkDelete(studentIds)
    await db.batches.delete(batchId)
  })
}

export interface NewStudent {
  name: string
  apNo: string
  regNo?: string
}

/** Append students to the end of a batch's register. */
export async function addStudents(batchId: string, rows: NewStudent[]) {
  await db.transaction('rw', db.students, async () => {
    const existing = await db.students.where('batchId').equals(batchId).toArray()
    let order = existing.reduce((max, s) => Math.max(max, s.order), 0)
    await db.students.bulkAdd(
      rows.map((r) => ({
        id: newId(),
        batchId,
        name: r.name,
        apNo: r.apNo,
        regNo: r.regNo || undefined,
        order: ++order,
      })),
    )
  })
}

/**
 * Parse students typed/pasted one per line: "Name, AP No, Reg No" (tabs also work).
 * A leading serial number column and a header line are ignored.
 */
export function parseStudentLines(text: string, existingApNos: Iterable<string>) {
  const seen = new Set(existingApNos)
  const rows: NewStudent[] = []
  const skipped: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    let cells = line.split(line.includes('\t') ? '\t' : ',').map((c) => c.trim())
    if (cells.some((c) => /^name$/i.test(c))) continue // header line
    if (cells.length >= 3 && /^\d+$/.test(cells[0]) && !/^\d+$/.test(cells[1])) cells = cells.slice(1)
    const [name = '', apNo = '', regNo = ''] = cells
    if (!name || !apNo) {
      skipped.push(`${line} (needs a name and AP No)`)
    } else if (seen.has(apNo)) {
      skipped.push(`${line} (AP No ${apNo} already exists)`)
    } else {
      seen.add(apNo)
      rows.push({ name, apNo, regNo: regNo || undefined })
    }
  }
  return { rows, skipped }
}
