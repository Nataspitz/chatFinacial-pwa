import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import styles from './HelpPanel.module.css'

interface HelpPanelProps {
  open: boolean
  onClose: () => void
}

interface DragState {
  startClientX: number
  startClientY: number
  startX: number
  startY: number
}

const HELP_ITEMS = [
  ['Receita do período', 'Total de entradas no caixa no período selecionado.'],
  ['Despesa do período', 'Total de saídas no mesmo período.'],
  ['Lucro líquido', 'Receita menos despesa.'],
  ['Margem', 'Percentual de lucro sobre a receita.'],
  ['Variação vs período anterior', 'Diferença em reais do lucro atual em comparação ao período anterior.'],
  ['Visão geral de desempenho', 'Mostra a curva do lucro líquido em linha para leitura de subida e descida.'],
  ['Evolução do lucro', 'Tendência do lucro dos últimos 12 meses.'],
  ['Receita vs despesa', 'Comparativo direto entre entradas e saídas do período.'],
  ['Média de lucro (3 períodos)', 'Média do lucro recente para suavizar oscilações.'],
  ['Crescimento da receita', 'Taxa de variação da receita em relação ao período anterior.'],
  ['Crescimento da despesa', 'Taxa de variação da despesa em relação ao período anterior.'],
  ['Tendência', 'Direção geral (subindo, descendo ou estável) com base nas médias móveis.'],
  ['Despesa cresce mais rápido?', 'Indica se os custos estão aumentando acima da receita.'],
  ['ROI e acumulado', 'Retorno sobre investimento inicial e lucro total acumulado.'],
  ['Tendência e direção', 'Leitura rápida se o negócio está acelerando ou desacelerando.']
] as const

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

export const HelpPanel = ({ open, onClose }: HelpPanelProps): JSX.Element | null => {
  const panelRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const [isDesktop, setIsDesktop] = useState<boolean>(() => window.matchMedia('(min-width: 901px)').matches)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const centerPanel = useCallback((): void => {
    if (!isDesktop || !panelRef.current) {
      return
    }

    const panelRect = panelRef.current.getBoundingClientRect()
    const maxX = Math.max(0, window.innerWidth - panelRect.width)
    const maxY = Math.max(0, window.innerHeight - panelRect.height)

    setPosition({
      x: Math.round(maxX / 2),
      y: Math.round(maxY / 2)
    })
  }, [isDesktop])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 901px)')
    const onChange = (event: MediaQueryListEvent): void => setIsDesktop(event.matches)

    setIsDesktop(mediaQuery.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!open || !isDesktop) {
      return
    }

    const raf = window.requestAnimationFrame(centerPanel)
    const onResize = (): void => {
      centerPanel()
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [open, isDesktop, centerPanel])

  useEffect(() => {
    if (!isDragging) {
      document.body.style.userSelect = ''
      return
    }

    document.body.style.userSelect = 'none'

    const onPointerMove = (event: PointerEvent): void => {
      const dragState = dragRef.current

      if (!dragState || !panelRef.current) {
        return
      }

      const panelRect = panelRef.current.getBoundingClientRect()
      const maxX = Math.max(0, window.innerWidth - panelRect.width)
      const maxY = Math.max(0, window.innerHeight - panelRect.height)

      const nextX = clamp(dragState.startX + event.clientX - dragState.startClientX, 0, maxX)
      const nextY = clamp(dragState.startY + event.clientY - dragState.startClientY, 0, maxY)

      setPosition({ x: nextX, y: nextY })
    }

    const onPointerUp = (): void => {
      setIsDragging(false)
      dragRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  const handleDragStart = (event: ReactPointerEvent<HTMLElement>): void => {
    if (!isDesktop) {
      return
    }

    dragRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: position.x,
      startY: position.y
    }

    setIsDragging(true)
  }

  if (!open) {
    return null
  }

  return (
    <section
      ref={panelRef}
      className={[styles.panel, isDesktop ? styles.desktop : '', isDragging ? styles.dragging : ''].join(' ')}
      style={isDesktop ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
      role="dialog"
      aria-modal="false"
      aria-label="Ajuda da dashboard"
    >
      <header className={styles.header} onPointerDown={handleDragStart}>
        <h2>Ajuda rápida da dashboard</h2>
        <div className={styles.headerActions}>
          {isDesktop ? <span className={styles.dragHint}>Arraste aqui</span> : null}
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Fechar
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {HELP_ITEMS.map(([title, description]) => (
          <p key={title}>
            <strong>{title}:</strong> {description}
          </p>
        ))}
      </div>
    </section>
  )
}
