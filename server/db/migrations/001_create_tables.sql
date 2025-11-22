-- Migration: 001_create_tables.sql
-- Create foundational tables for FocusFlow
-- Date: 2024
-- Description: Initial database schema with core tables for focus sessions, user modes, and OAuth

-- Focus Modes: Predefined focus modes with durations
CREATE TABLE IF NOT EXISTS focus_modes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    slug VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Focus Sessions: Tracks individual focus sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    mode_label VARCHAR(64) NOT NULL,
    duration_minutes INTEGER,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expected_end TIMESTAMP,
    ended_at TIMESTAMP,
    interruption_count INTEGER DEFAULT 0,
    notes TEXT
);

-- Indexes for focus_sessions
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_ended_at ON focus_sessions(ended_at);

-- Missed Messages: Messages received during focus mode (legacy table)
CREATE TABLE IF NOT EXISTS missed_messages (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(80) NOT NULL,
    sender VARCHAR(80) NOT NULL,
    preview TEXT,
    delivered_at TIMESTAMP DEFAULT NOW()
);

-- User Modes: Current mode state for each user
CREATE TABLE IF NOT EXISTS user_modes (
    user_id VARCHAR(64) PRIMARY KEY,
    current_mode VARCHAR(32) NOT NULL,
    session_id INTEGER REFERENCES focus_sessions(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_modes_current_mode ON user_modes(current_mode);

-- Mode Transitions: History of mode changes
CREATE TABLE IF NOT EXISTS mode_transitions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    previous_mode VARCHAR(32),
    next_mode VARCHAR(32) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mode_transitions_user_id ON mode_transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_mode_transitions_created_at ON mode_transitions(created_at DESC);

-- Blocked Messages: Messages blocked during focus sessions
CREATE TABLE IF NOT EXISTS blocked_messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    session_id INTEGER REFERENCES focus_sessions(id) ON DELETE CASCADE,
    channel_id VARCHAR(80),
    message_preview TEXT,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_messages_user_id ON blocked_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_messages_session_id ON blocked_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_blocked_messages_created_at ON blocked_messages(created_at DESC);

-- Conversation Logs: Activity logs for conversations and interactions
CREATE TABLE IF NOT EXISTS conversation_logs (
    id SERIAL PRIMARY KEY,
    cliq_user_id VARCHAR(64),
    channel_id VARCHAR(128),
    action_type VARCHAR(64) NOT NULL,
    message_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_logs_user ON conversation_logs(cliq_user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_channel ON conversation_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_action_type ON conversation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created_at ON conversation_logs(created_at DESC);

-- OAuth Credentials: Encrypted OAuth tokens for Zoho Cliq integration
CREATE TABLE IF NOT EXISTS oauth_credentials (
    cliq_user_id VARCHAR(64) PRIMARY KEY,
    zoho_user_id VARCHAR(128),
    zoho_email VARCHAR(255),
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT,
    token_type VARCHAR(32),
    scope TEXT,
    expires_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_credentials_zoho_user_id ON oauth_credentials(zoho_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_credentials_expires_at ON oauth_credentials(expires_at);

-- Audit Events: System-wide audit trail
CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(120) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_event_name ON audit_events(event_name);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);
