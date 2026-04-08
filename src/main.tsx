import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles/globals.css'

const savedTheme = window.localStorage.getItem('theme')
const initialTheme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light'
document.documentElement.setAttribute('data-theme', initialTheme)

registerSW({ immediate: true })

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
