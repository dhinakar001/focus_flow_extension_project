"""
AI Focus Coach - Generates focus plans and task summaries
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json


class FocusCoach:
    """
    AI-powered focus coach that:
    - Summarizes tasks
    - Generates personalized focus plans
    - Provides focus strategies
    """
    
    def __init__(self, openai_client=None):
        self.openai_client = openai_client
        self.model_version = "v1.0"
    
    def summarize_tasks(self, tasks: List[Dict]) -> Dict:
        """
        Summarizes a list of tasks into a concise overview.
        
        Args:
            tasks: List of task dictionaries with title, description, priority, etc.
        
        Returns:
            Dictionary with summary, categories, priorities breakdown
        """
        if not tasks:
            return {
                "summary": "No tasks to summarize.",
                "total_tasks": 0,
                "categories": {},
                "priority_breakdown": {}
            }
        
        # Categorize tasks
        categories = {}
        priority_breakdown = {"urgent": 0, "high": 0, "medium": 0, "low": 0}
        total_estimated_minutes = 0
        
        for task in tasks:
            # Category extraction (from tags or description)
            category = task.get("category", "general")
            if category not in categories:
                categories[category] = []
            categories[category].append(task.get("title", ""))
            
            # Priority breakdown
            priority = task.get("priority", "medium").lower()
            priority_breakdown[priority] = priority_breakdown.get(priority, 0) + 1
            
            # Time estimation
            estimated = task.get("estimated_minutes", 0) or task.get("duration_minutes", 0)
            total_estimated_minutes += estimated
        
        # Generate AI summary if OpenAI client is available
        summary = self._generate_ai_summary(tasks, categories, priority_breakdown)
        
        return {
            "summary": summary,
            "total_tasks": len(tasks),
            "categories": {k: len(v) for k, v in categories.items()},
            "priority_breakdown": priority_breakdown,
            "total_estimated_minutes": total_estimated_minutes,
            "average_task_minutes": total_estimated_minutes / len(tasks) if tasks else 0,
            "model_version": self.model_version
        }
    
    def generate_focus_plan(
        self,
        tasks: List[Dict],
        user_preferences: Optional[Dict] = None,
        available_hours: Optional[int] = None
    ) -> Dict:
        """
        Generates a personalized focus plan based on tasks and user preferences.
        
        Args:
            tasks: List of tasks to include in the plan
            user_preferences: User preferences (peak hours, preferred duration, etc.)
            available_hours: Available hours for focus (defaults to 8)
        
        Returns:
            Dictionary with focus plan including schedule, strategy, and recommendations
        """
        if not tasks:
            return {
                "error": "No tasks provided for focus plan generation"
            }
        
        user_prefs = user_preferences or {}
        available_hours = available_hours or 8
        available_minutes = available_hours * 60
        
        # Sort tasks by priority and estimated time
        sorted_tasks = self._prioritize_tasks(tasks)
        
        # Generate schedule
        schedule = self._generate_schedule(
            sorted_tasks,
            available_minutes,
            user_prefs
        )
        
        # Generate focus strategy
        strategy = self._generate_focus_strategy(
            sorted_tasks,
            user_prefs,
            schedule
        )
        
        # Calculate total time
        total_minutes = sum(
            task.get("estimated_minutes", 30) 
            for task in schedule["task_schedule"]
        )
        
        return {
            "plan_type": "daily",
            "title": f"Focus Plan for {datetime.now().strftime('%B %d, %Y')}",
            "description": f"AI-generated focus plan with {len(tasks)} tasks",
            "tasks_summary": self.summarize_tasks(tasks),
            "recommended_schedule": schedule,
            "focus_strategy": strategy,
            "estimated_total_minutes": total_minutes,
            "status": "draft",
            "created_at": datetime.now().isoformat(),
            "model_version": self.model_version
        }
    
    def _prioritize_tasks(self, tasks: List[Dict]) -> List[Dict]:
        """Prioritizes tasks based on priority, due date, and dependencies."""
        priority_order = {"urgent": 4, "high": 3, "medium": 2, "low": 1}
        
        def task_score(task):
            priority = task.get("priority", "medium").lower()
            due_date = task.get("due_date")
            days_until_due = None
            
            if due_date:
                try:
                    due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                    days_until_due = (due - datetime.now(due.tzinfo)).days
                except:
                    pass
            
            base_score = priority_order.get(priority, 2)
            
            # Add urgency based on due date
            if days_until_due is not None:
                if days_until_due < 0:
                    base_score += 3  # Overdue
                elif days_until_due == 0:
                    base_score += 2  # Due today
                elif days_until_due <= 1:
                    base_score += 1  # Due tomorrow
            
            return base_score
        
        return sorted(tasks, key=task_score, reverse=True)
    
    def _generate_schedule(
        self,
        tasks: List[Dict],
        available_minutes: int,
        user_prefs: Dict
    ) -> Dict:
        """Generates a time-based schedule for tasks."""
        schedule = []
        current_time = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        peak_hours = user_prefs.get("peak_productivity_hours", [9, 10, 11, 14, 15, 16])
        
        total_scheduled = 0
        
        for i, task in enumerate(tasks):
            estimated = task.get("estimated_minutes", 30)
            
            if total_scheduled + estimated > available_minutes:
                break
            
            # Schedule during peak hours if possible
            current_hour = current_time.hour
            if current_hour not in peak_hours and i > 0:
                # Find next peak hour
                next_peak = min([h for h in peak_hours if h > current_hour], default=peak_hours[0])
                current_time = current_time.replace(hour=next_peak, minute=0)
            
            schedule.append({
                "task_id": task.get("id"),
                "title": task.get("title"),
                "scheduled_time": current_time.isoformat(),
                "estimated_minutes": estimated,
                "priority": task.get("priority", "medium"),
                "order": i + 1
            })
            
            current_time += timedelta(minutes=estimated + 5)  # 5 min buffer
            total_scheduled += estimated
        
        return {
            "task_schedule": schedule,
            "start_time": schedule[0]["scheduled_time"] if schedule else None,
            "end_time": schedule[-1]["scheduled_time"] if schedule else None,
            "total_scheduled_minutes": total_scheduled
        }
    
    def _generate_focus_strategy(
        self,
        tasks: List[Dict],
        user_prefs: Dict,
        schedule: Dict
    ) -> str:
        """Generates AI-powered focus strategy recommendations."""
        strategies = []
        
        # Time-based strategy
        high_priority_count = sum(
            1 for task in tasks 
            if task.get("priority", "medium").lower() in ["urgent", "high"]
        )
        
        if high_priority_count > len(tasks) * 0.5:
            strategies.append(
                "Focus on high-priority tasks first during your peak productivity hours."
            )
        else:
            strategies.append(
                "Distribute focus sessions evenly throughout the day with strategic breaks."
            )
        
        # Duration-based strategy
        avg_duration = sum(
            task.get("estimated_minutes", 30) for task in tasks
        ) / len(tasks) if tasks else 30
        
        if avg_duration > 60:
            strategies.append(
                "Consider breaking down longer tasks into focused 50-minute sessions with 10-minute breaks."
            )
        
        # Distraction strategy
        preferred_duration = user_prefs.get("preferred_focus_duration", 50)
        strategies.append(
            f"Schedule {preferred_duration}-minute focus blocks aligned with your natural rhythm."
        )
        
        return " ".join(strategies)
    
    def _generate_ai_summary(
        self,
        tasks: List[Dict],
        categories: Dict,
        priority_breakdown: Dict
    ) -> str:
        """Generates AI-powered task summary using OpenAI if available."""
        if not self.openai_client:
            # Fallback to rule-based summary
            total = len(tasks)
            urgent = priority_breakdown.get("urgent", 0)
            high = priority_breakdown.get("high", 0)
            
            summary = f"You have {total} tasks to complete. "
            
            if urgent > 0:
                summary += f"{urgent} urgent task(s) require immediate attention. "
            
            if high > 0:
                summary += f"{high} high-priority task(s) should be prioritized. "
            
            summary += f"Tasks are distributed across {len(categories)} categories."
            return summary
        
        # Use OpenAI for better summary
        try:
            task_list = "\n".join([
                f"- {t.get('title', 'Untitled')} ({t.get('priority', 'medium')} priority)"
                for t in tasks[:10]  # Limit to 10 for token efficiency
            ])
            
            prompt = f"""Summarize the following tasks in a concise, actionable format:
            
{task_list}

Provide a brief summary focusing on priorities and key actions needed."""
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "You are a productivity coach helping users understand their tasks."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error generating AI summary: {e}")
            return self._generate_ai_summary(None, categories, priority_breakdown)  # Fallback


# Export for use in other modules
__all__ = ["FocusCoach"]

