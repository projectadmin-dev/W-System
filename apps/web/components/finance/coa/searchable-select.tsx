'use client'

// Self-contained searchable select (combobox). The UI package has no command/popover,
// so this ports the prototype's SearchableSelect: a trigger button + filterable dropdown.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { IFAS } from './theme'

export interface SelectOption {
  value: string
  label: string
  code?: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  mono?: boolean
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Search...', disabled, mono }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(() => {
    if (!q.trim()) return options
    const ql = q.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(ql) || o.value.toLowerCase().includes(ql) || (o.code || '').toLowerCase().includes(ql),
    )
  }, [q, options])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpen = () => {
    if (disabled) return
    setOpen((o) => !o)
    setQ('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          fontSize: 13,
          fontFamily: mono ? IFAS.fontMono : undefined,
          border: `1px solid ${open ? IFAS.primary : 'transparent'}`,
          borderRadius: '1rem',
          background: disabled ? IFAS.bg.tertiary : IFAS.bg.secondary,
          color: selected ? IFAS.text.primary : IFAS.text.tertiary,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          fontWeight: 500,
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={18} style={{ color: IFAS.text.tertiary, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 300,
            background: IFAS.bg.surface,
            border: `1px solid ${IFAS.border.subtle}`,
            borderRadius: '1rem',
            boxShadow: IFAS.shadow.md,
            marginTop: 4,
            maxHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: `1px solid ${IFAS.border.subtle}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: IFAS.text.tertiary, pointerEvents: 'none' }} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  fontSize: 12,
                  border: `1px solid ${IFAS.border.default}`,
                  borderRadius: '0.75rem',
                  background: IFAS.bg.secondary,
                  outline: 'none',
                }}
              />
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '18px 12px', fontSize: 12, color: IFAS.text.tertiary, textAlign: 'center', fontStyle: 'italic' }}>
                Tidak ditemukan
              </div>
            ) : (
              filtered.map((opt) => {
                const isSel = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                      setQ('')
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 14px',
                      background: isSel ? IFAS.primaryBg : 'transparent',
                      border: 'none',
                      borderLeft: isSel ? `3px solid ${IFAS.primary}` : '3px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {opt.code && (
                      <span style={{ fontFamily: IFAS.fontMono, fontSize: 10, fontWeight: 700, color: IFAS.text.tertiary, flexShrink: 0 }}>{opt.code}</span>
                    )}
                    <span style={{ fontSize: 12, color: IFAS.text.primary, flex: 1 }}>{opt.label}</span>
                    {isSel && <Check size={14} style={{ color: IFAS.primary, flexShrink: 0 }} />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
