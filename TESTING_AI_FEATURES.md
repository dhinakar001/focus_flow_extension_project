# Testing Guide for AI Features

## 🧪 Complete Testing Guide

This document provides comprehensive testing instructions for all AI features in FocusFlow.

---

## 📋 Prerequisites

### 1. Environment Setup

```bash
# Install Python dependencies
cd python_service
pip install -r requirements.txt

# Install Node.js dependencies
cd ../server
npm install

# Set environment variables
cp .env.example .env
```

### 2. Environment Variables

Add to `.env`:

```env
# Backend API
PORT=4000
DATABASE_URL=postgresql://user:pass@localhost:5432/focusflow

# AI Service
PYTHON_SERVICE_URL=http://localhost:8000

# OpenAI (optional)
OPENAI_API_KEY=sk-...
```

### 3. Database Setup

```bash
# Run migrations
psql -U postgres -d focusflow -f server/db/migrations/001_create_tables.sql
psql -U postgres -d focusflow -f server/db/migrations/002_ai_features_tables.sql
```

---

## 🚀 Starting Services

### Terminal 1: AI Service (Python)

```bash
cd python_service
uvicorn src.api.main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Backend API (Node.js)

```bash
cd server
npm run dev
```

Expected output:
```
[FocusFlow] Server listening on port 4000
```

### Terminal 3: Frontend (Optional)

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE server running on http://localhost:5173
```

---

## ✅ Health Checks

### AI Service Health

```bash
curl http://localhost:8000/api/ai/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "ai",
  "components": {
    "focus_coach": "available",
    "distraction_detector": "available",
    "time_predictor": "available",
    "smart_suggestions": "available"
  }
}
```

### Backend API Health

```bash
curl http://localhost:4000/ai/health
```

Expected response:
```json
{
  "status": "ok",
  "components": {...}
}
```

---

## 🧪 Test Cases

### 1. AI Focus Coach - Task Summarization

#### Test Case 1.1: Basic Task Summarization

```bash
curl -X POST http://localhost:4000/ai/focus-coach/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "title": "Complete project proposal",
        "description": "Write and review project proposal document",
        "priority": "high",
        "estimated_minutes": 120,
        "category": "writing"
      },
      {
        "title": "Review code changes",
        "description": "Review pull request #123",
        "priority": "medium",
        "estimated_minutes": 30,
        "category": "coding"
      }
    ]
  }'
```

**Expected Response:**
- Status: 200 OK
- Contains: `summary`, `total_tasks`, `priority_breakdown`, `categories`

#### Test Case 1.2: Empty Tasks Array

```bash
curl -X POST http://localhost:4000/ai/focus-coach/summarize \
  -H "Content-Type: application/json" \
  -d '{"tasks": []}'
```

**Expected Response:**
- Status: 200 OK
- Contains: "No tasks to summarize"

#### Test Case 1.3: Invalid Request

```bash
curl -X POST http://localhost:4000/ai/focus-coach/summarize \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
- Status: 400 Bad Request
- Contains: "Tasks array is required"

---

### 2. AI Focus Coach - Focus Plan Generation

#### Test Case 2.1: Generate Focus Plan

```bash
curl -X POST http://localhost:4000/ai/focus-coach/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "tasks": [
      {
        "title": "Task 1",
        "priority": "high",
        "estimated_minutes": 60
      },
      {
        "title": "Task 2",
        "priority": "medium",
        "estimated_minutes": 30
      }
    ],
    "userPreferences": {
      "peak_productivity_hours": [9, 10, 11, 14, 15, 16],
      "preferred_focus_duration": 50
    },
    "availableHours": 8
  }'
```

**Expected Response:**
- Status: 200 OK
- Contains: `plan_type`, `title`, `recommended_schedule`, `focus_strategy`
- Schedule has tasks with `scheduled_time` and `estimated_minutes`

#### Test Case 2.2: Missing userId

```bash
curl -X POST http://localhost:4000/ai/focus-coach/generate-plan \
  -H "Content-Type: application/json" \
  -d '{"tasks": []}'
```

**Expected Response:**
- Status: 400 Bad Request
- Contains: "userId is required"

---

### 3. AI Distraction Detector

#### Test Case 3.1: Analyze Distractions

```bash
curl -X POST http://localhost:4000/ai/distraction-detector/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "timeWindowHours": 24
  }'
```

**Expected Response:**
- Status: 200 OK
- Contains: `analysis_period_hours`, `total_activities`, `distraction_scores`, `patterns`, `insights`

**Note:** This requires activity data in the database. If no data exists, you'll get:
```json
{
  "success": true,
  "data": {
    "error": "No activity patterns found for the specified time window",
    "total_activities": 0
  }
}
```

#### Test Case 3.2: Custom Time Window

```bash
curl -X POST http://localhost:4000/ai/distraction-detector/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "timeWindowHours": 168
  }'
```

**Expected Response:**
- Status: 200 OK
- `analysis_period_hours`: 168 (7 days)

---

### 4. AI Time Predictor

#### Test Case 4.1: Predict Single Task Duration

```bash
curl -X POST http://localhost:4000/ai/time-predictor/predict \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "task": {
      "title": "Review code changes",
      "description": "Review pull request and provide feedback",
      "priority": "medium",
      "type": "review"
    }
  }'
```

**Expected Response:**
- Status: 200 OK
- Contains: `predicted_minutes`, `confidence_score`, `reasoning`, `input_features`

#### Test Case 4.2: Batch Predict Durations

```bash
curl -X POST http://localhost:4000/ai/time-predictor/batch-predict \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "tasks": [
      {
        "id": 1,
        "title": "Task 1",
        "type": "coding"
      },
      {
        "id": 2,
        "title": "Task 2",
        "type": "writing"
      }
    ]
  }'
```

**Expected Response:**
- Status: 200 OK
- Contains: Array of predictions with `task_id`, `predicted_minutes`, `confidence_score`

---

### 5. Smart Suggestions

#### Test Case 5.1: Generate Suggestions

```bash
curl -X POST http://localhost:4000/ai/smart-suggestions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123"
  }'
```

**Expected Response:**
- Status: 200 OK
- Contains: Array of suggestions with:
  - `suggestion_type`
  - `title`
  - `description`
  - `priority_score`
  - `action_items`
  - `expected_benefit`

#### Test Case 5.2: Get Suggestions via GET

```bash
curl http://localhost:4000/ai/smart-suggestions/test-user-123
```

**Expected Response:**
- Status: 200 OK
- Same structure as POST request

---

## 🎨 Frontend Testing

### 1. Open Dashboard

1. Start frontend: `cd frontend && npm run dev`
2. Navigate to `http://localhost:5173`
3. Login with test user credentials

### 2. Test AI Focus Coach Component

1. Add some tasks
2. Click "Summarize Tasks" button
3. Verify summary appears
4. Click "Generate Focus Plan" button
5. Verify focus plan with schedule appears

### 3. Test Time Predictor Component

1. Add tasks to the list
2. Click "Predict All Task Durations" button
3. Verify predictions appear with confidence scores
4. Check that reasoning is displayed

### 4. Test Smart Suggestions Component

1. Component should auto-load suggestions on mount
2. Verify suggestions appear with severity badges
3. Test accept/reject buttons (UI only, backend integration pending)

---

## 🔍 Integration Testing

### Test Full Workflow

1. **Create Tasks**
   ```bash
   # Add tasks via API or UI
   ```

2. **Generate Focus Plan**
   ```bash
   curl -X POST http://localhost:4000/ai/focus-coach/generate-plan ...
   ```

3. **Predict Durations**
   ```bash
   curl -X POST http://localhost:4000/ai/time-predictor/batch-predict ...
   ```

4. **Analyze Distractions**
   ```bash
   curl -X POST http://localhost:4000/ai/distraction-detector/analyze ...
   ```

5. **Get Suggestions**
   ```bash
   curl -X POST http://localhost:4000/ai/smart-suggestions/generate ...
   ```

---

## 🐛 Troubleshooting

### Issue: AI Service Not Responding

**Symptoms:**
- Timeout errors
- Connection refused

**Solutions:**
1. Check AI service is running: `curl http://localhost:8000/api/ai/health`
2. Check PYTHON_SERVICE_URL in .env
3. Check firewall/network settings

### Issue: Database Errors

**Symptoms:**
- SQL errors
- Missing tables

**Solutions:**
1. Run migrations: `psql -U postgres -d focusflow -f server/db/migrations/002_ai_features_tables.sql`
2. Check DATABASE_URL in .env
3. Verify PostgreSQL is running

### Issue: OpenAI API Errors

**Symptoms:**
- API key errors
- Rate limit errors

**Solutions:**
1. Check OPENAI_API_KEY in .env
2. Verify API key is valid
3. Check rate limits in OpenAI dashboard
4. Note: AI features work without OpenAI (uses fallback logic)

---

## 📊 Performance Testing

### Load Testing

```bash
# Install Apache Bench
# Test 100 requests with 10 concurrent
ab -n 100 -c 10 -p test_data.json -T application/json \
  http://localhost:4000/ai/focus-coach/summarize
```

### Expected Performance

- **Task Summarization**: < 500ms
- **Focus Plan Generation**: < 2s
- **Distraction Analysis**: < 1s
- **Time Prediction**: < 300ms per task
- **Smart Suggestions**: < 3s

---

## ✅ Test Checklist

- [ ] AI Service starts successfully
- [ ] Backend API starts successfully
- [ ] Health checks pass
- [ ] Task summarization works
- [ ] Focus plan generation works
- [ ] Distraction analysis works
- [ ] Time prediction works (single & batch)
- [ ] Smart suggestions generation works
- [ ] Frontend components render
- [ ] Error handling works
- [ ] Database migrations applied
- [ ] Performance meets requirements

---

## 📝 Test Data

Create `test_data.json`:

```json
{
  "tasks": [
    {
      "title": "Test Task 1",
      "description": "Test description",
      "priority": "high",
      "estimated_minutes": 60
    }
  ]
}
```

---

**Status**: ✅ Complete  
**Last Updated**: 2024  
**Version**: 1.0.0

