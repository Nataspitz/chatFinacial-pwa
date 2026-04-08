import { RouterProvider } from 'react-router-dom'
import { router } from './routerConfig'

const RouterMain = (): JSX.Element => {
  return <RouterProvider router={router} />
}

export default RouterMain
