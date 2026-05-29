import { useMemo, useState } from 'react'
import { LoadingState } from '../../../components/organisms/LoadingState/LoadingState'
import { PageTemplate } from '../../../components/templates/PageTemplate/PageTemplate'
import { useAuth } from '../../../contexts/AuthContext'
import { getFinancialAuditLockCutoffDate } from '../../../services/financial-audit-lock'
import { getDefaultPaymentMethodByType } from '../../../types/transaction-settings.types'
import { getDefaultTransactionCategory } from '../../../utils/transaction-categories'
import { getFinancialReportAmount } from '../../../utils/transaction-reports'
import { PageHeader } from './PageHeader'
import { MobileActionsDrawer } from './MobileActionsDrawer'
import { ReportTransactionsGrid } from './ReportTransactionsGrid'
import { ReportSearchFilterBar } from './ReportSearchFilterBar'
import { ReportListFilterModal } from './ReportListFilterModal'
import { DeleteTransactionModal } from './DeleteTransactionModal'
import { ConfirmTransactionModal } from './ConfirmTransactionModal'
import { ExportReportModal } from './ExportReportModal'
import { CreateTransactionModal } from './CreateTransactionModal'
import { CategoryManagerModal } from './CategoryManagerModal'
import { ReimburseTransactionModal } from './ReimburseTransactionModal'
import { formatDate } from './report-page.date-utils'
import { formatCurrency } from './report-page.utils'
import { useReportData } from '../hooks/useReportData'
import { useReportFilters } from '../hooks/useReportFilters'
import { useReportExport } from '../hooks/useReportExport'
import { useReportCategories } from '../hooks/useReportCategories'
import { useReportCreateTransaction } from '../hooks/useReportCreateTransaction'
import { useReportTransactionActions } from '../hooks/useReportTransactionActions'
import styles from '../Report.module.css'

export const ReportPage = (): JSX.Element => {
  const { user } = useAuth()
  const [isMobileActionsDrawerOpen, setIsMobileActionsDrawerOpen] = useState(false)
  const auditLockCutoffDate = getFinancialAuditLockCutoffDate()
  const {
    transactions,
    setTransactions,
    isLoading,
    error,
    setError,
    categoryOptions,
    transactionSettings,
    toastMessage,
    setToastMessage,
    loadTransactions,
    loadCategories
  } = useReportData()

  const create = useReportCreateTransaction({
    transactionSettings,
    loadTransactions,
    loadCategories
  })

  const categories = useReportCategories({
    loadCategories,
    setCreateFeedback: create.setCreateFeedback
  })

  const transactionActions = useReportTransactionActions({
    transactions,
    setTransactions,
    transactionSettings,
    loadTransactions,
    loadCategories,
    setError,
    setToastMessage,
    setCreateForm: create.setCreateForm,
    setCreateFeedback: create.setCreateFeedback,
    setNewCategoryName: categories.setNewCategoryName,
    setIsCreateModalOpen: create.setIsCreateModalOpen,
    setIsMobileActionsDrawerOpen
  })

  const filters = useReportFilters(transactions)
  const reportExport = useReportExport(transactions, (user?.user_metadata ?? {}) as Record<string, unknown>)
  const entries = useMemo(() => filters.mainTransactions.filter((item) => item.type === 'entrada'), [filters.mainTransactions])
  const outcomes = useMemo(() => filters.mainTransactions.filter((item) => item.type === 'saida'), [filters.mainTransactions])
  const futureEntries = useMemo(() => filters.futureTransactions.filter((item) => item.type === 'entrada'), [filters.futureTransactions])
  const futureOutcomes = useMemo(() => filters.futureTransactions.filter((item) => item.type === 'saida'), [filters.futureTransactions])
  const totalEntries = useMemo(() => entries.reduce((acc, item) => acc + getFinancialReportAmount(item), 0), [entries])
  const totalOutcomes = useMemo(() => outcomes.reduce((acc, item) => acc + getFinancialReportAmount(item), 0), [outcomes])
  const totalFutureEntries = useMemo(() => futureEntries.reduce((acc, item) => acc + getFinancialReportAmount(item), 0), [futureEntries])
  const totalFutureOutcomes = useMemo(() => futureOutcomes.reduce((acc, item) => acc + getFinancialReportAmount(item), 0), [futureOutcomes])
  const resultBalance = useMemo(() => totalEntries - totalOutcomes, [totalEntries, totalOutcomes])

  const handleOpenCreateTransaction = (): void => {
    create.setCreateFeedback('')
    categories.setNewCategoryName('')
    create.setCreateForm((prev) => ({
      ...prev,
      paymentMethod: getDefaultPaymentMethodByType(transactionSettings, prev.type),
      isMonthlyCost: prev.type === 'saida' ? transactionSettings.defaultMonthlyCostSaida : false,
      installmentCount: 1,
      category: getDefaultTransactionCategory()
    }))
    create.setIsCreateModalOpen(true)
    setIsMobileActionsDrawerOpen(false)
  }

  const handleOpenCategories = (): void => {
    categories.setCategoryType('saida')
    categories.setCategoryFeedback('')
    categories.setNewCategoryName('')
    categories.setIsCreateCategoryOpen(false)
    categories.setEditingCategoryId(null)
    categories.setEditingCategoryName('')
    categories.setIsCategoryModalOpen(true)
    setIsMobileActionsDrawerOpen(false)
  }

  const handleOpenExportModal = (): void => {
    reportExport.setExportFeedback('')
    reportExport.setExportForm((prev) => ({
      ...prev,
      year: reportExport.exportYearOptions[0] ?? prev.year,
      day: reportExport.exportDayOptions[0] ?? prev.day
    }))
    reportExport.setIsExportModalOpen(true)
    setIsMobileActionsDrawerOpen(false)
  }

  return (
    <PageTemplate className={styles.page}>
      <PageHeader
        onCreate={handleOpenCreateTransaction}
        onManageCategories={handleOpenCategories}
        onExportReport={handleOpenExportModal}
        onOpenMobileActions={() => setIsMobileActionsDrawerOpen(true)}
        isExporting={reportExport.isExporting}
        disabled={isLoading}
      />

      <MobileActionsDrawer
        open={isMobileActionsDrawerOpen}
        isExporting={reportExport.isExporting}
        disabled={isLoading}
        onClose={() => setIsMobileActionsDrawerOpen(false)}
        onCreate={handleOpenCreateTransaction}
        onManageCategories={handleOpenCategories}
        onExportReport={handleOpenExportModal}
      />

      <ReportSearchFilterBar
        searchTerm={filters.searchTerm}
        hasActiveFilter={filters.hasActiveCombinedFilter}
        onSearchChange={filters.setSearchTerm}
        onOpenFilters={() => {
          filters.setDraftCombinedFilter({
            selectedYear: filters.selectedYear,
            selectedMonth: filters.selectedMonth,
            selectedDay: filters.selectedDay,
            operationType: filters.appliedListFilter.operationType,
            maxAmountLimit: filters.appliedListFilter.maxAmountLimit
          })
          filters.setIsListFilterModalOpen(true)
        }}
        onClearFilters={filters.handleClearListFilter}
      />

      {isLoading && <LoadingState label="Carregando transações..." />}
      {error && <p className={styles.error}>{error}</p>}
      {toastMessage ? <div className={styles.toastSuccess}>{toastMessage}</div> : null}

      {!isLoading && (
        <ReportTransactionsGrid
          entries={entries}
          outcomes={outcomes}
          futureEntries={futureEntries}
          futureOutcomes={futureOutcomes}
          totalEntries={totalEntries}
          totalOutcomes={totalOutcomes}
          totalFutureEntries={totalFutureEntries}
          totalFutureOutcomes={totalFutureOutcomes}
          resultBalance={resultBalance}
          categoryOptions={{
            entrada: categoryOptions.entrada.map((item) => item.name),
            saida: categoryOptions.saida.map((item) => item.name)
          }}
          deletingId={transactionActions.deletingId}
          confirmingId={transactionActions.confirmingId}
          editingId={transactionActions.editingId}
          editingDraft={transactionActions.editingDraft}
          isSavingEdit={transactionActions.isSavingEdit}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onDelete={transactionActions.handleDelete}
          onConfirmStart={transactionActions.handleConfirmStart}
          onDuplicate={transactionActions.handleDuplicateTransaction}
          onRefundStart={transactionActions.handleRefundStart}
          onEditStart={transactionActions.handleEditStart}
          onEditCancel={transactionActions.handleEditCancel}
          onEditChange={transactionActions.handleEditChange}
          onEditSave={transactionActions.handleEditSave}
          isActionLocked={transactionActions.isActionLocked}
        />
      )}

      <ReportListFilterModal
        open={filters.isListFilterModalOpen}
        draft={filters.draftCombinedFilter}
        yearOptions={filters.yearOptions}
        dayOptions={filters.combinedFilterDayOptions}
        amountRangeMax={filters.amountRangeMax}
        formatCurrency={formatCurrency}
        setDraft={filters.setDraftCombinedFilter}
        onClose={() => filters.setIsListFilterModalOpen(false)}
        onApply={filters.handleApplyListFilter}
        onClear={filters.handleClearListFilter}
      />

      <DeleteTransactionModal
        transaction={transactionActions.deleteCandidate}
        deletingId={transactionActions.deletingId}
        onClose={() => {
          if (transactionActions.deletingId !== null) return
          transactionActions.setDeleteCandidate(null)
        }}
        onConfirm={() => void transactionActions.handleConfirmDelete()}
      />

      <ConfirmTransactionModal
        transaction={transactionActions.confirmCandidate}
        confirmingId={transactionActions.confirmingId}
        onClose={() => {
          if (transactionActions.confirmingId !== null) return
          transactionActions.setConfirmCandidate(null)
        }}
        onConfirm={() => void transactionActions.handleConfirmTransaction()}
      />

      <ReimburseTransactionModal
        transaction={transactionActions.refundCandidate}
        isSubmitting={transactionActions.refundingId !== null}
        feedback={transactionActions.refundFeedback}
        onClose={() => {
          if (transactionActions.refundingId !== null) return
          transactionActions.setRefundCandidate(null)
          transactionActions.setRefundFeedback('')
        }}
        onConfirm={(options) => void transactionActions.handleConfirmRefundTransaction(options)}
      />

      <ExportReportModal
        open={reportExport.isExportModalOpen}
        form={reportExport.exportForm}
        yearOptions={reportExport.exportYearOptions}
        dayOptions={reportExport.exportDayOptions}
        totalEntries={reportExport.exportTotalEntries}
        totalOutcomes={reportExport.exportTotalOutcomes}
        resultBalance={reportExport.exportResultBalance}
        feedback={reportExport.exportFeedback}
        isExporting={reportExport.isExporting}
        formatCurrency={formatCurrency}
        setForm={reportExport.setExportForm}
        onClose={() => {
          if (reportExport.isExporting) return
          reportExport.setIsExportModalOpen(false)
          reportExport.setExportFeedback('')
        }}
        onSubmit={() => void reportExport.handleExportReport()}
      />

      <CreateTransactionModal
        open={create.isCreateModalOpen}
        form={create.createForm}
        transactionSettings={transactionSettings}
        feedback={create.createFeedback}
        isCreating={create.isCreating}
        auditLockCutoffDate={auditLockCutoffDate}
        setForm={create.setCreateForm}
        onClose={() => {
          if (create.isCreating) return
          create.setIsCreateModalOpen(false)
          create.setCreateFeedback('')
          categories.setNewCategoryName('')
        }}
        onSubmit={() => void create.handleCreateSubmit()}
      />

      <CategoryManagerModal
        open={categories.isCategoryModalOpen}
        categoryType={categories.categoryType}
        categoryOptions={categoryOptions}
        isCreateOpen={categories.isCreateCategoryOpen}
        newCategoryName={categories.newCategoryName}
        editingCategoryId={categories.editingCategoryId}
        editingCategoryName={categories.editingCategoryName}
        feedback={categories.categoryFeedback}
        isSaving={categories.isSavingCategory}
        updatingId={categories.categoryUpdatingId}
        deletingId={categories.categoryDeletingId}
        onClose={() => {
          if (categories.categoryUpdatingId !== null || categories.categoryDeletingId !== null || categories.isSavingCategory) return
          categories.resetCategoryModal()
        }}
        onTypeChange={(type) => {
          categories.setCategoryType(type)
          categories.setIsCreateCategoryOpen(false)
          categories.setEditingCategoryId(null)
          categories.setEditingCategoryName('')
          categories.setCategoryFeedback('')
        }}
        onToggleCreate={() => {
          categories.setIsCreateCategoryOpen((prev) => !prev)
          categories.setCategoryFeedback('')
        }}
        onNewCategoryNameChange={categories.setNewCategoryName}
        onCreateCategory={() => void categories.handleCreateCategory(categories.categoryType)}
        onStartEdit={(item) => {
          categories.setEditingCategoryId(item.id)
          categories.setEditingCategoryName(item.name)
        }}
        onCancelEdit={() => {
          categories.setEditingCategoryId(null)
          categories.setEditingCategoryName('')
        }}
        onEditingNameChange={categories.setEditingCategoryName}
        onUpdateCategory={(categoryId) => void categories.handleUpdateCategory(categoryId)}
        onDeleteCategory={(categoryId) => void categories.handleDeleteCategory(categoryId)}
      />
    </PageTemplate>
  )
}
