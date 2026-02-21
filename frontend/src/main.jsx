import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
<<<<<<< HEAD
import { BrowserRouter } from 'react-router-dom'
import './shared/styles/index.css'
=======
import './index.css'
>>>>>>> 79d324d3f41813facfd92db59e17056b73c678e1
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
<<<<<<< HEAD
    <BrowserRouter>
      <App />
    </BrowserRouter>
=======
    <App />
>>>>>>> 79d324d3f41813facfd92db59e17056b73c678e1
  </StrictMode>,
)
