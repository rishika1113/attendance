import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="empty">
      <h1>Page not found</h1>
      <Link to="/">Back to modules</Link>
    </section>
  )
}
