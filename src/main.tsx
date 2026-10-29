import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { I18nProvider } from './i18n/i18n.tsx'
import { DirSync } from './components/DirSync.tsx'
import { App } from './App.tsx'
import { applyStoredPrefs } from './lib/prefs.ts'

applyStoredPrefs()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <DirSync />
      <App />
    </I18nProvider>
  </StrictMode>,
)
