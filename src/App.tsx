import RouterMain from './routes/RouterMain'
import AppProviders from './contexts/AppProviders'
import { JSX } from 'react'
import { PwaInstallPrompt } from './components/PwaInstallPrompt/PwaInstallPrompt'

const App = (): JSX.Element => {
  return (
    <AppProviders>
      <RouterMain />
      <PwaInstallPrompt />
    </AppProviders>
  )
}

export default App
