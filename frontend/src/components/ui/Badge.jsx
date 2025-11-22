import React from 'react'
import { cn } from '@/lib/utils'

const Badge = React.forwardRef(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
      primary:
        'bg-primary-100 text-primary-800 hover:bg-primary-200',
      success:
        'bg-success-100 text-success-800 hover:bg-success-200',
      warning:
        'bg-warning-100 text-warning-800 hover:bg-warning-200',
      danger:
        'bg-danger-100 text-danger-800 hover:bg-danger-200',
      outline: 'border border-neutral-300 text-neutral-900',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }

