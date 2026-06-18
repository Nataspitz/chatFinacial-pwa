import type { ReactNode } from 'react'
import { cx } from '../../../components/ui/utils'
import styles from '../Chat.module.css'

interface ChatMessageBubbleProps {
  role: 'user' | 'assistant'
  createdAt: string
  label: string
  time: string
  children: ReactNode
  footer?: ReactNode
}

export const ChatMessageBubble = ({
  role,
  createdAt,
  label,
  time,
  children,
  footer
}: ChatMessageBubbleProps): JSX.Element => (
  <article className={cx(styles.message, role === 'user' ? styles.userMessage : styles.assistantMessage)}>
    <div className={styles.metaRow}>
      <span className={styles.role}>{label}</span>
      <time className={styles.time} dateTime={createdAt}>
        {time}
      </time>
    </div>

    <div className={cx(styles.bubble, role === 'user' ? styles.user : styles.assistant)}>{children}</div>
    {footer}
  </article>
)
