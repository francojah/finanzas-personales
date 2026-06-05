'use client'

import { useMemo } from 'react'
import { format, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  value: Date
  onChange: (date: Date) => void
  monthsBack?: number
}

export function MonthPicker({ value, onChange, monthsBack = 24 }: Props) {
  const options = useMemo(() => {
    const now = new Date()
    return Array.from({ length: monthsBack }, (_, i) => {
      const d = startOfMonth(subMonths(now, i))
      return { date: d, label: format(d, 'MMMM yyyy', { locale: es }) }
    })
  }, [monthsBack])

  const selectedValue = format(startOfMonth(value), 'yyyy-MM')

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const found = options.find(o => format(o.date, 'yyyy-MM') === e.target.value)
    if (found) onChange(found.date)
  }

  return (
    <select
      value={selectedValue}
      onChange={handleChange}
      className="input-base select-base capitalize"
      style={{ width: 'auto', minWidth: 160, paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}
    >
      {options.map(o => (
        <option key={format(o.date, 'yyyy-MM')} value={format(o.date, 'yyyy-MM')} className="capitalize">
          {o.label.charAt(0).toUpperCase() + o.label.slice(1)}
        </option>
      ))}
    </select>
  )
}
