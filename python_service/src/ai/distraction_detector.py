"""
AI Distraction Detector - Analyzes activity patterns to detect distractions
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import Counter
import statistics


class DistractionDetector:
    """
    AI-powered distraction detector that:
    - Analyzes activity patterns
    - Identifies distraction sources
    - Detects patterns in behavior
    - Generates insights and recommendations
    """
    
    def __init__(self, openai_client=None):
        self.openai_client = openai_client
        self.model_version = "v1.0"
        
        # Distraction categories with weights
        self.distraction_categories = {
            "communication": {"weight": 0.8, "apps": ["slack", "cliq", "teams", "messages"]},
            "entertainment": {"weight": 0.9, "apps": ["youtube", "netflix", "twitter", "instagram", "tiktok"]},
            "social": {"weight": 0.7, "apps": ["facebook", "linkedin", "reddit"]},
            "news": {"weight": 0.5, "apps": ["news", "cnn", "bbc"]},
            "work": {"weight": 0.1, "apps": ["vscode", "excel", "docs", "sheets"]},
        }
    
    def analyze_activity_patterns(
        self,
        activities: List[Dict],
        time_window_hours: int = 24
    ) -> Dict:
        """
        Analyzes activity patterns over a time window.
        
        Args:
            activities: List of activity dictionaries with type, category, timestamp, etc.
            time_window_hours: Time window to analyze (default 24 hours)
        
        Returns:
            Dictionary with distraction analysis, patterns, and insights
        """
        if not activities:
            return {
                "error": "No activities provided for analysis",
                "total_activities": 0
            }
        
        # Filter activities by time window
        cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
        recent_activities = [
            a for a in activities
            if datetime.fromisoformat(a.get("timestamp", "").replace("Z", "+00:00")) >= cutoff_time
        ]
        
        if not recent_activities:
            return {
                "error": "No recent activities in the specified time window",
                "total_activities": 0
            }
        
        # Calculate distraction scores
        distraction_scores = self._calculate_distraction_scores(recent_activities)
        
        # Detect patterns
        patterns = self._detect_patterns(recent_activities)
        
        # Generate insights
        insights = self._generate_insights(recent_activities, distraction_scores, patterns)
        
        # Calculate statistics
        stats = self._calculate_statistics(recent_activities, distraction_scores)
        
        return {
            "analysis_period_hours": time_window_hours,
            "total_activities": len(recent_activities),
            "distraction_scores": distraction_scores,
            "patterns": patterns,
            "insights": insights,
            "statistics": stats,
            "model_version": self.model_version,
            "analyzed_at": datetime.now().isoformat()
        }
    
    def _calculate_distraction_scores(self, activities: List[Dict]) -> Dict:
        """Calculates distraction scores for each activity category."""
        category_scores = {}
        total_duration = 0
        distraction_duration = 0
        
        for activity in activities:
            category = activity.get("activity_category", "unknown").lower()
            duration = activity.get("duration_seconds", 0)
            activity_type = activity.get("activity_type", "").lower()
            
            total_duration += duration
            
            # Get distraction weight for category
            weight = self.distraction_categories.get(category, {}).get("weight", 0.5)
            is_distraction = weight > 0.5  # Threshold for distraction
            
            if is_distraction:
                distraction_duration += duration * weight
            
            if category not in category_scores:
                category_scores[category] = {
                    "count": 0,
                    "total_duration": 0,
                    "distraction_duration": 0,
                    "avg_score": 0.0
                }
            
            category_scores[category]["count"] += 1
            category_scores[category]["total_duration"] += duration
            category_scores[category]["distraction_duration"] += duration * weight
        
        # Calculate average scores
        for category, data in category_scores.items():
            if data["total_duration"] > 0:
                data["avg_score"] = data["distraction_duration"] / data["total_duration"]
            else:
                data["avg_score"] = 0.0
        
        overall_score = distraction_duration / total_duration if total_duration > 0 else 0.0
        
        return {
            "overall_distraction_score": min(overall_score, 1.0),
            "by_category": category_scores,
            "total_duration_seconds": total_duration,
            "distraction_duration_seconds": distraction_duration
        }
    
    def _detect_patterns(self, activities: List[Dict]) -> List[Dict]:
        """Detects patterns in activity behavior."""
        patterns = []
        
        # Group activities by hour
        hourly_activity = {}
        for activity in activities:
            timestamp = datetime.fromisoformat(activity.get("timestamp", "").replace("Z", "+00:00"))
            hour = timestamp.hour
            
            if hour not in hourly_activity:
                hourly_activity[hour] = []
            
            hourly_activity[hour].append(activity)
        
        # Detect peak distraction hours
        distraction_by_hour = {}
        for hour, acts in hourly_activity.items():
            distraction_count = sum(
                1 for a in acts
                if self.distraction_categories.get(
                    a.get("activity_category", "").lower(), {}
                ).get("weight", 0.5) > 0.5
            )
            distraction_by_hour[hour] = distraction_count
        
        if distraction_by_hour:
            max_distraction_hour = max(distraction_by_hour.items(), key=lambda x: x[1])
            patterns.append({
                "type": "peak_distraction_hour",
                "hour": max_distraction_hour[0],
                "distraction_count": max_distraction_hour[1],
                "recommendation": f"Avoid scheduling focus sessions at {max_distraction_hour[0]}:00"
            })
        
        # Detect recurring distractions
        category_counter = Counter(
            a.get("activity_category", "unknown").lower()
            for a in activities
        )
        
        most_common = category_counter.most_common(3)
        for category, count in most_common:
            if self.distraction_categories.get(category, {}).get("weight", 0.5) > 0.5:
                patterns.append({
                    "type": "recurring_distraction",
                    "category": category,
                    "frequency": count,
                    "recommendation": f"Consider blocking {category} during focus sessions"
                })
        
        # Detect rapid switching
        rapid_switches = 0
        for i in range(len(activities) - 1):
            time_diff = (
                datetime.fromisoformat(activities[i+1].get("timestamp", "").replace("Z", "+00:00")) -
                datetime.fromisoformat(activities[i].get("timestamp", "").replace("Z", "+00:00"))
            ).total_seconds()
            
            if time_diff < 60:  # Switch within 1 minute
                rapid_switches += 1
        
        if rapid_switches > len(activities) * 0.1:  # More than 10% rapid switches
            patterns.append({
                "type": "rapid_context_switching",
                "switch_count": rapid_switches,
                "recommendation": "Try focusing on single tasks for longer periods"
            })
        
        return patterns
    
    def _generate_insights(
        self,
        activities: List[Dict],
        distraction_scores: Dict,
        patterns: List[Dict]
    ) -> List[Dict]:
        """Generates actionable insights from the analysis."""
        insights = []
        
        overall_score = distraction_scores.get("overall_distraction_score", 0.0)
        
        # High distraction insight
        if overall_score > 0.6:
            insights.append({
                "type": "high_distraction",
                "severity": "high",
                "title": "High Distraction Level Detected",
                "description": f"Your distraction score is {overall_score:.1%}. Consider using focus mode more frequently.",
                "recommendations": [
                    "Enable focus mode during peak work hours",
                    "Block distracting apps during focus sessions",
                    "Take strategic breaks to prevent burnout"
                ]
            })
        elif overall_score > 0.4:
            insights.append({
                "type": "moderate_distraction",
                "severity": "medium",
                "title": "Moderate Distraction Detected",
                "description": f"Your distraction score is {overall_score:.1%}. Some room for improvement.",
                "recommendations": [
                    "Schedule focus sessions during your most productive hours",
                    "Minimize notifications during important tasks"
                ]
            })
        
        # Add pattern-based insights
        for pattern in patterns:
            if pattern["type"] in ["peak_distraction_hour", "recurring_distraction"]:
                insights.append({
                    "type": "pattern_insight",
                    "severity": "medium",
                    "title": f"Pattern Detected: {pattern['type'].replace('_', ' ').title()}",
                    "description": pattern["recommendation"],
                    "recommendations": [pattern["recommendation"]]
                })
        
        return insights
    
    def _calculate_statistics(
        self,
        activities: List[Dict],
        distraction_scores: Dict
    ) -> Dict:
        """Calculates statistical summaries."""
        durations = [a.get("duration_seconds", 0) for a in activities]
        scores = [a.get("distraction_score", 0.0) for a in activities if a.get("distraction_score")]
        
        return {
            "total_activities": len(activities),
            "avg_duration_seconds": statistics.mean(durations) if durations else 0,
            "median_duration_seconds": statistics.median(durations) if durations else 0,
            "avg_distraction_score": statistics.mean(scores) if scores else 0.0,
            "max_distraction_score": max(scores) if scores else 0.0,
            "min_distraction_score": min(scores) if scores else 0.0
        }
    
    def generate_distraction_report(
        self,
        user_id: str,
        time_period_days: int = 7
    ) -> Dict:
        """
        Generates a comprehensive distraction report for a user.
        This would typically fetch activities from the database.
        """
        return {
            "user_id": user_id,
            "time_period_days": time_period_days,
            "generated_at": datetime.now().isoformat(),
            "note": "This is a placeholder. Implement database query to fetch activities."
        }


# Export for use in other modules
__all__ = ["DistractionDetector"]

