import { Outlet } from 'react-router-dom'
import { Navbar } from '../Navbar/Navbar'
import { AppLayout, AppLayoutContent } from '../layouts/AppLayout/AppLayout'

export const Layout = (): JSX.Element => {
  return (
    <AppLayout>
      <Navbar />
      <AppLayoutContent>
        <Outlet />
      </AppLayoutContent>
    </AppLayout>
  )
}
