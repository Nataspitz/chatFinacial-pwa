import { useEffect, useRef, useState } from 'react'

export const useGoalMenu = () => {
  const menuContainerRef = useRef<HTMLDivElement | null>(null)
  const [openMenuGoalId, setOpenMenuGoalId] = useState<string | null>(null)

  useEffect(() => {
    if (!openMenuGoalId) {
      return
    }

    const handleClickOutside = (event: MouseEvent): void => {
      if (!menuContainerRef.current) {
        return
      }

      if (!menuContainerRef.current.contains(event.target as Node)) {
        setOpenMenuGoalId(null)
      }
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpenMenuGoalId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [openMenuGoalId])

  return {
    menuContainerRef,
    openMenuGoalId,
    setOpenMenuGoalId
  }
}
