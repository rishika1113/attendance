import type { Mark, MarkStatus, Session, Student } from '../types'

export interface StudentStats {
  present: number
  absent: number // includes sessions held with no mark recorded
  excused: number
  unmarked: number // held sessions with no mark (also counted in `absent`)
  held: number
  /** Sessions that count toward the %: held minus excused. */
  counted: number
  /** present ÷ (held − excused); null when nothing counts yet. */
  pct: number | null
  status: 'OK' | 'Below' | null
}

export interface SessionStats {
  present: number
  absent: number
  excused: number
  unmarked: number
  /** present ÷ (students − excused); null when no one counts. */
  pct: number | null
}

export interface ModuleSummary {
  students: number
  sessionsHeld: number
  totalHours: number
  belowMin: number
  classAverage: number | null
}

/** Index marks as sessionId → studentId → status for fast lookups. */
export function indexMarks(marks: Mark[]): Map<string, Map<string, MarkStatus>> {
  const idx = new Map<string, Map<string, MarkStatus>>()
  for (const m of marks) {
    let row = idx.get(m.sessionId)
    if (!row) idx.set(m.sessionId, (row = new Map()))
    row.set(m.studentId, m.status)
  }
  return idx
}

export function studentStats(
  studentId: string,
  sessions: Session[],
  marks: Map<string, Map<string, MarkStatus>>,
  minAttendance: number,
): StudentStats {
  let present = 0
  let absent = 0
  let excused = 0
  let unmarked = 0
  for (const s of sessions) {
    const status = marks.get(s.id)?.get(studentId)
    if (status === 'P') present++
    else if (status === 'E') excused++
    else {
      absent++
      if (!status) unmarked++
    }
  }
  const held = sessions.length
  const counted = held - excused
  const pct = counted > 0 ? present / counted : null
  const status = pct === null ? null : pct >= minAttendance ? 'OK' : 'Below'
  return { present, absent, excused, unmarked, held, counted, pct, status }
}

export function sessionStats(
  sessionId: string,
  students: Student[],
  marks: Map<string, Map<string, MarkStatus>>,
): SessionStats {
  const row = marks.get(sessionId)
  let present = 0
  let absent = 0
  let excused = 0
  let unmarked = 0
  for (const st of students) {
    const status = row?.get(st.id)
    if (status === 'P') present++
    else if (status === 'E') excused++
    else if (status === 'A') absent++
    else unmarked++
  }
  const counted = students.length - excused
  return { present, absent, excused, unmarked, pct: counted > 0 ? present / counted : null }
}

/** Duration in hours between two "HH:MM" strings; null if either is missing/invalid. */
export function sessionHours(timeFrom?: string, timeTo?: string): number | null {
  const toMin = (t?: string) => {
    const m = t?.match(/^(\d{1,2}):(\d{2})$/)
    return m ? Number(m[1]) * 60 + Number(m[2]) : null
  }
  const a = toMin(timeFrom)
  const b = toMin(timeTo)
  return a === null || b === null || b <= a ? null : (b - a) / 60
}

export function moduleSummary(
  students: Student[],
  sessions: Session[],
  marks: Mark[],
  minAttendance: number,
): ModuleSummary {
  const idx = indexMarks(marks)
  const pcts: number[] = []
  let belowMin = 0
  for (const st of students) {
    const s = studentStats(st.id, sessions, idx, minAttendance)
    if (s.pct !== null) pcts.push(s.pct)
    if (s.status === 'Below') belowMin++
  }
  const totalHours = sessions.reduce((sum, s) => sum + (sessionHours(s.timeFrom, s.timeTo) ?? 0), 0)
  return {
    students: students.length,
    sessionsHeld: sessions.length,
    totalHours,
    belowMin,
    classAverage: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
  }
}

export const formatPct = (p: number | null) => (p === null ? '–' : `${Math.round(p * 100)}%`)
