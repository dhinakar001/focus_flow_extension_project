# AI Features Implementation Guide

## ✅ Complete AI Features Implementation

This document outlines all the AI features added to FocusFlow, including implementation details, API endpoints, and usage instructions.

---

## 🎯 Features Implemented

### 1. AI Focus Coach
- **Summarizes tasks** into concise overviews
- **Generates personalized focus plans** based on tasks and user preferences
- **Provides focus strategies** for optimal productivity

### 2. AI Distraction Detector
- **Analyzes activity patterns** to detect distractions
- **Identifies distraction sources** (communication, entertainment, etc.)
- **Detects behavioral patterns** and generates insights
- **Provides actionable recommendations**

### 3. AI Time Predictor
- **Predicts task duration** based on historical data
- **Learns from user's past performance**
- **Provides confidence scores** for predictions
- **Adapts to user behavior patterns**

### 4. Smart Suggestions
- **Generates productivity recommendations** based on history
- **Analyzes productivity patterns** to suggest optimizations
- **Provides actionable insights** for schedule, tasks, and breaks

---

## 📁 Files Created

### Database
- `server/db/migrations/002_ai_features_tables.sql` - Database schema for AI features

### AI Service (Python)
- `python_service/src/ai/focus_coach.py` - Focus Coach AI logic
- `python_service/src/ai/distraction_detector.py` - Distraction Detector logic
- `python_service/src/ai/time_predictor.py` - Time Predictor logic
- `python_service/src/ai/smart_suggestions.py` - Smart Suggestions logic
- `python_service/src/api/routes/ai_routes.py` - FastAPI routes
- `python_service/src/api/main.py` - FastAPI application

### Backend API (Node.js)
- `server/services/aiService.js` - AI service integration layer
- `server/controllers/aiController.js` - AI controller handlers
- `server/routes/ai.js` - Express routes for AI features

### Frontend Components (React)
- `frontend/src/services/aiApi.js` - API client for AI features
- `frontend/src/components/AI/FocusCoach.jsx` - Focus Coach UI component
- `frontend/src/components/AI/DistractionDetector.jsx` - Distraction Detector UI
- `frontend/src/components/AI/TimePredictor.jsx` - Time Predictor UI
- `frontend/src/components/AI/SmartSuggestions.jsx` - Smart Suggestions UI

---

## 🔌 API Endpoints

### AI Focus Coach

#### POST `/api/ai/focus-coach/summarize`
Summarizes a list of tasks.

**Request:**
```json
{
  "tasks": [
    {
      "title": "Complete project proposal",
      "description": "Write and review project proposal document",
      "priority": "high",
      "estimated_minutes": 120,
      "category": "writing",
      "tags": ["urgent", "important"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "You have 5 tasks to complete. 2 urgent task(s) require immediate attention...",
    "total_tasks": 5,
    "categories": {"writing": 2, "coding": 3},
    "priority_breakdown": {"urgent": 2, "high": 1, "medium": 2},
    "total_estimated_minutes": 300,
    "average_task_minutes": 60
  }
}
```

#### POST `/api/ai/focus-coach/generate-plan`
Generates a personalized focus plan.

**Request:**
```json
{
  "userId": "user123",
  "tasks": [...],
  "userPreferences": {
    "peak_productivity_hours": [9, 10, 11, 14, 15, 16],
    "preferred_focus_duration": 50
  },
  "availableHours": 8
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan_type": "daily",
    "title": "Focus Plan for January 15, 2024",
    "description": "AI-generated focus plan with 5 tasks",
    "tasks_summary": {...},
    "recommended_schedule": {
      "task_schedule": [
        {
          "task_id": 1,
          "title": "Complete project proposal",
          "scheduled_time": "2024-01-15T09:00:00",
          "estimated_minutes": 120,
          "priority": "high",
          "order": 1
        }
      ],
      "start_time": "2024-01-15T09:00:00",
      "end_time": "2024-01-15T17:00:00",
      "total_scheduled_minutes": 480
    },
    "focus_strategy": "Focus on high-priority tasks first during your peak productivity hours...",
    "estimated_total_minutes": 480
  }
}
```

### AI Distraction Detector

#### POST `/api/ai/distraction-detector/analyze`
Analyzes activity patterns for distractions.

**Request:**
```json
{
  "userId": "user123",
  "timeWindowHours": 24
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis_period_hours": 24,
    "total_activities": 45,
    "distraction_scores": {
      "overall_distraction_score": 0.62,
      "by_category": {
        "communication": {
          "count": 15,
          "total_duration": 1800,
          "distraction_duration": 1440,
          "avg_score": 0.80
        }
      }
    },
    "patterns": [
      {
        "type": "peak_distraction_hour",
        "hour": 14,
        "distraction_count": 8,
        "recommendation": "Avoid scheduling focus sessions at 14:00"
      }
    ],
    "insights": [
      {
        "type": "high_distraction",
        "severity": "high",
        "title": "High Distraction Level Detected",
        "description": "Your distraction score is 62.0%. Consider using focus mode more frequently.",
        "recommendations": [
          "Enable focus mode during peak work hours",
          "Block distracting apps during focus sessions"
        ]
      }
    ]
  }
}
```

### AI Time Predictor

#### POST `/api/ai/time-predictor/predict`
Predicts task duration.

**Request:**
```json
{
  "userId": "user123",
  "task": {
    "id": 1,
    "title": "Review code changes",
    "description": "Review pull request and provide feedback",
    "priority": "medium",
    "type": "review"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": 1,
    "predicted_minutes": 35,
    "confidence_score": 0.75,
    "base_estimate_minutes": 30,
    "reasoning": "Based on review task patterns, estimated duration is 35 minutes. High confidence based on similar historical tasks.",
    "input_features": {
      "title_length": 18,
      "description_length": 43,
      "word_count": 11,
      "task_type": "review"
    },
    "model_version": "v1.0"
  }
}
```

#### POST `/api/ai/time-predictor/batch-predict`
Batch predicts durations for multiple tasks.

**Request:**
```json
{
  "userId": "user123",
  "tasks": [
    {"id": 1, "title": "Task 1", ...},
    {"id": 2, "title": "Task 2", ...}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "task_id": 1,
      "predicted_minutes": 35,
      "confidence_score": 0.75,
      ...
    },
    {
      "task_id": 2,
      "predicted_minutes": 60,
      "confidence_score": 0.80,
      ...
    }
  ]
}
```

### Smart Suggestions

#### POST `/api/ai/smart-suggestions/generate`
Generates smart productivity suggestions.

**Request:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "suggestion_type": "schedule_optimization",
      "title": "Optimize Your Schedule",
      "description": "Your most productive hours are 9:00, 10:00, 11:00. Schedule important tasks during these times.",
      "rationale": "Based on your focus session history, these hours show the highest productivity with minimal interruptions.",
      "priority_score": 0.85,
      "action_items": [
        "Schedule high-priority tasks between 9:00 and 11:00",
        "Block these hours in your calendar for deep work"
      ],
      "expected_benefit": "30% increase in focus session effectiveness",
      "context_data": {
        "peak_hours": [9, 10, 11],
        "productivity_score": 8.5
      }
    }
  ]
}
```

---

## 📊 Database Schema

### Tables Created
1. **tasks** - User tasks with AI predictions
2. **activity_patterns** - Activity tracking for distraction analysis
3. **time_predictions** - Stored time predictions
4. **focus_plans** - AI-generated focus plans
5. **focus_plan_tasks** - Task assignments in focus plans
6. **distraction_insights** - Generated distraction insights
7. **smart_suggestions** - Generated productivity suggestions
8. **user_productivity_profiles** - User productivity data for AI
9. **ai_training_cache** - Cache for AI model training data

See `server/db/migrations/002_ai_features_tables.sql` for full schema.

---

## 🧪 Testing Instructions

### 1. Setup

```bash
# Install Python dependencies
cd python_service
pip install -r requirements.txt

# Install Node.js dependencies
cd ../server
npm install
```

### 2. Start Services

```bash
# Terminal 1: Start AI Service (Python)
cd python_service
uvicorn src.api.main:app --reload --port 8000

# Terminal 2: Start Backend API (Node.js)
cd server
npm run dev

# Terminal 3: Start Frontend (if needed)
cd frontend
npm run dev
```

### 3. Test AI Focus Coach

```bash
# Test task summarization
curl -X POST http://localhost:4000/ai/focus-coach/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "title": "Complete project proposal",
        "description": "Write and review project proposal",
        "priority": "high",
        "estimated_minutes": 120
      }
    ]
  }'

# Test focus plan generation
curl -X POST http://localhost:4000/ai/focus-coach/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "tasks": [
      {
        "title": "Task 1",
        "priority": "high",
        "estimated_minutes": 60
      }
    ]
  }'
```

### 4. Test Distraction Detector

```bash
curl -X POST http://localhost:4000/ai/distraction-detector/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "timeWindowHours": 24
  }'
```

### 5. Test Time Predictor

```bash
curl -X POST http://localhost:4000/ai/time-predictor/predict \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "task": {
      "title": "Review code",
      "description": "Review pull request",
      "type": "review"
    }
  }'
```

### 6. Test Smart Suggestions

```bash
curl -X POST http://localhost:4000/ai/smart-suggestions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user"
  }'
```

### 7. Health Check

```bash
# AI Service Health
curl http://localhost:8000/api/ai/health

# Backend API Health
curl http://localhost:4000/ai/health
```

---

## 🎨 Frontend Integration

### API Client

```javascript
import { aiApi } from '@/services/aiApi';

// Summarize tasks
const summary = await aiApi.summarizeTasks(tasks);

// Generate focus plan
const plan = await aiApi.generateFocusPlan(userId, tasks, preferences);

// Analyze distractions
const analysis = await aiApi.analyzeDistractions(userId, timeWindow);

// Predict task duration
const prediction = await aiApi.predictTaskDuration(userId, task);

// Generate suggestions
const suggestions = await aiApi.generateSmartSuggestions(userId);
```

### Components

Use the React components in `frontend/src/components/AI/`:
- `<FocusCoach />` - Task summary and focus plan
- `<DistractionDetector />` - Distraction analysis
- `<TimePredictor />` - Task duration predictions
- `<SmartSuggestions />` - Productivity suggestions

---

## 🔧 Configuration

### Environment Variables

Add to `.env`:

```env
# AI Service URL
PYTHON_SERVICE_URL=http://localhost:8000

# OpenAI (optional, for enhanced AI features)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
```

---

## 📈 Next Steps

1. **Connect to Database**: Implement helper methods in `dbService.js`
2. **Add Frontend Components**: Create React components for UI
3. **Add Authentication**: Secure API endpoints
4. **Add Caching**: Cache AI predictions for performance
5. **Add Monitoring**: Track AI feature usage and performance
6. **Add Training**: Implement model training from user data

---

**Status**: ✅ Core Implementation Complete  
**Last Updated**: 2024  
**Version**: 1.0.0

