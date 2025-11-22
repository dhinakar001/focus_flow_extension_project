"""
AI Time Predictor - Predicts task duration based on historical data
"""
from typing import List, Dict, Optional
from datetime import datetime
import statistics
import json


class TimePredictor:
    """
    AI-powered time predictor that:
    - Predicts task duration based on historical patterns
    - Learns from user's past performance
    - Provides confidence scores
    - Adapts to user behavior
    """
    
    def __init__(self, openai_client=None):
        self.openai_client = openai_client
        self.model_version = "v1.0"
        
        # Base time estimates by task type (in minutes)
        self.base_estimates = {
            "email": 5,
            "meeting": 60,
            "coding": 90,
            "writing": 45,
            "research": 60,
            "design": 120,
            "review": 30,
            "planning": 60,
            "general": 30
        }
    
    def predict_task_duration(
        self,
        task: Dict,
        historical_data: Optional[List[Dict]] = None,
        user_profile: Optional[Dict] = None
    ) -> Dict:
        """
        Predicts the duration for a given task.
        
        Args:
            task: Task dictionary with title, description, type, etc.
            historical_data: List of past tasks with actual durations
            user_profile: User productivity profile with averages
        
        Returns:
            Dictionary with prediction, confidence score, and reasoning
        """
        # Extract task features
        features = self._extract_features(task)
        
        # Get base estimate
        base_estimate = self._get_base_estimate(task, features)
        
        # Adjust based on historical data
        adjusted_estimate = self._adjust_with_history(
            base_estimate,
            task,
            historical_data
        )
        
        # Adjust based on user profile
        final_estimate = self._adjust_with_profile(
            adjusted_estimate,
            user_profile
        )
        
        # Calculate confidence
        confidence = self._calculate_confidence(
            task,
            historical_data,
            user_profile
        )
        
        return {
            "task_id": task.get("id"),
            "predicted_minutes": int(final_estimate),
            "confidence_score": round(confidence, 2),
            "base_estimate_minutes": int(base_estimate),
            "reasoning": self._generate_reasoning(task, final_estimate, confidence),
            "input_features": features,
            "model_version": self.model_version,
            "predicted_at": datetime.now().isoformat()
        }
    
    def _extract_features(self, task: Dict) -> Dict:
        """Extracts features from task for prediction."""
        title = task.get("title", "").lower()
        description = task.get("description", "").lower()
        task_type = task.get("type", "general").lower()
        
        # Simple keyword-based feature extraction
        features = {
            "title_length": len(title),
            "description_length": len(description),
            "word_count": len(title.split()) + len(description.split()),
            "task_type": task_type,
            "priority": task.get("priority", "medium").lower(),
            "has_deadline": bool(task.get("due_date")),
            "estimated_minutes": task.get("estimated_minutes"),
            "tags": task.get("tags", [])
        }
        
        # Detect complexity indicators
        complexity_keywords = ["complex", "difficult", "challenging", "multiple", "several"]
        features["complexity_score"] = sum(
            1 for keyword in complexity_keywords
            if keyword in title or keyword in description
        )
        
        # Detect urgency
        urgency_keywords = ["urgent", "asap", "immediate", "critical", "important"]
        features["urgency_score"] = sum(
            1 for keyword in urgency_keywords
            if keyword in title or keyword in description
        )
        
        return features
    
    def _get_base_estimate(self, task: Dict, features: Dict) -> float:
        """Gets base time estimate for the task."""
        task_type = features.get("task_type", "general")
        base = self.base_estimates.get(task_type, self.base_estimates["general"])
        
        # Adjust based on word count (for writing/research tasks)
        if task_type in ["writing", "research", "email"]:
            word_count = features.get("word_count", 0)
            if word_count > 500:
                base *= 1.5
            elif word_count > 1000:
                base *= 2.0
        
        # Adjust based on complexity
        complexity = features.get("complexity_score", 0)
        if complexity > 0:
            base *= (1 + complexity * 0.2)
        
        return base
    
    def _adjust_with_history(
        self,
        base_estimate: float,
        task: Dict,
        historical_data: Optional[List[Dict]]
    ) -> float:
        """Adjusts estimate based on historical task performance."""
        if not historical_data:
            return base_estimate
        
        # Find similar tasks
        similar_tasks = self._find_similar_tasks(task, historical_data)
        
        if not similar_tasks:
            return base_estimate
        
        # Calculate average actual duration for similar tasks
        actual_durations = [
            t.get("actual_minutes") or t.get("duration_minutes")
            for t in similar_tasks
            if t.get("actual_minutes") or t.get("duration_minutes")
        ]
        
        if not actual_durations:
            return base_estimate
        
        avg_actual = statistics.mean(actual_durations)
        median_actual = statistics.median(actual_durations)
        
        # Use weighted average (favor median for outliers)
        adjusted = (avg_actual * 0.3) + (median_actual * 0.7)
        
        # Blend with base estimate based on confidence
        similarity_confidence = min(len(similar_tasks) / 5, 1.0)  # More similar tasks = higher confidence
        
        return (base_estimate * (1 - similarity_confidence)) + (adjusted * similarity_confidence)
    
    def _find_similar_tasks(self, task: Dict, historical_data: List[Dict]) -> List[Dict]:
        """Finds similar tasks from historical data."""
        task_title = task.get("title", "").lower()
        task_type = task.get("type", "general").lower()
        
        similar = []
        
        for hist_task in historical_data:
            similarity_score = 0
            
            # Type similarity
            if hist_task.get("type", "").lower() == task_type:
                similarity_score += 3
            
            # Title similarity (simple word overlap)
            hist_title = hist_task.get("title", "").lower()
            task_words = set(task_title.split())
            hist_words = set(hist_title.split())
            
            if task_words and hist_words:
                overlap = len(task_words.intersection(hist_words)) / len(task_words.union(hist_words))
                similarity_score += overlap * 2
            
            # Priority similarity
            if hist_task.get("priority", "").lower() == task.get("priority", "medium").lower():
                similarity_score += 1
            
            # Tag similarity
            task_tags = set(task.get("tags", []))
            hist_tags = set(hist_task.get("tags", []))
            if task_tags and hist_tags:
                tag_overlap = len(task_tags.intersection(hist_tags)) / len(task_tags.union(hist_tags))
                similarity_score += tag_overlap
            
            if similarity_score >= 2:  # Threshold for similarity
                similar.append(hist_task)
        
        return similar[:10]  # Limit to 10 most similar
    
    def _adjust_with_profile(
        self,
        estimate: float,
        user_profile: Optional[Dict]
    ) -> float:
        """Adjusts estimate based on user's productivity profile."""
        if not user_profile:
            return estimate
        
        avg_task_duration = user_profile.get("average_task_duration_minutes")
        
        if avg_task_duration:
            # Adjust based on user's typical speed
            adjustment_factor = avg_task_duration / 30.0  # 30 minutes as baseline
            return estimate * adjustment_factor
        
        return estimate
    
    def _calculate_confidence(
        self,
        task: Dict,
        historical_data: Optional[List[Dict]],
        user_profile: Optional[Dict]
    ) -> float:
        """Calculates confidence score for the prediction."""
        confidence = 0.5  # Base confidence
        
        # Increase confidence if we have historical data
        if historical_data:
            similar_count = len(self._find_similar_tasks(task, historical_data))
            if similar_count > 0:
                confidence += min(similar_count / 10, 0.3)  # Up to 0.3 boost
        
        # Increase confidence if we have user profile
        if user_profile:
            if user_profile.get("average_task_duration_minutes"):
                confidence += 0.2
        
        # Decrease confidence for vague tasks
        if not task.get("description") or len(task.get("description", "")) < 10:
            confidence -= 0.1
        
        # Ensure confidence is between 0 and 1
        return max(0.3, min(0.95, confidence))
    
    def _generate_reasoning(
        self,
        task: Dict,
        estimate: float,
        confidence: float
    ) -> str:
        """Generates human-readable reasoning for the prediction."""
        task_type = task.get("type", "general")
        
        reasoning = f"Based on {task_type} task patterns, estimated duration is {int(estimate)} minutes. "
        
        if confidence > 0.7:
            reasoning += "High confidence based on similar historical tasks."
        elif confidence > 0.5:
            reasoning += "Moderate confidence with some uncertainty."
        else:
            reasoning += "Lower confidence - task details may need refinement."
        
        return reasoning
    
    def batch_predict(
        self,
        tasks: List[Dict],
        historical_data: Optional[List[Dict]] = None,
        user_profile: Optional[Dict] = None
    ) -> List[Dict]:
        """Predicts duration for multiple tasks."""
        return [
            self.predict_task_duration(task, historical_data, user_profile)
            for task in tasks
        ]


# Export for use in other modules
__all__ = ["TimePredictor"]

