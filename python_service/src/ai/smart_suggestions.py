"""
AI Smart Suggestions - Generates productivity recommendations based on history
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import statistics


class SmartSuggestions:
    """
    AI-powered smart suggestions that:
    - Analyzes productivity history
    - Generates personalized recommendations
    - Provides actionable insights
    - Adapts to user behavior patterns
    """
    
    def __init__(self, openai_client=None):
        self.openai_client = openai_client
        self.model_version = "v1.0"
    
    def generate_suggestions(
        self,
        user_id: str,
        productivity_data: Dict,
        focus_sessions: List[Dict],
        tasks: List[Dict],
        activity_patterns: List[Dict]
    ) -> List[Dict]:
        """
        Generates smart suggestions based on productivity history.
        
        Args:
            user_id: User ID
            productivity_data: User productivity profile data
            focus_sessions: List of focus sessions
            tasks: List of tasks with completion data
            activity_patterns: Activity pattern data
        
        Returns:
            List of suggestion dictionaries
        """
        suggestions = []
        
        # Schedule optimization suggestions
        schedule_suggestions = self._generate_schedule_suggestions(
            focus_sessions,
            productivity_data
        )
        suggestions.extend(schedule_suggestions)
        
        # Task prioritization suggestions
        task_suggestions = self._generate_task_prioritization_suggestions(
            tasks,
            focus_sessions
        )
        suggestions.extend(task_suggestions)
        
        # Break timing suggestions
        break_suggestions = self._generate_break_timing_suggestions(
            focus_sessions,
            activity_patterns
        )
        suggestions.extend(break_suggestions)
        
        # Focus duration suggestions
        duration_suggestions = self._generate_duration_suggestions(
            focus_sessions,
            tasks
        )
        suggestions.extend(duration_suggestions)
        
        # Productivity pattern suggestions
        pattern_suggestions = self._generate_pattern_suggestions(
            activity_patterns,
            focus_sessions
        )
        suggestions.extend(pattern_suggestions)
        
        # Sort by priority score
        suggestions.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
        
        return suggestions[:10]  # Return top 10 suggestions
    
    def _generate_schedule_suggestions(
        self,
        focus_sessions: List[Dict],
        productivity_data: Dict
    ) -> List[Dict]:
        """Generates schedule optimization suggestions."""
        suggestions = []
        
        if not focus_sessions:
            return suggestions
        
        # Analyze peak productivity hours
        hourly_productivity = {}
        for session in focus_sessions:
            started_at = datetime.fromisoformat(session.get("started_at", "").replace("Z", "+00:00"))
            hour = started_at.hour
            duration = session.get("duration_minutes", 0)
            interruptions = session.get("interruption_count", 0)
            
            if hour not in hourly_productivity:
                hourly_productivity[hour] = {"duration": 0, "interruptions": 0, "count": 0}
            
            hourly_productivity[hour]["duration"] += duration
            hourly_productivity[hour]["interruptions"] += interruptions
            hourly_productivity[hour]["count"] += 1
        
        # Find best hours (high duration, low interruptions)
        if hourly_productivity:
            best_hours = sorted(
                hourly_productivity.items(),
                key=lambda x: x[1]["duration"] / max(x[1]["interruptions"], 1),
                reverse=True
            )[:3]
            
            if best_hours:
                peak_hours = [h[0] for h in best_hours]
                suggestions.append({
                    "suggestion_type": "schedule_optimization",
                    "title": "Optimize Your Schedule",
                    "description": f"Your most productive hours are {', '.join(f'{h}:00' for h in peak_hours)}. Schedule important tasks during these times.",
                    "rationale": "Based on your focus session history, these hours show the highest productivity with minimal interruptions.",
                    "priority_score": 0.85,
                    "action_items": [
                        f"Schedule high-priority tasks between {peak_hours[0]}:00 and {peak_hours[-1]}:00",
                        "Block these hours in your calendar for deep work"
                    ],
                    "expected_benefit": "30% increase in focus session effectiveness",
                    "context_data": {
                        "peak_hours": peak_hours,
                        "productivity_score": best_hours[0][1]["duration"] / max(best_hours[0][1]["interruptions"], 1)
                    }
                })
        
        return suggestions
    
    def _generate_task_prioritization_suggestions(
        self,
        tasks: List[Dict],
        focus_sessions: List[Dict]
    ) -> List[Dict]:
        """Generates task prioritization suggestions."""
        suggestions = []
        
        # Find incomplete high-priority tasks
        incomplete_high_priority = [
            t for t in tasks
            if t.get("status") not in ["completed", "cancelled"]
            and t.get("priority", "medium").lower() in ["urgent", "high"]
        ]
        
        if incomplete_high_priority:
            overdue = [
                t for t in incomplete_high_priority
                if t.get("due_date") and datetime.fromisoformat(
                    t.get("due_date", "").replace("Z", "+00:00")
                ) < datetime.now()
            ]
            
            if overdue:
                suggestions.append({
                    "suggestion_type": "task_prioritization",
                    "title": "Focus on Overdue High-Priority Tasks",
                    "description": f"You have {len(overdue)} overdue high-priority task(s) that need immediate attention.",
                    "rationale": "Overdue high-priority tasks can cause stress and reduce overall productivity.",
                    "priority_score": 0.95,
                    "action_items": [
                        f"Review {len(overdue)} overdue task(s)",
                        "Schedule focus sessions for these tasks today",
                        "Consider breaking down complex tasks into smaller pieces"
                    ],
                    "expected_benefit": "Reduce stress and improve task completion rate",
                    "context_data": {
                        "overdue_count": len(overdue),
                        "tasks": [t.get("title") for t in overdue[:3]]
                    }
                })
        
        return suggestions
    
    def _generate_break_timing_suggestions(
        self,
        focus_sessions: List[Dict],
        activity_patterns: List[Dict]
    ) -> List[Dict]:
        """Generates break timing suggestions."""
        suggestions = []
        
        if not focus_sessions:
            return suggestions
        
        # Analyze interruption patterns
        sessions_with_interruptions = [
            s for s in focus_sessions
            if s.get("interruption_count", 0) > 0
        ]
        
        if sessions_with_interruptions:
            avg_duration = statistics.mean([
                s.get("duration_minutes", 0) for s in sessions_with_interruptions
            ])
            
            avg_interruptions = statistics.mean([
                s.get("interruption_count", 0) for s in sessions_with_interruptions
            ])
            
            # If interruptions are high after 50 minutes, suggest earlier breaks
            if avg_interruptions > 3 and avg_duration > 50:
                suggestions.append({
                    "suggestion_type": "break_timing",
                    "title": "Take Strategic Breaks Earlier",
                    "description": f"Your focus sessions show increased interruptions after {int(avg_duration)} minutes. Try taking breaks at 45-minute intervals.",
                    "rationale": "Taking breaks before productivity naturally declines can maintain focus quality.",
                    "priority_score": 0.75,
                    "action_items": [
                        "Set focus sessions to 45 minutes instead of longer durations",
                        "Take 5-10 minute breaks between sessions",
                        "Use breaks to hydrate and stretch"
                    ],
                    "expected_benefit": "20% reduction in interruptions and improved focus quality",
                    "context_data": {
                        "avg_duration": avg_duration,
                        "avg_interruptions": avg_interruptions
                    }
                })
        
        return suggestions
    
    def _generate_duration_suggestions(
        self,
        focus_sessions: List[Dict],
        tasks: List[Dict]
    ) -> List[Dict]:
        """Generates focus duration suggestions."""
        suggestions = []
        
        if not focus_sessions:
            return suggestions
        
        # Find optimal duration
        successful_sessions = [
            s for s in focus_sessions
            if s.get("interruption_count", 0) <= 1
            and s.get("duration_minutes", 0) >= 30
        ]
        
        if successful_sessions:
            optimal_durations = [
                s.get("duration_minutes", 0) for s in successful_sessions
            ]
            
            if optimal_durations:
                median_duration = statistics.median(optimal_durations)
                
                suggestions.append({
                    "suggestion_type": "focus_duration",
                    "title": f"Optimal Focus Duration: {int(median_duration)} Minutes",
                    "description": f"Your most successful focus sessions average {int(median_duration)} minutes with minimal interruptions.",
                    "rationale": "Using your proven optimal duration can improve focus session success rate.",
                    "priority_score": 0.70,
                    "action_items": [
                        f"Set default focus duration to {int(median_duration)} minutes",
                        "Experiment with ±5 minute variations to fine-tune",
                        "Track interruption rates to validate optimal duration"
                    ],
                    "expected_benefit": "Higher focus session completion rate with fewer interruptions",
                    "context_data": {
                        "optimal_duration": median_duration,
                        "sample_size": len(successful_sessions)
                    }
                })
        
        return suggestions
    
    def _generate_pattern_suggestions(
        self,
        activity_patterns: List[Dict],
        focus_sessions: List[Dict]
    ) -> List[Dict]:
        """Generates pattern-based suggestions."""
        suggestions = []
        
        if not activity_patterns:
            return suggestions
        
        # Analyze distraction patterns
        high_distraction_activities = [
            a for a in activity_patterns
            if a.get("distraction_score", 0) > 0.7
        ]
        
        if high_distraction_activities:
            # Find most common distraction
            distraction_types = {}
            for activity in high_distraction_activities:
                category = activity.get("activity_category", "unknown")
                distraction_types[category] = distraction_types.get(category, 0) + 1
            
            if distraction_types:
                top_distraction = max(distraction_types.items(), key=lambda x: x[1])
                
                suggestions.append({
                    "suggestion_type": "distraction_management",
                    "title": f"Manage {top_distraction[0].title()} Distractions",
                    "description": f"You have frequent {top_distraction[0]} distractions during focus time. Consider blocking these during focus sessions.",
                    "rationale": f"Reducing {top_distraction[0]} distractions can significantly improve focus quality.",
                    "priority_score": 0.80,
                    "action_items": [
                        f"Enable focus mode to block {top_distraction[0]} notifications",
                        "Schedule {top_distraction[0]} time during breaks",
                        "Use app blockers during focus sessions"
                    ],
                    "expected_benefit": "40% reduction in distractions during focus sessions",
                    "context_data": {
                        "distraction_type": top_distraction[0],
                        "frequency": top_distraction[1]
                    }
                })
        
        return suggestions


# Export for use in other modules
__all__ = ["SmartSuggestions"]

