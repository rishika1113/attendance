import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { requestPersistentStorage } from './db.ts'

void requestPersistentStorage()

// HashRouter: GitHub Pages has no server-side routing, so URLs look like /#/modules/123.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
