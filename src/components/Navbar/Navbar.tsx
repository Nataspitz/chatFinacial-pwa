import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FiCalendar, FiClipboard, FiFileText, FiLogOut, FiMessageCircle, FiMoon, FiSun } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Navbar.module.css'

const getLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  isActive ? `${styles.link} ${styles.active}` : styles.link

const getMobileLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  isActive ? `${styles.mobileLink} ${styles.active}` : styles.mobileLink

export const Navbar = (): JSX.Element => {
  const { user, signOut } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme')
    return currentTheme === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('theme', theme)
  }, [theme])

  const fullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
  const greetingLabel = fullName || user?.email || 'Painel financeiro'

  return (
    <>
      <aside className={styles.sidebar}>
        <header className={styles.brand}>
          <span className={styles.brandIcon}>CF</span>
          <div>
            <strong className={styles.brandTitle}>ChatFinacial Mobile</strong>
            <p className={styles.brandUser}>{`Ola, ${greetingLabel}`}</p>
          </div>
        </header>

        <nav className={styles.links}>
          <NavLink to="/chat" className={getLinkClassName}>
            <FiMessageCircle aria-hidden />
            <span>Chat</span>
          </NavLink>
          <NavLink to="/dashboard" className={getLinkClassName}>
            <FiClipboard aria-hidden />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/report" className={getLinkClassName}>
            <FiFileText aria-hidden />
            <span>Report</span>
          </NavLink>
          <NavLink to="/calendario" className={getLinkClassName}>
            <FiCalendar aria-hidden />
            <span>Calendario</span>
          </NavLink>
        </nav>

        <div className={styles.actions}>
          <button type="button" className={styles.actionButton} onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}>
            {theme === 'light' ? <FiMoon aria-hidden /> : <FiSun aria-hidden />}
            <span>{theme === 'light' ? 'Modo escuro' : 'Modo claro'}</span>
          </button>
          <button type="button" className={`${styles.actionButton} ${styles.logoutButton}`} onClick={() => void signOut()}>
            <FiLogOut aria-hidden />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <header className={styles.mobileTopBar}>
        <strong>ChatFinacial</strong>
        <div className={styles.mobileTopActions}>
          <button type="button" className={styles.iconButton} onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}>
            {theme === 'light' ? <FiMoon aria-hidden /> : <FiSun aria-hidden />}
          </button>
          <button type="button" className={styles.iconButton} onClick={() => void signOut()}>
            <FiLogOut aria-hidden />
          </button>
        </div>
      </header>

      <nav className={styles.mobileBottomNav}>
        <NavLink to="/chat" className={getMobileLinkClassName}>
          <FiMessageCircle aria-hidden />
          <span>Chat</span>
        </NavLink>
        <NavLink to="/dashboard" className={getMobileLinkClassName}>
          <FiClipboard aria-hidden />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/report" className={getMobileLinkClassName}>
          <FiFileText aria-hidden />
          <span>Report</span>
        </NavLink>
        <NavLink to="/calendario" className={getMobileLinkClassName}>
          <FiCalendar aria-hidden />
          <span>Calendario</span>
        </NavLink>
      </nav>
    </>
  )
}
