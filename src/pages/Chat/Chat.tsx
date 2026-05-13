import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { ButtonLoading } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { handleChatMessage } from '../../features/chat/assistant'
import type { AssistantChatSessionState, AssistantResponse } from '../../features/chat/assistant'
import { AssistantResponseView } from './components/AssistantResponseView'
import styles from './Chat.module.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  response?: AssistantResponse
  createdAt: string
}

const buildMessage = (role: ChatMessage['role'], content: string, response?: AssistantResponse): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  response,
  createdAt: new Date().toISOString()
})

const formatMessageTime = (value: string): string =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

export const Chat = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildMessage(
      'assistant',
      'Posso listar transações, mostrar saldo, gerar resumo ou preparar uma nova transação para confirmação.'
    )
  ])
  const [session, setSession] = useState<AssistantChatSessionState | null>(null)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [messages, isSending])

  const sendMessage = async (rawMessage: string, displayMessage?: string): Promise<void> => {
    const userInput = rawMessage.trim()
    if (!userInput || isSending) return

    const visibleMessage = displayMessage?.trim() || userInput
    setMessages((prev) => [...prev, buildMessage('user', visibleMessage)])
    setDraft('')
    setIsSending(true)

    try {
      if (!user?.id) {
        setMessages((prev) => [
          ...prev,
          buildMessage('assistant', 'Você precisa estar autenticado para usar o assistente financeiro.')
        ])
        return
      }

      const result = await handleChatMessage({
        userId: user.id,
        message: userInput,
        session
      })

      setMessages((prev) => [...prev, buildMessage('assistant', result.response.message, result.response)])
      setSession(result.session)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Erro inesperado.'
      setMessages((prev) => [...prev, buildMessage('assistant', `Não consegui responder agora. Detalhe: ${detail}`)])
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void sendMessage(draft)
  }

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) return
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
              <span className={styles.role}>{message.role === 'user' ? 'Você' : 'Assistente'}</span>
              <time className={styles.time} dateTime={message.createdAt}>
                {formatMessageTime(message.createdAt)}
              </time>
            </div>

            {message.role === 'assistant' && message.response ? (
              <AssistantResponseView
                response={message.response}
                disabled={isSending}
                onSendMessage={(value, label) => void sendMessage(value, label)}
              />
            ) : (
              <p className={styles.body}>{message.content}</p>
            )}
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
    </PageTemplate>
  )
}
