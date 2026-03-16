import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { AppDataProvider } from './contexts/AppDataContext'

// Minimal localStorage-backed polyfill for environments without window.storage
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      const value = localStorage.getItem(key)
      return value === null ? null : { value }
    },
    set: async (key, value) => {
      localStorage.setItem(key, value)
      return true
    },
    delete: async (key) => {
      localStorage.removeItem(key)
      return true
    },
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </AuthProvider>
  </React.StrictMode>,
)
