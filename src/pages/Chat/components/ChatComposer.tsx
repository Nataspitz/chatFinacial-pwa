import type { FormEvent, KeyboardEvent } from 'react'
import { FiSend } from 'react-icons/fi'
import { ButtonLoading } from '../../../components/ui'
import styles from '../Chat.module.css'

interface ChatComposerProps {
  value: string
  isSending: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

export const ChatComposer = ({
  value,
  isSending,
  onChange,
  onSubmit
}: ChatComposerProps): JSX.Element => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    onSubmit()
  }

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <textarea
        className={styles.textarea}
        placeholder="Digite aqui..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleTextareaKeyDown}
        rows={1}
      />
      <ButtonLoading type="submit" className={styles.sendButton} loading={isSending} disabled={!value.trim()}>
        <span>Enviar</span>
        <FiSend aria-hidden />
      </ButtonLoading>
    </form>
  )
}
