// Core records. Ids are UUID strings so JSON backups can be restored/merged safely.

export type MarkStatus = 'P' | 'A' | 'E'

/** A cohort of students, e.g. "CBIT · Batch 05". Modules share a batch's roster. */
export interface Batch {
  id: string
  programme: string // e.g. "CBIT", "HDIT"
  name: string // e.g. "Batch 05"
  description?: string // e.g. "Year 01 Semester 02"
  createdAt: string // ISO timestamp
}

export interface Student {
  id: string
  batchId: string
  apNo: string
  regNo?: string // stored as text: some have leading zeros, some are missing
  name: string
  order: number // position in the register (S No)
}

/** A module taught to one batch, e.g. "CBIT014 – Fundamentals of IT" for Batch 05. */
export interface Module {
  id: string
  batchId: string
  code: string
  title: string
  lecturers: string[]
  minAttendance: number // fraction, e.g. 0.8
  createdAt: string
}

export interface Session {
  id: string
  moduleId: string
  number: number
  date: string // YYYY-MM-DD
  timeFrom?: string // HH:MM
  timeTo?: string // HH:MM
  title?: string
  labNo?: string
  groupNo?: string
}

export interface Mark {
  sessionId: string
  studentId: string
  status: MarkStatus
}

export interface Meta {
  key: string
  value: unknown
}
