import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loader2, Sparkles, Calendar, Clock } from 'lucide-react'
import { aiApi } from '@/services/aiApi'

const FocusCoach = ({ userId, tasks = [] }) => {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [focusPlan, setFocusPlan] = useState(null)
  const [error, setError] = useState(null)

  const handleSummarize = async () => {
    if (!tasks.length) {
      setError('Please add tasks first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await aiApi.focusCoach.summarizeTasks(tasks)
      setSummary(result)
    } catch (err) {
      setError(err.message || 'Failed to summarize tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePlan = async () => {
    if (!tasks.length) {
      setError('Please add tasks first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await aiApi.focusCoach.generateFocusPlan(userId, tasks)
      setFocusPlan(result)
    } catch (err) {
      setError(err.message || 'Failed to generate focus plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                AI Focus Coach
              </CardTitle>
              <CardDescription>
                Get AI-powered task summaries and personalized focus plans
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <Button
              onClick={handleSummarize}
              disabled={loading || !tasks.length}
              variant="primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Summarize Tasks
                </>
              )}
            </Button>
            <Button
              onClick={handleGeneratePlan}
              disabled={loading || !tasks.length}
              variant="outline"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Generate Focus Plan
            </Button>
          </div>

          {summary && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-primary-50 rounded-lg">
                <h3 className="font-semibold text-primary-900 mb-2">Task Summary</h3>
                <p className="text-primary-700 text-sm">{summary.summary}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-neutral-900">
                    {summary.total_tasks}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Total Tasks</div>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-neutral-900">
                    {Math.round(summary.total_estimated_minutes / 60)}h
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Estimated Time</div>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-neutral-900">
                    {summary.priority_breakdown?.urgent || 0}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Urgent</div>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-neutral-900">
                    {Object.keys(summary.categories || {}).length}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Categories</div>
                </div>
              </div>
            </div>
          )}

          {focusPlan && (
            <div className="space-y-4 animate-fade-in mt-6">
              <div className="p-4 bg-success-50 rounded-lg">
                <h3 className="font-semibold text-success-900 mb-2">
                  {focusPlan.title}
                </h3>
                <p className="text-success-700 text-sm mb-3">
                  {focusPlan.description}
                </p>
                <p className="text-success-600 text-sm font-medium">
                  {focusPlan.focus_strategy}
                </p>
              </div>

              {focusPlan.recommended_schedule?.task_schedule && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-neutral-900 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recommended Schedule
                  </h4>
                  <div className="space-y-2">
                    {focusPlan.recommended_schedule.task_schedule.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-neutral-50 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-neutral-900">
                            {item.title}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {new Date(item.scheduled_time).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.priority === 'high' ? 'primary' : 'default'}>
                            {item.priority}
                          </Badge>
                          <span className="text-sm text-neutral-600">
                            {item.estimated_minutes}m
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FocusCoach

