import { screen } from '@testing-library/react'

export const getReportSectionByTitle = (title: string): HTMLElement => {
  const heading = screen.getByRole('heading', { name: title })
  const section = heading.closest('section')

  if (!section) {
    throw new Error(`Nao foi possivel localizar a secao do report para "${title}".`)
  }

  return section
}
