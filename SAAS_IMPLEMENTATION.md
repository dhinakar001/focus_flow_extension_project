# FocusFlow SaaS Implementation Guide

## ✅ Complete SaaS Conversion

FocusFlow has been converted into a full SaaS product with subscription management, payment integration, and admin dashboard.

---

## 🎯 Features Implemented

### 1. ✅ JWT-Based Authentication
- User registration and login
- JWT access tokens and refresh tokens
- Token verification middleware
- Password hashing with bcrypt
- Email verification
- Password reset

### 2. ✅ Subscription Plans
- Free Plan (default)
- Pro Plan
- Plan-based feature gating
- Usage limits per plan
- Plan upgrade/downgrade

### 3. ✅ Feature Locking
- Feature access checking middleware
- Usage limit enforcement
- Plan-based feature availability
- Usage tracking

### 4. ✅ Payment Integration
- Stripe integration
- Razorpay integration
- Checkout session creation
- Webhook handling
- Payment verification
- Subscription billing

### 5. ✅ Admin Dashboard
- User management
- Subscription management
- Payment transaction tracking
- Analytics overview
- Plan management

---

## 📁 Files Created/Modified

### Database Schema
- `server/db/migrations/004_saas_schema.sql` - Complete SaaS schema

### Services
- `server/services/subscriptionService.js` - Subscription management
- `server/services/paymentService.js` - Payment processing (Stripe/Razorpay)

### Middleware
- `server/middlewares/authMiddleware.js` - JWT authentication (updated)
- `server/middlewares/featureGate.js` - Feature gating

### Controllers
- `server/controllers/subscriptionController.js` - Subscription endpoints
- `server/controllers/adminController.js` - Admin endpoints
- `server/controllers/userController.js` - User/auth endpoints

### Routes
- `server/routes/subscription.js` - Subscription routes
- `server/routes/payment.js` - Payment webhooks
- `server/routes/admin.js` - Admin routes
- `server/routes/auth.js` - Authentication routes (updated)

### Configuration
- `package.json` - Added Stripe and Razorpay dependencies

---

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user profile
- `PATCH /auth/me` - Update profile
- `POST /auth/change-password` - Change password
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/verify-email/:token` - Verify email
- `POST /auth/logout` - Logout

### Subscriptions
- `GET /subscription/my-subscription` - Get current subscription
- `GET /subscription/plans` - Get available plans
- `GET /subscription/usage` - Get usage summary
- `GET /subscription/features/:featureName` - Check feature access
- `POST /subscription/checkout` - Create checkout session
- `POST /subscription/verify` - Verify payment
- `POST /subscription/cancel` - Cancel subscription
- `POST /subscription/resume` - Resume canceled subscription

### Admin
- `GET /admin/dashboard/stats` - Dashboard statistics
- `GET /admin/users` - List users
- `GET /admin/users/:userId` - Get user details
- `PATCH /admin/users/:userId/status` - Update user status
- `GET /admin/subscriptions` - List subscriptions
- `GET /admin/transactions` - List payment transactions
- `GET /admin/analytics` - Analytics overview
- `PATCH /admin/plans/:planId` - Update plan

### Payments (Webhooks)
- `POST /payment/webhooks/stripe` - Stripe webhook
- `POST /payment/webhooks/razorpay` - Razorpay webhook

---

## 💳 Subscription Plans

### Free Plan
- **Price**: $0/month
- **Features**:
  - Focus timer
  - Basic analytics
  - Task management
- **Limits**:
  - 50 sessions/month
  - 100 tasks/month
  - 0 AI requests/month
  - 100 MB storage

### Pro Plan
- **Price**: $9.99/month or $99.99/year
- **Features**:
  - All Free features
  - AI features
  - Advanced analytics
  - Custom integrations
  - Priority support
- **Limits**:
  - Unlimited sessions
  - Unlimited tasks
  - 1,000 AI requests/month
  - 1 GB storage

---

## 🔐 Feature Gating

### Using Feature Gates

```javascript
// In routes
const { requireFeature, requireUsageLimit } = require('../middlewares/featureGate');

// Require feature access
router.post('/ai/generate', 
  authenticate, 
  requireFeature('ai_features'), 
  aiController.generate
);

// Require usage limit
router.post('/sessions/start',
  authenticate,
  requireUsageLimit('sessions_per_month'),
  async (req, res, next) => {
    // Track usage after successful action
    await trackUsage(req.user.userId, 'sessions_per_month', 1);
    next();
  },
  sessionController.start
);
```

---

## 💰 Payment Integration

### Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Default provider
DEFAULT_PAYMENT_PROVIDER=stripe
```

### Creating Checkout Session

```javascript
// Frontend call
POST /subscription/checkout
{
  "planName": "pro",
  "billingCycle": "monthly",
  "paymentProvider": "stripe"
}

// Response
{
  "success": true,
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/...",
    "provider": "stripe"
  }
}

// Redirect user to url for payment
```

### Webhook Handling

Both Stripe and Razorpay webhooks are automatically handled:
- Subscription created/updated
- Payment succeeded/failed
- Subscription canceled

---

## 👤 Admin Dashboard

### Getting Started

1. Create admin user:
```sql
INSERT INTO admin_users (user_id, can_manage_users, can_manage_subscriptions, can_manage_payments)
VALUES (1, true, true, true);
```

2. Access admin endpoints:
```bash
GET /admin/dashboard/stats
Authorization: Bearer <admin_jwt_token>
```

---

## 📊 Database Schema

### Key Tables

1. **users** - User accounts
2. **subscription_plans** - Available plans
3. **user_subscriptions** - User subscriptions
4. **payment_transactions** - Payment records
5. **payment_methods** - Stored payment methods
6. **subscription_usage** - Usage tracking
7. **invoices** - Invoice records
8. **admin_users** - Admin access
9. **webhook_events** - Webhook logs

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Migrations

```bash
psql -U postgres -d focusflow -f server/db/migrations/003_production_schema.sql
psql -U postgres -d focusflow -f server/db/migrations/004_saas_schema.sql
```

### 3. Configure Environment

```env
# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay (optional)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

### 4. Start Server

```bash
npm run dev
```

---

## 🧪 Testing

### Register User

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Get Subscription

```bash
curl http://localhost:4000/subscription/my-subscription \
  -H "Authorization: Bearer <token>"
```

### Create Checkout

```bash
curl -X POST http://localhost:4000/subscription/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "planName": "pro",
    "billingCycle": "monthly",
    "paymentProvider": "stripe"
  }'
```

---

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcrypt (12 rounds)
- Rate limiting (configured in middleware)
- CORS protection
- Helmet.js security headers
- Input validation
- SQL injection prevention (parameterized queries)

---

## 📈 Next Steps

1. **Email Service**: Implement email sending for verification and notifications
2. **Invoice Generation**: Generate PDF invoices
3. **Usage Dashboards**: Frontend components for usage tracking
4. **Plan Comparison**: UI for comparing plans
5. **Trial Periods**: Add trial support for Pro plan
6. **Coupons/Discounts**: Add discount code support

---

**Status**: ✅ Complete  
**Last Updated**: 2024  
**Version**: 2.0.0 (SaaS)

