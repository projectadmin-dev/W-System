'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { Input } from '@workspace/ui/components/input'
import { cn } from '@workspace/ui/lib/utils'

export interface SearchableOption {
  value: string
  label: string
  /** Optional secondary text shown muted under the label */
  description?: string
  /** Optional keywords to match against (in addition to label/description) */
  keywords?: string
}

interface DropdownRect {
  top: number
  bottom: number
  left: number
  width: number
  openUpward: boolean
}

/**
 * SearchableSelect — accessible, searchable single-select dropdown.
 * Renders the dropdown via a React Portal so it is never clipped by
 * parent overflow:hidden or a low z-index stacking context.
 * Every dropdown across the finance module should use this (project convention).
 */
export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results',
  disabled,
  clearable = false,
  className,
  id,
}: {
  options: SearchableOption[]
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  clearable?: boolean
  className?: string
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [rect, setRect] = useState<DropdownRect | null>(null)
  const [mounted, setMounted] = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? options.filter((o) =>
        `${o.label} ${o.description ?? ''} ${o.keywords ?? ''}`.toLowerCase().includes(needle),
      )
    : options
  const selected = options.find((o) => o.value === value)

  const calcRect = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const DROPDOWN_MAX_H = 340
    const spaceBelow = window.innerHeight - r.bottom
    const openUpward = spaceBelow < DROPDOWN_MAX_H && r.top > spaceBelow
    setRect({
      top: r.bottom + 4,
      bottom: window.innerHeight - r.top + 4,
      left: r.left,
      width: r.width,
      openUpward,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    calcRect()

    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false)
        setQ('')
      }
    }
    const onScroll = () => calcRect()

    document.addEventListener('mousedown', onOutside)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', calcRect)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', calcRect)
    }
  }, [open, calcRect])

  const dropdown = open && rect && mounted && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        ...(rect.openUpward
          ? { bottom: rect.bottom }
          : { top: rect.top }),
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg"
    >
      <div className="p-2">
        <Input
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 text-sm"
          autoFocus
        />
      </div>
      <div role="listbox" className="max-h-72 overflow-y-auto pb-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={value === o.value}
              className={cn(
                'flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                value === o.value && 'bg-accent/60',
              )}
              onClick={() => {
                onValueChange(o.value)
                setOpen(false)
                setQ('')
              }}
            >
              <CheckIcon
                className={cn(
                  'mt-0.5 h-3.5 w-3.5 shrink-0',
                  value === o.value ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{o.label}</span>
                {o.description && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {o.description}
                  </span>
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className={cn('relative w-full', className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        onClick={() => !disabled && setOpen((p) => !p)}
      >
        <span className={cn('truncate text-left', !selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <span className="flex items-center gap-1">
          {clearable && selected && !disabled && (
            <XIcon
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onValueChange('')
              }}
            />
          )}
          <ChevronsUpDownIcon className="h-4 w-4 shrink-0 opacity-50" />
        </span>
      </button>

      {mounted && createPortal(dropdown, document.body)}
    </div>
  )
}
