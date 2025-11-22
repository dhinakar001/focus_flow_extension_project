import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Play, Pause, Square, Clock } from 'lucide-react'

const FocusTimer = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(50 * 60) // 50 minutes in seconds
  const [selectedDuration, setSelectedDuration] = useState(50)
  const [mode, setMode] = useState('focus')

  useEffect(() => {
    let interval = null
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            // Handle timer completion
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, timeRemaining])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const totalSeconds = selectedDuration * 60
  const progress = ((totalSeconds - timeRemaining) / totalSeconds) * 100

  const handleStart = () => {
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleStop = () => {
    setIsRunning(false)
    setTimeRemaining(selectedDuration * 60)
  }

  const handleDurationChange = (minutes) => {
    setSelectedDuration(minutes)
    setTimeRemaining(minutes * 60)
    setIsRunning(false)
  }

  const modes = [
    { id: 'focus', label: 'Focus', color: 'primary' },
    { id: 'break', label: 'Break', color: 'success' },
    { id: 'meeting', label: 'Meeting', color: 'warning' },
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary-600 to-primary-700 text-white pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Focus Timer</CardTitle>
          <Badge variant="outline" className="bg-white/20 text-white border-white/30">
            {modes.find((m) => m.id === mode)?.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Timer Display */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-neutral-400 mr-2" />
            <span className="text-sm text-neutral-500 font-medium">Time Remaining</span>
          </div>
          <div className="text-6xl font-bold text-neutral-900 mb-2 font-mono">
            {formatTime(timeRemaining)}
          </div>
          <Progress value={progress} className="mt-4" />
        </div>

        {/* Mode Selection */}
        <div className="flex gap-2 mb-6 justify-center">
          {modes.map((m) => (
            <Button
              key={m.id}
              variant={mode === m.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setMode(m.id)}
              className="flex-1"
            >
              {m.label}
            </Button>
          ))}
        </div>

        {/* Duration Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-neutral-700 mb-2 block">
            Duration
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 90, 120].map((mins) => (
              <Button
                key={mins}
                variant={selectedDuration === mins ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleDurationChange(mins)}
                className="text-xs"
              >
                {mins}m
              </Button>
            ))}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3">
          {!isRunning ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleStart}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              onClick={handlePause}
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={handleStop}
            disabled={!isRunning && timeRemaining === selectedDuration * 60}
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default FocusTimer

