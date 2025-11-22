-- Migration: Production-grade schema with users, roles, analytics, streaks, and scoring
-- Extends existing schema with user accounts, task history, analytics, and gamification

-- Users table with authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    cliq_user_id VARCHAR(64) UNIQUE, -- Link to Zoho Cliq if available
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    last_login TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles and permissions
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb, -- Array of permission strings
    created_at TIMESTAMP DEFAULT NOW()
);

-- User roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- Task history with detailed logging
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER, -- References tasks table if exists
    title VARCHAR(255) NOT NULL,
    description TEXT,
    action_type VARCHAR(50) NOT NULL, -- created, updated, completed, deleted, started, paused
    previous_state JSONB, -- Previous task state for updates
    new_state JSONB, -- New task state
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_task_history_user_id (user_id),
    INDEX idx_task_history_created_at (created_at),
    INDEX idx_task_history_action_type (action_type)
);

-- Daily productivity analytics
CREATE TABLE IF NOT EXISTS daily_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_focus_minutes INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    interrupted_sessions INTEGER DEFAULT 0,
    blocked_messages INTEGER DEFAULT 0,
    productivity_score DECIMAL(5, 2) DEFAULT 0.00, -- 0-100
    focus_score DECIMAL(5, 2) DEFAULT 0.00,
    efficiency_score DECIMAL(5, 2) DEFAULT 0.00,
    engagement_score DECIMAL(5, 2) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Weekly analytics summary
CREATE TABLE IF NOT EXISTS weekly_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL, -- Monday of the week
    total_focus_minutes INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    average_productivity_score DECIMAL(5, 2) DEFAULT 0.00,
    trend_data JSONB DEFAULT '{}'::jsonb, -- Day-by-day breakdown
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- Monthly analytics summary
CREATE TABLE IF NOT EXISTS monthly_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    total_focus_minutes INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    average_productivity_score DECIMAL(5, 2) DEFAULT 0.00,
    trend_data JSONB DEFAULT '{}'::jsonb, -- Week-by-week breakdown
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- Active sessions tracking
CREATE TABLE IF NOT EXISTS active_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45), -- IPv6 compatible
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_active_sessions_user_id (user_id),
    INDEX idx_active_sessions_token (session_token),
    INDEX idx_active_sessions_expires (expires_at)
);

-- Focus streaks and gamification
CREATE TABLE IF NOT EXISTS focus_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_start_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, streak_type)
);

-- User scores and achievements
CREATE TABLE IF NOT EXISTS user_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_score INTEGER DEFAULT 0,
    focus_score INTEGER DEFAULT 0,
    productivity_score INTEGER DEFAULT 0,
    consistency_score INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb, -- Array of earned badges
    achievements JSONB DEFAULT '[]'::jsonb, -- Array of achievements
    rank INTEGER, -- User rank among all users
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Score history for trend tracking
CREATE TABLE IF NOT EXISTS score_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score_type VARCHAR(50) NOT NULL, -- overall, focus, productivity, consistency
    score_value INTEGER NOT NULL,
    reason VARCHAR(255), -- Why the score changed
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_score_history_user_id (user_id),
    INDEX idx_score_history_created_at (created_at),
    INDEX idx_score_history_type (score_type)
);

-- Achievements definition
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    points INTEGER DEFAULT 0,
    category VARCHAR(50), -- focus, productivity, consistency, milestone
    requirements JSONB DEFAULT '{}'::jsonb, -- Achievement requirements
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User achievements (many-to-many)
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    progress JSONB DEFAULT '{}'::jsonb, -- Progress towards achievement
    UNIQUE(user_id, achievement_id)
);

-- Activity log for comprehensive tracking
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- login, logout, task_created, session_started, etc.
    activity_category VARCHAR(50), -- authentication, task, session, settings
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_activity_logs_user_id (user_id),
    INDEX idx_activity_logs_type (activity_type),
    INDEX idx_activity_logs_created_at (created_at)
);

-- Update users table to reference focus_sessions properly
ALTER TABLE focus_sessions 
ADD COLUMN IF NOT EXISTS internal_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_cliq_user_id ON users(cliq_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_task_history_user_created ON task_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_user_date ON daily_analytics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_analytics_user_week ON weekly_analytics(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_analytics_user_month ON monthly_analytics(user_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_focus_streaks_user_type ON focus_streaks(user_id, streak_type);
CREATE INDEX IF NOT EXISTS idx_score_history_user_type ON score_history(user_id, score_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Administrator with full access', '["*"]'::jsonb),
('user', 'Standard user', '["tasks:read", "tasks:write", "sessions:read", "sessions:write", "analytics:read"]'::jsonb),
('premium_user', 'Premium user with advanced features', '["tasks:read", "tasks:write", "sessions:read", "sessions:write", "analytics:read", "analytics:advanced", "ai:access"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Insert default achievements
INSERT INTO achievements (code, name, description, points, category) VALUES
('first_session', 'First Steps', 'Complete your first focus session', 10, 'milestone'),
('streak_3', 'On a Roll', 'Maintain a 3-day focus streak', 25, 'consistency'),
('streak_7', 'Week Warrior', 'Maintain a 7-day focus streak', 50, 'consistency'),
('streak_30', 'Month Master', 'Maintain a 30-day focus streak', 200, 'consistency'),
('tasks_10', 'Task Master', 'Complete 10 tasks', 30, 'productivity'),
('tasks_100', 'Century Club', 'Complete 100 tasks', 150, 'productivity'),
('focus_100', 'Century Focus', 'Complete 100 hours of focus time', 200, 'focus'),
('perfect_day', 'Perfect Day', 'Complete all scheduled focus sessions in a day', 50, 'productivity')
ON CONFLICT (code) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_analytics_updated_at BEFORE UPDATE ON daily_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_analytics_updated_at BEFORE UPDATE ON weekly_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_analytics_updated_at BEFORE UPDATE ON monthly_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_focus_streaks_updated_at BEFORE UPDATE ON focus_streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_scores_updated_at BEFORE UPDATE ON user_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

