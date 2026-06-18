import { useEffect, useRef, useState } from 'react'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { useAuth } from '../../contexts/AuthContext'
import { handleChatMessage } from '../../features/chat/assistant'
import type { AssistantChatSessionState, AssistantResponse } from '../../features/chat/assistant'
import { AssistantResponseView } from './components/AssistantResponseView'
import { ChatComposer } from './components/ChatComposer'
import { ChatMessageBubble } from './components/ChatMessageBubble'
import { ChatPromptActions } from './components/ChatPromptActions'
import styles from './Chat.module.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  response?: AssistantResponse
  createdAt: string
}

const buildMessage = (
  role: ChatMessage['role'],
  content: string,
  response?: AssistantResponse
): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  response,
  createdAt: new Date().toISOString()
})

const formatMessageTime = (value: string): string =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

export const Chat = (): JSX.Element => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildMessage(
      'assistant',
      'Olá. Posso te ajudar a criar uma transação, listar transações, analisar gastos ou ver um resumo financeiro.'
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

  return (
    <PageTemplate className={styles.page}>
      <section className={styles.chatPanel}>
        <div ref={listRef} className={styles.messages} aria-live="polite">
          {messages.map((message, index) => (
            <ChatMessageBubble
              key={message.id}
              role={message.role}
              createdAt={message.createdAt}
              label={message.role === 'user' ? 'Você' : 'Assistente'}
              time={formatMessageTime(message.createdAt)}
              footer={
                index === 0 && message.role === 'assistant' ? (
                  <ChatPromptActions
                    disabled={isSending}
                    onSendMessage={(value, label) => void sendMessage(value, label)}
                  />
                ) : undefined
              }
            >
              {message.role === 'assistant' && message.response ? (
                <AssistantResponseView
                  response={message.response}
                  disabled={isSending}
                  onSendMessage={(value, label) => void sendMessage(value, label)}
                />
              ) : (
                <p className={styles.body}>{message.content}</p>
              )}
            </ChatMessageBubble>
          ))}

          {isSending ? (
            <ChatMessageBubble role="assistant" createdAt={new Date().toISOString()} label="Assistente" time="agora">
              <div className={styles.typing} aria-label="Assistente digitando">
                <span />
                <span />
                <span />
              </div>
            </ChatMessageBubble>
          ) : null}
        </div>

        <ChatComposer
          value={draft}
          isSending={isSending}
          onChange={setDraft}
          onSubmit={() => void sendMessage(draft)}
        />
      </section>
    </PageTemplate>
  )
}
