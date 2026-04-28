import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BenchmarkPage from './pages/BenchmarkPage.jsx'
import GameDemoPage from './pages/GameDemoPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BenchmarkPage />} />
        <Route path="/game-demo" element={<GameDemoPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)