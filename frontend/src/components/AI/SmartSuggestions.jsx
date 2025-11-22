import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loader2, Sparkles, Check, X, TrendingUp, AlertCircle } from 'lucide-react'
import { aiApi } from '@/services/aiApi'

const SmartSuggestions = ({ userId }) => {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (userId) {
      loadSuggestions()
    }
  }, [userId])

  const loadSuggestions = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await aiApi.smartSuggestions.generateSuggestions(userId)
      setSuggestions(result || [])
    } catch (err) {
      setError(err.message || 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'danger'
      case 'medium':
        return 'warning'
      default:
        return 'default'
    }
  }

  const handleAccept = async (suggestionId) => {
    // TODO: Implement accept logic
    console.log('Accept suggestion', suggestionId)
  }

  const handleReject = async (suggestionId) => {
    // TODO: Implement reject logic
    console.log('Reject suggestion', suggestionId)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              Smart Suggestions
            </CardTitle>
            <CardDescription>
              AI-powered productivity recommendations based on your activity patterns
            </CardDescription>
          </div>
          <Button onClick={loadSuggestions} variant="ghost" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
            {error}
          </div>
        )}

        {suggestions.length === 0 && !loading && (
          <div className="text-center py-8 text-neutral-500">
            No suggestions available at this time.
          </div>
        )}

        <div className="space-y-4">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 animate-fade-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-neutral-900">
                      {suggestion.title}
                    </h4>
                    <Badge variant={getSeverityColor(suggestion.severity)}>
                      {suggestion.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-600 mb-2">
                    {suggestion.description}
                  </p>
                  {suggestion.rationale && (
                    <p className="text-xs text-neutral-500 italic mb-2">
                      {suggestion.rationale}
                    </p>
                  )}
                  {suggestion.expected_benefit && (
                    <div className="flex items-center gap-1 text-xs text-success-600 font-medium mt-2">
                      <TrendingUp className="w-3 h-3" />
                      {suggestion.expected_benefit}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    onClick={() => handleAccept(idx)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Check className="w-4 h-4 text-success-600" />
                  </Button>
                  <Button
                    onClick={() => handleReject(idx)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4 text-danger-600" />
                  </Button>
                </div>
              </div>

              {suggestion.action_items && suggestion.action_items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-200">
                  <div className="text-xs font-medium text-neutral-700 mb-2">
                    Action Items:
                  </div>
                  <ul className="space-y-1">
                    {suggestion.action_items.map((item, itemIdx) => (
                      <li
                        key={itemIdx}
                        className="text-xs text-neutral-600 flex items-start gap-2"
                      >
                        <span className="text-primary-600 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SmartSuggestions

