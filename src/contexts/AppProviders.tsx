import type { PropsWithChildren } from 'react'
import { AuthProvider } from './AuthContext'

const AppProviders = ({ children }: PropsWithChildren): JSX.Element => {
  return <AuthProvider>{children}</AuthProvider>
}

export default AppProviders
