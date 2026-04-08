import { FiMenu, FiX } from 'react-icons/fi'

interface MobileMenuButtonProps {
  isOpen: boolean
  onToggle: () => void
  className?: string
}

export const MobileMenuButton = ({ isOpen, onToggle, className }: MobileMenuButtonProps): JSX.Element => {
  return (
    <button
      type="button"
      className={className}
      aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      {isOpen ? <FiX /> : <FiMenu />}
    </button>
  )
}
