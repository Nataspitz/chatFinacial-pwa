import RouterMain from './routes/RouterMain'
import AppProviders from './contexts/AppProviders'
import { JSX } from 'react'

const App = (): JSX.Element => {
  return (
    <AppProviders>
      <RouterMain />
    </AppProviders>
  )
}

export default App
