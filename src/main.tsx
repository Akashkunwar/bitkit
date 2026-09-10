import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/figtree'
import '@fontsource-variable/space-grotesk'
import './styles/global.css'
import App from './App'
import { ThemeProvider } from './app/Theme'
import { UndoProvider } from './app/UndoToast'
import { I18nProvider } from './app/I18nProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <UndoProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </UndoProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
)
