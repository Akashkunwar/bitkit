import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { Home } from './app/Home'
import { Privacy } from './app/Privacy'
import SharePage from './app/Share'
import { tools } from './registry'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/share" element={<SharePage />} />
        {tools.map((tool) => {
          const Page = tool.component
          return <Route key={tool.id} path={tool.path} element={<Page />} />
        })}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
