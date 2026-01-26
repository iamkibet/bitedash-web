import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './store/authStore' // Initialize store + hydrate auth from localStorage before first render
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
