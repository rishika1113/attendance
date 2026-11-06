import { Planned } from './stubs'

export default function ImportPage() {
  return (
    <Planned title="Import">
      Drop your existing attendance .xlsx files here. Batch, module, students, session log and marks are read
      from the register template; a matching batch roster is reused rather than duplicated.
    </Planned>
  )
}
