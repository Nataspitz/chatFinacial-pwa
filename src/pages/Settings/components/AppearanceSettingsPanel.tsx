import { Button } from '../../../components/ui'
import styles from '../Settings.module.css'

interface AppearanceSettingsPanelProps {
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
}

export const AppearanceSettingsPanel = ({
  theme,
  onThemeChange
}: AppearanceSettingsPanelProps): JSX.Element => (
  <div className={styles.themeOptions}>
    <Button
      type="button"
      variant={theme === 'light' ? 'primary' : 'ghost'}
      className={styles.themeButton}
      onClick={() => onThemeChange('light')}
    >
      Modo claro
    </Button>
    <Button
      type="button"
      variant={theme === 'dark' ? 'primary' : 'ghost'}
      className={styles.themeButton}
      onClick={() => onThemeChange('dark')}
    >
      Modo escuro
    </Button>
  </div>
)
