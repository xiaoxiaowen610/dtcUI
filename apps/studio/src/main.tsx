import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ValidationWorkbench } from './components/ValidationWorkbench'
import './styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element')

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: false },
    queries: { retry: false, refetchOnWindowFocus: false }
  }
})

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ValidationWorkbench />
    </QueryClientProvider>
  </StrictMode>
)
