import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@puckeditor/core/puck.css'
import App from './App'
import { ValidationWorkbench } from './components/ValidationWorkbench'
import { ComposerStudio } from './composer/ComposerStudio'
import './styles.css'
import './composer/composer.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element')

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: false },
    queries: { retry: false, refetchOnWindowFocus: false }
  }
})

const composerMode =
  window.location.pathname === '/composer' ||
  new URLSearchParams(window.location.search).get('mode') === 'composer'

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {composerMode ? (
        <ComposerStudio />
      ) : (
        <>
          <App />
          <ValidationWorkbench />
        </>
      )}
    </QueryClientProvider>
  </StrictMode>
)
