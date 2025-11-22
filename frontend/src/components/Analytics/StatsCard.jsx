import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

const StatsCard = ({ title, value, change, changeType, icon: Icon, ...props }) => {
  const getTrendIcon = () => {
    if (changeType === 'up') return <TrendingUp className="w-4 h-4" />
    if (changeType === 'down') return <TrendingDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
  }

  const getChangeColor = () => {
    if (changeType === 'up') return 'text-success-600'
    if (changeType === 'down') return 'text-danger-600'
    return 'text-neutral-500'
  }

  return (
    <Card className="hover:shadow-medium transition-all duration-200" {...props}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
            {change !== undefined && (
              <div className={cn('flex items-center mt-2 text-sm font-medium', getChangeColor())}>
                {getTrendIcon()}
                <span className="ml-1">{Math.abs(change)}%</span>
                <span className="ml-1 text-neutral-500">vs last week</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="ml-4 p-3 rounded-lg bg-primary-100">
              <Icon className="w-6 h-6 text-primary-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default StatsCard

