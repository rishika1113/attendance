import { useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, LAST_BACKUP_KEY } from '../db'
import { downloadBackup, parseBackup, restoreBackup } from '../lib/backup'

export default function BackupPage() {
  const lastBackup = useLiveQuery(async () => (await db.meta.get(LAST_BACKUP_KEY))?.value as string | undefined)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      const summary = `${backup.modules.length} module(s), ${backup.students.length} student(s), ${backup.sessions.length} session(s)`
      const when = new Date(backup.exportedAt).toLocaleString()
      if (!confirm(`Restore the backup from ${when} (${summary})?\n\nThis REPLACES everything currently in the app.`)) return
      await restoreBackup(backup)
      setMessage({ kind: 'ok', text: `Restored ${summary}.` })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <section>
      <h1>Backup</h1>
      <div className="panel">
        <h2>Download a backup</h2>
        <p>
          Your records are stored only in this browser. Clearing site data, using a different browser or another
          device means they won’t be there. Download a backup regularly and keep it somewhere safe, like Google
          Drive.
        </p>
        <p className="muted">
          {lastBackup ? `Last backup: ${new Date(lastBackup).toLocaleString()}` : 'No backup downloaded yet.'}
        </p>
        <button className="btn" type="button" onClick={() => downloadBackup()}>
          Download backup (.json)
        </button>
      </div>
      <div className="panel">
        <h2>Restore from a backup</h2>
        <p>Use this to move your records to another browser or recover them. It replaces all current data.</p>
        <label className="btn btn-secondary file-btn">
          Choose backup file…
          <input type="file" accept="application/json,.json" onChange={restore} />
        </label>
        {message && <p className={message.kind === 'ok' ? 'ok-text' : 'error-text'}>{message.text}</p>}
      </div>
    </section>
  )
}
