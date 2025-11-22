import React from 'react'
import FocusTimer from '@/components/FocusTimer/FocusTimer'
import AnalyticsPanel from '@/components/Analytics/AnalyticsPanel'
import QuickActions from '@/components/QuickActions/QuickActions'
import { LayoutDashboard, Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">FocusFlow</h1>
                <p className="text-xs text-neutral-500">Productivity Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <FocusTimer />
            <QuickActions />
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnalyticsPanel />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard

