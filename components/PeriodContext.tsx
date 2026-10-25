'use client'

import { createContext, ReactNode, useContext, useMemo, useState } from 'react'

export type PeriodKey = 'this-month' | 'last-month' | 'this-year' | 'all-time'

type PeriodValue = {
  period: PeriodKey
  setPeriod: (period: PeriodKey) => void
  from: string
  to: string
  label: string
}

const PeriodContext = createContext<PeriodValue | null>(null)

function toDateString(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PeriodKey>('last-month')
  const value = useMemo<PeriodValue>(() => {
    const now = new Date()
    let from: Date
    let to: Date
    let label: string

    switch (period) {
      case 'this-month':
        from = new Date(now.getFullYear(), now.getMonth(), 1)
        to = now
        label = 'This month'
        break
      case 'this-year':
        from = new Date(now.getFullYear(), 0, 1)
        to = now
        label = 'This year'
        break
      case 'all-time':
        from = new Date(1900, 0, 1)
        to = now
        label = 'All time'
        break
      default:
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        to = new Date(now.getFullYear(), now.getMonth(), 0)
        label = 'Last month'
    }

    return { period, setPeriod, from: toDateString(from), to: toDateString(to), label }
  }, [period])

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export function usePeriod() {
  const value = useContext(PeriodContext)
  if (!value) throw new Error('usePeriod must be used within PeriodProvider')
  return value
}
