import type { SettingsSection } from '../settings.types'
import styles from '../Settings.module.css'

interface SettingsNavigationProps {
  sections: Array<{ id: SettingsSection; label: string }>
  activeSection: SettingsSection
  onChange: (section: SettingsSection) => void
}

export const SettingsNavigation = ({
  sections,
  activeSection,
  onChange
}: SettingsNavigationProps): JSX.Element => (
  <>
    <aside className={styles.menu}>
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`${styles.menuButton} ${activeSection === section.id ? styles.menuButtonActive : ''}`.trim()}
          onClick={() => onChange(section.id)}
        >
          {section.label}
        </button>
      ))}
    </aside>

    <div className={styles.mobileTabs}>
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`${styles.mobileTab} ${activeSection === section.id ? styles.mobileTabActive : ''}`.trim()}
          onClick={() => onChange(section.id)}
        >
          {section.label}
        </button>
      ))}
    </div>
  </>
)
