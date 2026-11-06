import { NavLink, Outlet } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, LAST_BACKUP_KEY } from '../db'

const BACKUP_REMINDER_DAYS = 7

function BackupReminder() {
  const state = useLiveQuery(async () => {
    const [last, sessions] = await Promise.all([db.meta.get(LAST_BACKUP_KEY), db.sessions.count()])
    const lastIso = last?.value as string | undefined
    const days = lastIso ? (Date.now() - Date.parse(lastIso)) / 86_400_000 : Infinity
    return { last: lastIso, days, hasData: sessions > 0 }
  })
  if (!state?.hasData || state.days < BACKUP_REMINDER_DAYS) return null
  const { days } = state
  return (
    <div className="banner" role="status">
      {state.last
        ? `Last backup was ${Math.floor(days)} days ago.`
        : 'You haven’t made a backup yet.'}{' '}
      Your records live only in this browser. <NavLink to="/backup">Download a backup</NavLink>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Attendance
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Modules
          </NavLink>
          <NavLink to="/batches">Batches</NavLink>
          <NavLink to="/backup">Backup</NavLink>
        </nav>
      </header>
      <BackupReminder />
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
