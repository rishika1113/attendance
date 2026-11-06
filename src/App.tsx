import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import BatchList from './pages/BatchList'
import BatchPage from './pages/BatchPage'
import ModuleForm from './pages/ModuleForm'
import ModuleRegister from './pages/ModuleRegister'
import SessionEntry from './pages/SessionEntry'
import StudentPage from './pages/StudentPage'
import BackupPage from './pages/BackupPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="batches" element={<BatchList />} />
        <Route path="batches/new" element={<BatchPage />} />
        <Route path="batches/:batchId" element={<BatchPage />} />
        <Route path="modules/new" element={<ModuleForm />} />
        <Route path="modules/:moduleId" element={<ModuleRegister />} />
        <Route path="modules/:moduleId/edit" element={<ModuleForm />} />
        <Route path="modules/:moduleId/sessions/new" element={<SessionEntry />} />
        <Route path="modules/:moduleId/sessions/:sessionId" element={<SessionEntry />} />
        <Route path="students/:studentId" element={<StudentPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
