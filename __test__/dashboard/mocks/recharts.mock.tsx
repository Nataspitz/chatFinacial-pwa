import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

type GenericProps = Record<string, unknown> & {
  children?: ReactNode
}

let latestBarChartData: Array<Record<string, unknown>> = []
let latestLineProps: Record<string, unknown> | null = null
let tooltipPointIndex = 0

const Wrap = ({ testId, children }: { testId: string; children?: ReactNode }): JSX.Element => (
  <div data-testid={testId}>{children}</div>
)

export const __rechartsMock = {
  reset(): void {
    latestBarChartData = []
    latestLineProps = null
    tooltipPointIndex = 0
  },
  setTooltipPointIndex(index: number): void {
    tooltipPointIndex = index
  },
  getLatestBarChartData(): Array<Record<string, unknown>> {
    return latestBarChartData
  },
  getLatestLineProps(): Record<string, unknown> | null {
    return latestLineProps
  }
}

export const ResponsiveContainer = ({ children }: GenericProps): JSX.Element => (
  <Wrap testId="mock-responsive-container">{children}</Wrap>
)

export const CartesianGrid = (): JSX.Element => <Wrap testId="mock-cartesian-grid" />

export const XAxis = (): JSX.Element => <Wrap testId="mock-xaxis" />

export const YAxis = (): JSX.Element => <Wrap testId="mock-yaxis" />

export const BarChart = ({ data, children }: GenericProps): JSX.Element => {
  latestBarChartData = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
  return <Wrap testId="mock-barchart">{children}</Wrap>
}

export const LineChart = ({ children }: GenericProps): JSX.Element => <Wrap testId="mock-linechart">{children}</Wrap>

export const Tooltip = ({ content }: GenericProps): JSX.Element => {
  const point = latestBarChartData[tooltipPointIndex]
  const renderedContent =
    point && isValidElement(content)
      ? cloneElement(content as ReactElement<Record<string, unknown>>, {
          active: true,
          payload: [{ payload: point }],
          label: String(point.label ?? '')
        })
      : null

  return <Wrap testId="mock-tooltip">{renderedContent}</Wrap>
}

export const Bar = (): JSX.Element => <Wrap testId="mock-bar" />

export const Line = (props: GenericProps): JSX.Element => {
  latestLineProps = props
  return <Wrap testId="mock-line" />
}
