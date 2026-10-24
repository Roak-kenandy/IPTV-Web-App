import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/700.css'
import './remote.css'
import RemoteApp from './RemoteApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RemoteApp />
  </StrictMode>,
)
