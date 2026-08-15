import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/figtree'
import '@fontsource-variable/space-grotesk'
import './styles/global.css'
import App from './App'
import { ThemeProvider } from './app/Theme'
import { UndoProvider } from './app/UndoToast'
import { I18nProvider } from './app/I18nProvider'

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

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
