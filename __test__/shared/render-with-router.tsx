import { render, type RenderOptions } from '@testing-library/react'
import type { PropsWithChildren, ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
}

export const renderWithRouter = (
  ui: ReactElement,
  { route = '/', ...options }: RenderWithRouterOptions = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}
