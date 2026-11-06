import { db, LAST_BACKUP_KEY } from '../db'
import type { Batch, Mark, Module, Session, Student } from '../types'

export interface BackupFile {
  app: 'attendance'
  version: 1
  exportedAt: string
  batches: Batch[]
  students: Student[]
  modules: Module[]
  sessions: Session[]
  marks: Mark[]
}

export async function createBackup(): Promise<BackupFile> {
  const [batches, students, modules, sessions, marks] = await Promise.all([
    db.batches.toArray(),
    db.students.toArray(),
    db.modules.toArray(),
    db.sessions.toArray(),
    db.marks.toArray(),
  ])
  return { app: 'attendance', version: 1, exportedAt: new Date().toISOString(), batches, students, modules, sessions, marks }
}

export async function downloadBackup() {
  const backup = await createBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance-backup-${backup.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  await db.meta.put({ key: LAST_BACKUP_KEY, value: backup.exportedAt })
}

/** Throws with a readable message if the file isn't a backup from this app. */
export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  const b = data as Partial<BackupFile>
  if (b?.app !== 'attendance' || b.version !== 1) throw new Error('This is not an attendance backup file.')
  for (const key of ['batches', 'students', 'modules', 'sessions', 'marks'] as const) {
    if (!Array.isArray(b[key])) throw new Error(`Backup is missing "${key}".`)
  }
  return b as BackupFile
}

/** Replace everything in the database with the backup's contents. */
export async function restoreBackup(b: BackupFile) {
  await db.transaction('rw', [db.batches, db.students, db.modules, db.sessions, db.marks], async () => {
    await Promise.all([db.batches.clear(), db.students.clear(), db.modules.clear(), db.sessions.clear(), db.marks.clear()])
    await db.batches.bulkAdd(b.batches)
    await db.students.bulkAdd(b.students)
    await db.modules.bulkAdd(b.modules)
    await db.sessions.bulkAdd(b.sessions)
    await db.marks.bulkAdd(b.marks)
  })
}
