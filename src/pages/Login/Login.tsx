import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { AuthError } from '@supabase/supabase-js'
import { Button, ButtonLoading, Input } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingState } from '../../components/organisms/LoadingState/LoadingState'
import styles from './Login.module.css'

interface LocationState {
  from?: {
    pathname?: string
  }
}

const getAuthErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return 'Falha na autenticacao.'
  }

  const authError = error as Partial<AuthError>

  switch (authError.code) {
    case 'invalid_credentials':
      return 'Email ou senha invalidos.'
    case 'email_not_confirmed':
      return 'Seu email ainda nao foi confirmado. Verifique sua caixa de entrada.'
    default:
      return authError.message ?? 'Falha na autenticacao.'
  }
}

export const Login = (): JSX.Element => {
  const { isAuthenticated, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LocationState | null
  const redirectPath = locationState?.from?.pathname ?? '/chat'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (loading) {
    return <LoadingState label="Carregando sessao..." centered />
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setNotice(null)
      setError('Preencha email e senha para continuar.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      if (authMode === 'signup') {
        await signUp(email.trim(), password)
        setAuthMode('signin')
        setNotice('Conta criada. Se o login nao entrar, confirme o email antes de acessar.')
        return
      }

      await signIn(email.trim(), password)
      navigate(redirectPath, { replace: true })
    } catch (submissionError) {
      setError(getAuthErrorMessage(submissionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <header>
          <h1 className={styles.title}>Entrar</h1>
          <p className={styles.subtitle}>
            {authMode === 'signin' ? 'Acesse sua conta para continuar.' : 'Crie sua conta para comecar.'}
          </p>
        </header>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">
              Senha
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          {notice ? <p className={styles.subtitle}>{notice}</p> : null}
          <ButtonLoading type="submit" fullWidth loading={isSubmitting}>
            {authMode === 'signin' ? 'Entrar' : 'Criar conta'}
          </ButtonLoading>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            disabled={isSubmitting}
            onClick={() => {
              setNotice(null)
              setError(null)
              setAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
            }}
          >
            {authMode === 'signin' ? 'Criar nova conta' : 'Ja tenho conta'}
          </Button>
        </form>
      </div>
    </section>
  )
}
