import { useState } from 'react'
import { Alert } from './Alert/Alert'
import { Badge } from './Badge/Badge'
import { Button } from './Button/Button'
import { ButtonLoading } from './Button/ButtonLoading'
import { Card } from './Card/Card'
import { ContainerLayout } from './ContainerLayout/ContainerLayout'
import { Input } from './Input/Input'
import { ModalBase } from './ModalBase/ModalBase'
import { SectionWrapper } from './SectionWrapper/SectionWrapper'
import { Spinner } from './Spinner/Spinner'
import styles from './StyleGuideExample.module.css'

export const StyleGuideExample = (): JSX.Element => {
  const [loading, setLoading] = useState(false)
  const [openModal, setOpenModal] = useState(false)

  return (
    <ContainerLayout>
      <div className={styles.page}>
        <SectionWrapper
          title="Buttons"
          description="Estados e variantes dos botões do design system."
          actions={
            <Button variant="ghost" onClick={() => setOpenModal(true)}>
              Abrir modal
            </Button>
          }
        >
          <div className={styles.row}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <ButtonLoading
              variant="primary"
              loading={loading}
              onClick={() => {
                setLoading(true)
                window.setTimeout(() => setLoading(false), 1200)
              }}
            >
              Salvar
            </ButtonLoading>
          </div>
        </SectionWrapper>

        <SectionWrapper title="Input e Badge" description="Campos e status reutilizáveis.">
          <div className={styles.fieldGroup}>
            <Input placeholder="Digite algo..." />
            <div className={styles.row}>
              <Badge variant="success">Ativo</Badge>
              <Badge variant="warning">Pendente</Badge>
              <Badge variant="danger">Erro</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </div>
        </SectionWrapper>

        <SectionWrapper title="Alert e Spinner" description="Feedback visual padrão.">
          <div className={styles.fieldGroup}>
            <Alert variant="success" title="Operação concluída" message="Os dados foram salvos com sucesso." />
            <div className={styles.row}>
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
          </div>
        </SectionWrapper>

        <Card gradientHeader headerContent="Card com gradient header">
          Conteúdo principal do card com padding e borda padronizados pelo sistema.
        </Card>
      </div>

      <ModalBase open={openModal} onClose={() => setOpenModal(false)} title="Modal base">
        Este modal usa overlay semitransparente, radius XL e shadow LG do design system.
      </ModalBase>
    </ContainerLayout>
  )
}
