import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiFileText, FiShield, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import { PageIntro } from '../../components/molecules/PageIntro/PageIntro'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { ButtonLoading } from '../../components/ui'
import { financialNotificationsService } from '../../services/financial-notifications.service'
import type { FinancialNotification, FinancialNotificationTone, FinancialNotificationType } from '../../types/financial-notification.types'
import styles from './Pendencias.module.css'

type NotificationFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'overdue' | 'income' | 'payment' | 'audit'

const FILTERS: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'Hoje' },
  { value: 'tomorrow', label: 'Amanhã' },
  { value: 'week', label: 'Esta semana' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'income', label: 'Entradas' },
  { value: 'payment', label: 'Saídas' },
  { value: 'audit', label: 'Auditoria' }
]

const TYPE_LABELS: Record<FinancialNotificationType, string> = {
  INCOME_TODAY: 'Entrada',
  INCOME_UPCOMING: 'Entrada prevista',
  INCOME_OVERDUE: 'Entrada atrasada',
  PAYMENT_DUE: 'Pagamento',
  PAYMENT_UPCOMING: 'Pagamento agendado',
  PAYMENT_OVERDUE: 'Pagamento atrasado',
  MONTHLY_COST_DUE: 'Custo mensal',
  AUDIT_REMINDER: 'Auditoria',
  UNCATEGORIZED_TRANSACTION: 'Sem categoria'
}

const getTodayDate = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const addDays = (dateValue: string, days: number): string => {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatCurrency = (value: number | null): string | null =>
  value === null
    ? null
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (value: string): string => {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
}

const getGroupLabel = (date: string): string => {
  const today = getTodayDate()
  if (date < today) return 'Atrasadas'
  if (date === today) return 'Hoje'
  if (date === addDays(today, 1)) return 'Amanhã'
  if (date <= addDays(today, 7)) return 'Esta semana'
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

const getIcon = (notification: FinancialNotification): JSX.Element => {
  if (notification.tone === 'income') return <FiTrendingUp aria-hidden />
  if (notification.tone === 'payment' || notification.tone === 'overdue') return <FiTrendingDown aria-hidden />
  if (notification.tone === 'audit') return <FiShield aria-hidden />
  if (notification.type === 'UNCATEGORIZED_TRANSACTION') return <FiAlertCircle aria-hidden />
  return <FiCheckCircle aria-hidden />
}

const matchesFilter = (notification: FinancialNotification, filter: NotificationFilter): boolean => {
  const today = getTodayDate()
  const tomorrow = addDays(today, 1)
  if (filter === 'today') return notification.date === today
  if (filter === 'tomorrow') return notification.date === tomorrow
  if (filter === 'week') return notification.date >= today && notification.date <= addDays(today, 7)
  if (filter === 'overdue') return notification.date < today || notification.tone === 'overdue'
  if (filter === 'income') return notification.tone === 'income'
  if (filter === 'payment') return notification.tone === 'payment' || notification.type === 'MONTHLY_COST_DUE'
  if (filter === 'audit') return notification.tone === 'audit'
  return notification.date >= today
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

export const Pendencias = (): JSX.Element => {
  const [notifications, setNotifications] = useState<FinancialNotification[]>([])
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const loadNotifications = async (): Promise<void> => {
    setIsLoading(true)
    setError('')
    try {
      const data = await financialNotificationsService.getFinancialNotifications()
      setNotifications(data)
    } catch {
      setError('Não foi possível carregar as notificações.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(''), 2800)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => matchesFilter(notification, filter)),
    [filter, notifications]
  )

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, FinancialNotification[]>()
    visibleNotifications.forEach((notification) => {
      const group = getGroupLabel(notification.date)
      groups.set(group, [...(groups.get(group) ?? []), notification])
    })
    return Array.from(groups.entries())
  }, [visibleNotifications])

  const summary = useMemo(() => {
    const today = getTodayDate()
    const tomorrow = addDays(today, 1)
    const weekEnd = addDays(today, 7)
    return {
      today: notifications.filter((item) => item.date === today).length,
      tomorrow: notifications.filter((item) => item.date === tomorrow).length,
      overdue: notifications.filter((item) => item.date < today || item.tone === 'overdue').length,
      week: notifications.filter((item) => item.date >= today && item.date <= weekEnd).length
    }
  }, [notifications])

  const handleConfirm = async (notification: FinancialNotification): Promise<void> => {
    setConfirmingId(notification.id)
    try {
      await financialNotificationsService.confirmNotificationTransaction(notification)
      setFeedback(notification.action === 'confirm-income' ? 'Entrada confirmada.' : 'Pagamento confirmado.')
      await loadNotifications()
    } catch (confirmError) {
      setFeedback(getErrorMessage(confirmError, notification.action === 'confirm-income' ? 'Não foi possível confirmar a entrada.' : 'Não foi possível confirmar o pagamento.'))
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <PageTemplate className={styles.page}>
      <PageIntro
        title="Notificações"
        description="Lembretes financeiros gerados a partir das entradas, saídas e auditorias registradas."
      />

      <section className={styles.summaryGrid} aria-label="Resumo de notificações">
        <div className={styles.summaryToday}><span>Hoje</span><strong>{summary.today}</strong></div>
        <div className={styles.summaryTomorrow}><span>Amanhã</span><strong>{summary.tomorrow}</strong></div>
        <div className={styles.summaryOverdue}><span>Atrasadas</span><strong>{summary.overdue}</strong></div>
        <div className={styles.summaryWeek}><span>Esta semana</span><strong>{summary.week}</strong></div>
      </section>

      <div className={styles.filters} aria-label="Filtros de notificações">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={filter === item.value ? styles.filterActive : ''}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
      {isLoading ? <p className={styles.state}>Carregando notificações...</p> : null}

      {!isLoading && !error && groupedNotifications.length === 0 ? (
        <p className={styles.state}>Nenhuma notificação para este filtro.</p>
      ) : null}

      {!isLoading && !error ? (
        <div className={styles.groupList}>
          {groupedNotifications.map(([group, groupItems]) => (
            <section key={group} className={styles.group}>
              <header className={styles.groupHeader}>
                <h2>{group}</h2>
                <span>{groupItems.length}</span>
              </header>

              <div className={styles.notificationList}>
                {groupItems.map((notification) => {
                  const amountLabel = formatCurrency(notification.amount)
                  const toneClass = styles[`tone${notification.tone[0].toUpperCase()}${notification.tone.slice(1)}` as `tone${Capitalize<FinancialNotificationTone>}`]
                  return (
                    <article key={notification.id} className={`${styles.notificationCard} ${toneClass}`.trim()}>
                      <div className={styles.notificationIcon}>{getIcon(notification)}</div>

                      <div className={styles.notificationContent}>
                        <div className={styles.notificationTop}>
                          <span className={styles.typeBadge}>{TYPE_LABELS[notification.type]}</span>
                          <span className={styles.dateBadge}><FiCalendar aria-hidden /> {formatDate(notification.date)}</span>
                        </div>
                        <h3>{notification.title}</h3>
                        <p>{notification.description}</p>
                        {amountLabel ? <strong className={styles.amount}>{amountLabel}</strong> : null}

                        {notification.transactions.length > 0 ? (
                          <ul className={styles.detailList}>
                            {notification.transactions.map((transaction) => (
                              <li key={transaction.id}>
                                <span>{transaction.description || transaction.category || 'Transação sem descrição'}</span>
                                <strong>{formatCurrency(transaction.amount)}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>

                      <div className={styles.notificationActions}>
                        {notification.action === 'confirm-income' || notification.action === 'confirm-payment' ? (
                          <ButtonLoading
                            variant="primary"
                            loading={confirmingId === notification.id}
                            onClick={() => void handleConfirm(notification)}
                          >
                            {notification.action === 'confirm-income' ? 'Confirmar entrada' : 'Confirmar pagamento'}
                          </ButtonLoading>
                        ) : null}
                        {notification.action === 'open-audit' ? (
                          <Link className={styles.linkButton} to="/auditoria">
                            <FiShield aria-hidden />
                            Abrir auditoria
                          </Link>
                        ) : null}
                        {notification.action === 'open-report' || notification.transactions.length > 1 ? (
                          <Link className={styles.linkButton} to="/report">
                            <FiFileText aria-hidden />
                            Abrir relatório
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </PageTemplate>
  )
}
