import { FiFilter, FiSearch } from 'react-icons/fi'
import { Button } from '../../../components/ui'
import styles from '../Report.module.css'

interface ReportSearchFilterBarProps {
  searchTerm: string
  hasActiveFilter: boolean
  onSearchChange: (value: string) => void
  onOpenFilters: () => void
  onClearFilters: () => void
}

export const ReportSearchFilterBar = ({
  searchTerm,
  hasActiveFilter,
  onSearchChange,
  onOpenFilters,
  onClearFilters
}: ReportSearchFilterBarProps): JSX.Element => (
  <div className={styles.searchFilterBar}>
    <label className={styles.searchInputWrap}>
      <FiSearch />
      <input
        type="text"
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Pesquisar por nome, valor ou descrição"
      />
    </label>
    <button
      type="button"
      className={`${styles.filterIconButton} ${hasActiveFilter ? styles.filterIconButtonActive : ''}`.trim()}
      aria-label="Abrir filtros"
      onClick={onOpenFilters}
    >
      <FiFilter />
    </button>
    {hasActiveFilter ? (
      <Button type="button" variant="ghost" className={styles.clearFilterButton} onClick={onClearFilters}>
        Limpar filtros
      </Button>
    ) : null}
  </div>
)
