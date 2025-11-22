-- Migration: SaaS Subscription and Payment Schema
-- Converts FocusFlow into a SaaS product with subscription plans, payments, and feature gating

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- free, pro, enterprise
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) DEFAULT 0.00,
    price_yearly DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    features JSONB DEFAULT '{}'::jsonb, -- Feature flags for this plan
    limits JSONB DEFAULT '{}'::jsonb, -- Usage limits (sessions_per_month, tasks_per_month, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Default plan for new users
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, canceled, expired, trial, past_due
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
    started_at TIMESTAMP DEFAULT NOW(),
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    canceled_at TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    razorpay_subscription_id VARCHAR(255) UNIQUE,
    payment_provider VARCHAR(50) DEFAULT 'stripe', -- stripe, razorpay
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_subscriptions_user_id (user_id),
    INDEX idx_user_subscriptions_status (status),
    INDEX idx_user_subscriptions_stripe (stripe_subscription_id),
    INDEX idx_user_subscriptions_razorpay (razorpay_subscription_id)
);

-- Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, refunded
    payment_provider VARCHAR(50) NOT NULL, -- stripe, razorpay
    provider_transaction_id VARCHAR(255) UNIQUE,
    provider_payment_intent_id VARCHAR(255),
    payment_method VARCHAR(50), -- card, bank_transfer, wallet
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    failure_reason TEXT,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_payment_transactions_user_id (user_id),
    INDEX idx_payment_transactions_status (status),
    INDEX idx_payment_transactions_provider (provider_transaction_id)
);

-- Payment Methods (Stored cards, etc.)
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_provider VARCHAR(50) NOT NULL, -- stripe, razorpay
    provider_method_id VARCHAR(255) NOT NULL UNIQUE, -- Stripe payment method ID, Razorpay token ID
    type VARCHAR(50) NOT NULL, -- card, bank_account, wallet
    card_brand VARCHAR(50), -- visa, mastercard, etc.
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_payment_methods_user_id (user_id),
    INDEX idx_payment_methods_provider (provider_method_id)
);

-- Subscription Usage Tracking
CREATE TABLE IF NOT EXISTS subscription_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    usage_type VARCHAR(100) NOT NULL, -- sessions, tasks, ai_requests, storage_mb
    usage_count INTEGER DEFAULT 0,
    usage_period_start TIMESTAMP NOT NULL,
    usage_period_end TIMESTAMP NOT NULL,
    limit_value INTEGER, -- Plan limit for this usage type
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, subscription_id, usage_type, usage_period_start),
    INDEX idx_subscription_usage_user_id (user_id),
    INDEX idx_subscription_usage_type (usage_type)
);

-- Feature Flags (for A/B testing and feature rollouts)
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    target_plans JSONB DEFAULT '[]'::jsonb, -- Plans that have access to this feature
    rollout_percentage INTEGER DEFAULT 0, -- 0-100 for gradual rollout
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Records
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    transaction_id INTEGER REFERENCES payment_transactions(id),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, overdue, void
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    pdf_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_invoices_user_id (user_id),
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_invoice_number (invoice_number)
);

-- Admin Users (separate from regular users for admin dashboard)
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]'::jsonb, -- Admin-specific permissions
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_manage_subscriptions BOOLEAN DEFAULT FALSE,
    can_manage_payments BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Webhook Events (for payment provider webhooks)
CREATE TABLE IF NOT EXISTS webhook_events (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL, -- stripe, razorpay
    event_type VARCHAR(100) NOT NULL,
    provider_event_id VARCHAR(255) UNIQUE,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_webhook_events_provider (provider),
    INDEX idx_webhook_events_processed (processed)
);

-- Add subscription plan reference to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_subscription_id INTEGER REFERENCES user_subscriptions(id);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, currency, features, limits, is_default, sort_order) VALUES
(
    'free',
    'Free',
    'Perfect for getting started with basic productivity features',
    0.00,
    0.00,
    'USD',
    '{"focus_timer": true, "basic_analytics": true, "task_management": true, "ai_features": false, "advanced_analytics": false, "custom_integrations": false, "priority_support": false}'::jsonb,
    '{"sessions_per_month": 50, "tasks_per_month": 100, "ai_requests_per_month": 0, "storage_mb": 100}'::jsonb,
    true,
    1
),
(
    'pro',
    'Pro',
    'For professionals who need advanced features and analytics',
    9.99,
    99.99,
    'USD',
    '{"focus_timer": true, "basic_analytics": true, "task_management": true, "ai_features": true, "advanced_analytics": true, "custom_integrations": true, "priority_support": true}'::jsonb,
    '{"sessions_per_month": -1, "tasks_per_month": -1, "ai_requests_per_month": 1000, "storage_mb": 1000}'::jsonb,
    false,
    2
)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, is_default);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period ON user_subscriptions(current_period_start, current_period_end);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON subscription_usage(usage_period_start, usage_period_end);

-- Function to create default free subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id INTEGER;
BEGIN
    SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'free' AND is_active = TRUE LIMIT 1;
    
    IF free_plan_id IS NOT NULL THEN
        INSERT INTO user_subscriptions (
            user_id,
            plan_id,
            status,
            current_period_start,
            current_period_end
        ) VALUES (
            NEW.id,
            free_plan_id,
            'active',
            NOW(),
            NOW() + INTERVAL '1 month'
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create default subscription when user is created
CREATE TRIGGER create_user_default_subscription
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subscription();

-- Update triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_usage_updated_at BEFORE UPDATE ON subscription_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

