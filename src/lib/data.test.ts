import { describe, expect, it } from 'vitest'
import { parseStudentLines } from './data'

describe('parseStudentLines', () => {
  it('reads comma or tab separated lines', () => {
    const { rows, skipped } = parseStudentLines('A. Perera, 1001, 0626001\nB. Silva\t1002', [])
    expect(rows).toEqual([
      { name: 'A. Perera', apNo: '1001', regNo: '0626001' },
      { name: 'B. Silva', apNo: '1002', regNo: undefined },
    ])
    expect(skipped).toEqual([])
  })

  it('drops a leading serial number and a header line', () => {
    const { rows } = parseStudentLines('S No\tName\tAP No\tReg. No\n1\tA. Perera\t1001\t0626001', [])
    expect(rows).toEqual([{ name: 'A. Perera', apNo: '1001', regNo: '0626001' }])
  })

  it('skips duplicates and lines without an AP No', () => {
    const { rows, skipped } = parseStudentLines('A, 1001\nB, 1002\nC, 1002\nD', ['1001'])
    expect(rows.map((r) => r.apNo)).toEqual(['1002'])
    expect(skipped).toHaveLength(3)
  })
})
