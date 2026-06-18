import { FiBarChart2, FiList, FiMinusCircle, FiPlusCircle } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import styles from '../Chat.module.css'

interface PromptAction {
  label: string
  value: string
  tone: 'income' | 'expense' | 'summary' | 'list'
  Icon: IconType
}

const promptActions: PromptAction[] = [
  { label: 'Criar entrada', value: 'criar entrada', tone: 'income', Icon: FiPlusCircle },
  { label: 'Criar saída', value: 'criar saída', tone: 'expense', Icon: FiMinusCircle },
  { label: 'Ver resumo do mês', value: 'ver resumo do mês', tone: 'summary', Icon: FiBarChart2 },
  { label: 'Listar gastos por categoria', value: 'listar gastos por categoria', tone: 'list', Icon: FiList }
]

interface ChatPromptActionsProps {
  disabled?: boolean
  onSendMessage: (message: string, displayMessage?: string) => void
}

export const ChatPromptActions = ({
  disabled = false,
  onSendMessage
}: ChatPromptActionsProps): JSX.Element => (
  <div className={styles.promptActions}>
    {promptActions.map(({ label, value, tone, Icon }) => (
      <button
        key={value}
        type="button"
        className={`${styles.promptAction} ${styles[tone]}`}
        disabled={disabled}
        onClick={() => onSendMessage(value, label)}
      >
        <Icon aria-hidden />
        <span>{label}</span>
      </button>
    ))}
  </div>
)
