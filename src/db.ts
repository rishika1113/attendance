import Dexie, { type EntityTable } from 'dexie'
import type { Batch, Mark, Meta, Module, Session, Student } from './types'

// All data lives in this browser's IndexedDB. Nothing is sent anywhere.
export const db = new Dexie('attendance') as Dexie & {
  batches: EntityTable<Batch, 'id'>
  students: EntityTable<Student, 'id'>
  modules: EntityTable<Module, 'id'>
  sessions: EntityTable<Session, 'id'>
  marks: Dexie.Table<Mark, [string, string]>
  meta: EntityTable<Meta, 'key'>
}

db.version(1).stores({
  batches: 'id',
  students: 'id, batchId, apNo',
  modules: 'id, batchId',
  sessions: 'id, moduleId, date',
  marks: '[sessionId+studentId], sessionId, studentId',
  meta: 'key',
})

export const newId = () => crypto.randomUUID()

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export const LAST_BACKUP_KEY = 'lastBackupAt'
