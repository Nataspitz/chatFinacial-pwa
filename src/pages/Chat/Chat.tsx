import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { Button, ButtonLoading } from '../../components/ui'
import { chatService } from '../../services/chat.service'
import type { ChatMessage, ChatQuickAction, ChatSessionState } from '../../types/chat.types'
import styles from './Chat.module.css'

const buildMessage = (role: ChatMessage['role'], content: string, actions?: ChatQuickAction[]): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  actions,
  createdAt: new Date().toISOString()
})

const formatMessageTime = (value: string): string =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

const TEXT_INPUT_STEPS = new Set<ChatSessionState['step']>([
  'collect_transaction_amount',
  'collect_transaction_description',
  'collect_transaction_installment_count',
  'collect_transaction_custom_date',
  'collect_transaction_edit_installment_count',
  'collect_transaction_edit_value',
  'collect_category_name',
  'collect_category_new_name'
])

export const Chat = (): JSX.Element => {
  const initialReply = chatService.getInitialReply()

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildMessage('assistant', initialReply.content, initialReply.actions)
  ])
  const [session, setSession] = useState<ChatSessionState>(() => initialReply.nextSession ?? chatService.getInitialSession())
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const requiresTextInput = TEXT_INPUT_STEPS.has(session.step)

  useEffect(() => {
    const list = listRef.current
    if (!list) {
      return
    }

    list.scrollTop = list.scrollHeight
  }, [messages, isSending])

  const sendMessage = async (rawMessage: string, displayMessage?: string): Promise<void> => {
    const userInput = rawMessage.trim()
    if (!userInput || isSending) {
      return
    }

    const visibleMessage = displayMessage?.trim() || userInput
    setMessages((prev) => [...prev, buildMessage('user', visibleMessage)])
    setDraft('')
    setIsSending(true)

    try {
      const reply = await chatService.processMessage(userInput, session)
      setMessages((prev) => [...prev, buildMessage('assistant', reply.content, reply.actions)])
      setSession(reply.nextSession ?? chatService.getInitialSession())
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Erro inesperado.'
      setMessages((prev) => [...prev, buildMessage('assistant', `Nao consegui responder agora. Detalhe: ${detail}`)])
      setSession(chatService.getInitialSession())
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void sendMessage(draft)
  }

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }

    event.preventDefault()
    void sendMessage(draft)
  }

  return (
    <PageTemplate className={styles.page}>
      <section ref={listRef} className={styles.messages} aria-live="polite">
        {messages.map((message) => (
          <article
            key={message.id}
            className={message.role === 'user' ? `${styles.bubble} ${styles.user}` : `${styles.bubble} ${styles.assistant}`}
          >
            <div className={styles.metaRow}>
              <span className={styles.role}>{message.role === 'user' ? 'Voce' : 'Assistente'}</span>
              <time className={styles.time} dateTime={message.createdAt}>
                {formatMessageTime(message.createdAt)}
              </time>
            </div>

            <p className={styles.body}>{message.content}</p>

            {message.role === 'assistant' && message.actions && message.actions.length > 0 ? (
              <div className={styles.messageActions}>
                {message.actions.map((action) => (
                  <Button
                    key={action.id}
                    type="button"
                    variant="ghost"
                    className={styles.messageActionButton}
                    disabled={isSending}
                    onClick={() => void sendMessage(action.value, action.label)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </article>
        ))}

        {isSending ? (
          <article className={`${styles.bubble} ${styles.assistant}`}>
            <div className={styles.metaRow}>
              <span className={styles.role}>Assistente</span>
              <span className={styles.time}>agora</span>
            </div>

            <div className={styles.typing} aria-label="Assistente digitando">
              <span />
              <span />
              <span />
            </div>
          </article>
        ) : null}
      </section>

      {requiresTextInput ? (
        <form className={styles.composer} onSubmit={handleSubmit}>
          <textarea
            className={styles.textarea}
            placeholder="Digite aqui..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            rows={2}
          />
          <ButtonLoading type="submit" loading={isSending} disabled={!draft.trim()}>
            Enviar
          </ButtonLoading>
        </form>
      ) : null}
    </PageTemplate>
  )
}
