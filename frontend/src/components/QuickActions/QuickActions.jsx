import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Zap, Coffee, Calendar, Settings } from 'lucide-react'

const QuickActions = () => {
  const actions = [
    {
      id: 'focus-50',
      label: 'Focus 50min',
      icon: Zap,
      variant: 'primary',
      action: () => console.log('Start 50min focus'),
    },
    {
      id: 'break-10',
      label: 'Break 10min',
      icon: Coffee,
      variant: 'success',
      action: () => console.log('Start 10min break'),
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      variant: 'outline',
      action: () => console.log('Open schedule'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      variant: 'ghost',
      action: () => console.log('Open settings'),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.id}
                variant={action.variant}
                size="lg"
                onClick={action.action}
                className="flex flex-col items-center justify-center h-24 gap-2"
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default QuickActions

