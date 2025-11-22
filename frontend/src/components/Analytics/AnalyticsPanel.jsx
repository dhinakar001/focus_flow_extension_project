import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import StatsCard from './StatsCard'
import { Clock, Focus, MessageSquare, TrendingUp } from 'lucide-react'

const AnalyticsPanel = () => {
  const stats = [
    {
      title: 'Focus Time Today',
      value: '3h 42m',
      change: 12,
      changeType: 'up',
      icon: Clock,
    },
    {
      title: 'Sessions Completed',
      value: '5',
      change: 8,
      changeType: 'up',
      icon: Focus,
    },
    {
      title: 'Messages Blocked',
      value: '23',
      change: -5,
      changeType: 'down',
      icon: MessageSquare,
    },
    {
      title: 'Productivity Score',
      value: '87',
      change: 3,
      changeType: 'up',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Today's Analytics</CardTitle>
          <CardDescription>
            Your productivity metrics for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <StatsCard
                key={index}
                title={stat.title}
                value={stat.value}
                change={stat.change}
                changeType={stat.changeType}
                icon={stat.icon}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
          <CardDescription>
            Your focus time trends over the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-neutral-200 rounded-lg">
            <p className="text-neutral-500">Chart component will be rendered here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsPanel

