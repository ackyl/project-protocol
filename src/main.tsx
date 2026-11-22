import { createRoot } from 'react-dom/client'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/space-mono/latin-400.css'
import './styles/main.css'
import { App } from './components/App'
createRoot(document.getElementById('root')!).render(<App />)
