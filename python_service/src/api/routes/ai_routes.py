"""
FastAPI routes for AI features
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

from ..ai.focus_coach import FocusCoach
from ..ai.distraction_detector import DistractionDetector
from ..ai.time_predictor import TimePredictor
from ..ai.smart_suggestions import SmartSuggestions

router = APIRouter(prefix="/api/ai", tags=["AI Features"])

# Initialize AI components (will be injected with OpenAI client)
focus_coach = FocusCoach()
distraction_detector = DistractionDetector()
time_predictor = TimePredictor()
smart_suggestions = SmartSuggestions()


# Request/Response Models
class TaskSummary(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    estimated_minutes: Optional[int] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class TaskSummaryRequest(BaseModel):
    tasks: List[TaskSummary]


class FocusPlanRequest(BaseModel):
    tasks: List[TaskSummary]
    user_preferences: Optional[Dict] = None
    available_hours: Optional[int] = None


class ActivityPattern(BaseModel):
    activity_type: str
    activity_category: str
    timestamp: str
    duration_seconds: int = 0
    distraction_score: Optional[float] = None
    context: Optional[Dict] = None


class DistractionAnalysisRequest(BaseModel):
    activities: List[ActivityPattern]
    time_window_hours: int = 24


class TimePredictionRequest(BaseModel):
    task: TaskSummary
    historical_data: Optional[List[Dict]] = None
    user_profile: Optional[Dict] = None


class SmartSuggestionsRequest(BaseModel):
    user_id: str
    productivity_data: Optional[Dict] = None
    focus_sessions: Optional[List[Dict]] = None
    tasks: Optional[List[Dict]] = None
    activity_patterns: Optional[List[Dict]] = None


@router.post("/focus-coach/summarize", response_model=Dict)
async def summarize_tasks(request: TaskSummaryRequest):
    """Summarize a list of tasks."""
    try:
        tasks_dict = [task.dict() for task in request.tasks]
        summary = focus_coach.summarize_tasks(tasks_dict)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error summarizing tasks: {str(e)}")


@router.post("/focus-coach/generate-plan", response_model=Dict)
async def generate_focus_plan(request: FocusPlanRequest):
    """Generate a personalized focus plan."""
    try:
        tasks_dict = [task.dict() for task in request.tasks]
        plan = focus_coach.generate_focus_plan(
            tasks_dict,
            request.user_preferences,
            request.available_hours
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating focus plan: {str(e)}")


@router.post("/distraction-detector/analyze", response_model=Dict)
async def analyze_distractions(request: DistractionAnalysisRequest):
    """Analyze activity patterns for distractions."""
    try:
        activities_dict = [activity.dict() for activity in request.activities]
        analysis = distraction_detector.analyze_activity_patterns(
            activities_dict,
            request.time_window_hours
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing distractions: {str(e)}")


@router.post("/time-predictor/predict", response_model=Dict)
async def predict_task_duration(request: TimePredictionRequest):
    """Predict task duration."""
    try:
        task_dict = request.task.dict()
        prediction = time_predictor.predict_task_duration(
            task_dict,
            request.historical_data,
            request.user_profile
        )
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting task duration: {str(e)}")


@router.post("/time-predictor/batch-predict", response_model=List[Dict])
async def batch_predict_durations(request: Body(...)):
    """Predict duration for multiple tasks."""
    try:
        tasks = request.get("tasks", [])
        historical_data = request.get("historical_data")
        user_profile = request.get("user_profile")
        
        predictions = time_predictor.batch_predict(
            tasks,
            historical_data,
            user_profile
        )
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error batch predicting durations: {str(e)}")


@router.post("/smart-suggestions/generate", response_model=List[Dict])
async def generate_smart_suggestions(request: SmartSuggestionsRequest):
    """Generate smart productivity suggestions."""
    try:
        suggestions = smart_suggestions.generate_suggestions(
            request.user_id,
            request.productivity_data or {},
            request.focus_sessions or [],
            request.tasks or [],
            request.activity_patterns or []
        )
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")


@router.get("/health")
async def ai_health_check():
    """Health check for AI service."""
    return {
        "status": "ok",
        "service": "ai",
        "components": {
            "focus_coach": "available",
            "distraction_detector": "available",
            "time_predictor": "available",
            "smart_suggestions": "available"
        },
        "timestamp": datetime.now().isoformat()
    }

