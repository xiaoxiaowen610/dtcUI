import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ValidationWorkbench } from './components/ValidationWorkbench'
import './styles.css'

const ComposerStudio = lazy(() => import('./composer/index'))

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
        <Suspense fallback={<div className="composerRouteLoading">Loading Forge Composer…</div>}>
          <ComposerStudio />
        </Suspense>
      ) : (
        <>
          <App />
          <ValidationWorkbench />
        </>
      )}
    </QueryClientProvider>
  </StrictMode>
)
