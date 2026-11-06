import { describe, expect, it } from 'vitest'
import { indexMarks, moduleSummary, sessionHours, sessionStats, studentStats } from './stats'
import type { Mark, Session, Student } from '../types'

const sessions: Session[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `s${n}`,
  moduleId: 'm',
  number: n,
  date: `2026-11-0${n}`,
  timeFrom: '08:30',
  timeTo: '10:30',
}))
const students: Student[] = ['a', 'b'].map((id, i) => ({ id, batchId: 'b', apNo: id, name: id, order: i + 1 }))
const marks: Mark[] = [
  // a: P P P P E  -> 4 / (5 - 1) = 100%
  ...['s1', 's2', 's3', 's4'].map((sessionId) => ({ sessionId, studentId: 'a', status: 'P' as const })),
  { sessionId: 's5', studentId: 'a', status: 'E' },
  // b: P A P A, s5 unmarked -> 2 / 5 = 40%
  { sessionId: 's1', studentId: 'b', status: 'P' },
  { sessionId: 's2', studentId: 'b', status: 'A' },
  { sessionId: 's3', studentId: 'b', status: 'P' },
  { sessionId: 's4', studentId: 'b', status: 'A' },
]
const idx = indexMarks(marks)

describe('studentStats', () => {
  it('leaves excused sessions out of the total', () => {
    const s = studentStats('a', sessions, idx, 0.8)
    expect(s).toMatchObject({ present: 4, excused: 1, held: 5, counted: 4, pct: 1, status: 'OK' })
  })

  it('counts unmarked held sessions as absent and flags them', () => {
    const s = studentStats('b', sessions, idx, 0.8)
    expect(s).toMatchObject({ present: 2, absent: 3, unmarked: 1, pct: 0.4, status: 'Below' })
  })

  it('returns null % when nothing has been held', () => {
    expect(studentStats('a', [], idx, 0.8)).toMatchObject({ pct: null, status: null })
  })
})

describe('sessionStats', () => {
  it('excludes excused students from the session %', () => {
    expect(sessionStats('s5', students, idx)).toMatchObject({ present: 0, excused: 1, unmarked: 1, pct: 0 })
    expect(sessionStats('s1', students, idx)).toMatchObject({ present: 2, pct: 1 })
  })
})

describe('moduleSummary', () => {
  it('summarises the class', () => {
    expect(moduleSummary(students, sessions, marks, 0.8)).toEqual({
      students: 2,
      sessionsHeld: 5,
      totalHours: 10,
      belowMin: 1,
      classAverage: 0.7,
    })
  })
})

describe('sessionHours', () => {
  it('handles valid and missing times', () => {
    expect(sessionHours('08:30', '10:30')).toBe(2)
    expect(sessionHours('10:30', undefined)).toBeNull()
    expect(sessionHours('10:30', '08:30')).toBeNull()
  })
})
