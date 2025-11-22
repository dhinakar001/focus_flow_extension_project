import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loader2, Clock, TrendingUp } from 'lucide-react'
import { aiApi } from '@/services/aiApi'

const TimePredictor = ({ userId, tasks = [] }) => {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState([])
  const [error, setError] = useState(null)

  const handlePredictAll = async () => {
    if (!tasks.length) {
      setError('Please add tasks first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await aiApi.timePredictor.batchPredictDurations(userId, tasks)
      setPredictions(result)
    } catch (err) {
      setError(err.message || 'Failed to predict task durations')
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (score) => {
    if (score >= 0.7) return 'text-success-600'
    if (score >= 0.5) return 'text-warning-600'
    return 'text-danger-600'
  }

  const getConfidenceBadge = (score) => {
    if (score >= 0.7) return 'success'
    if (score >= 0.5) return 'warning'
    return 'danger'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" />
              AI Time Predictor
            </CardTitle>
            <CardDescription>
              Get AI-powered time predictions for your tasks based on historical data
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

        <Button
          onClick={handlePredictAll}
          disabled={loading || !tasks.length}
          variant="primary"
          className="mb-6"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Predict All Task Durations
            </>
          )}
        </Button>

        {predictions.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            {predictions.map((prediction, idx) => {
              const task = tasks.find((t) => t.id === prediction.task_id) || {}
              return (
                <div
                  key={idx}
                  className="p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-neutral-900">
                      {task.title || `Task ${prediction.task_id}`}
                    </h4>
                    <Badge variant={getConfidenceBadge(prediction.confidence_score)}>
                      {Math.round(prediction.confidence_score * 100)}% confidence
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-500" />
                      <span className="text-lg font-bold text-neutral-900">
                        {prediction.predicted_minutes}
                      </span>
                      <span className="text-sm text-neutral-500">minutes</span>
                    </div>
                    {prediction.base_estimate_minutes && (
                      <div className="text-xs text-neutral-500">
                        Base: {prediction.base_estimate_minutes}m
                      </div>
                    )}
                  </div>
                  {prediction.reasoning && (
                    <p className="text-xs text-neutral-600 mt-2 italic">
                      {prediction.reasoning}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TimePredictor

