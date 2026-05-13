import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TransactionDesktopRow } from '../../../src/pages/Report/components/TransactionDesktopRow'
import type { TransactionActionContext } from '../../../src/pages/Report/components/transactions-table.types'
import type { Transaction } from '../../../src/types/transaction.types'

const transaction: Transaction = {
  id: 'tx-1',
  type: 'saida',
  category: 'Mensalidade',
  amount: 70,
  description: 'Assinatura',
  date: '2026-05-31',
  isConfirmed: false,
  confirmedAt: null,
  isMonthlyCost: true,
  paymentMethod: 'pix',
  installmentGroupId: null,
  installmentNumber: 1,
  installmentCount: 1,
  totalAmount: 70,
  isInstallment: false,
  monthlyEndDate: null
}

const buildActionContext = (isLocked: boolean): TransactionActionContext => ({
  confirmingId: null,
  deletingId: null,
  isSavingEdit: false,
  onConfirmStart: vi.fn(),
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
  onEditCancel: vi.fn(),
  onEditSave: vi.fn(),
  onEditStart: vi.fn(),
  isActionLocked: () => isLocked
})

const renderRow = (isLocked: boolean): void => {
  render(
    <table>
      <tbody>
        <TransactionDesktopRow
          actionContext={buildActionContext(isLocked)}
          categoryOptions={['Mensalidade']}
          editingDraft={null}
          editingId={null}
          formatCurrency={(value) => `R$ ${value}`}
          formatDate={(value) => value}
          onEditChange={vi.fn()}
          onOpenContextMenu={vi.fn()}
          transaction={transaction}
        />
      </tbody>
    </table>
  )
}

describe('TransactionDesktopRow actions', () => {
  it('esconde o menu de ações quando a transação está bloqueada na UI', () => {
    renderRow(true)

    expect(screen.queryByLabelText('Abrir menu da transação')).not.toBeInTheDocument()
  })

  it('mostra o menu de ações quando a transação está liberada na UI', () => {
    renderRow(false)

    expect(screen.getByLabelText('Abrir menu da transação')).toBeInTheDocument()
  })
})
