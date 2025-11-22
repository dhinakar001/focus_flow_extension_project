# FocusFlow API Documentation

Complete API reference for the FocusFlow productivity dashboard backend.

---

## Base URL

```
Production: https://api.focusflow.app
Development: http://localhost:4000
```

---

## Authentication

Most endpoints require authentication via JWT tokens.

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Getting an Access Token

**POST** `/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "stack": "..." // Only in development
  }
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Login

**POST** `/auth/login`

Authenticate a user and receive access tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

---

### Refresh Token

**POST** `/auth/refresh`

Refresh an expired access token using a refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

---

### Get Current User

**GET** `/auth/me`

Get the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription": {
      "plan": "pro",
      "status": "active"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Focus Mode Endpoints

### List Available Modes

**GET** `/modes`

Get all available focus modes.

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Deep Work",
      "slug": "deep-work",
      "description": "Intensive focus session",
      "durationMinutes": 90
    },
    {
      "id": 2,
      "name": "Quick Focus",
      "slug": "quick-focus",
      "description": "Short focused session",
      "durationMinutes": 25
    }
  ]
}
```

---

### Create Mode

**POST** `/modes`

Create a new focus mode (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "name": "Deep Work",
  "slug": "deep-work",
  "description": "Intensive focus session",
  "durationMinutes": 90
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Deep Work",
    "slug": "deep-work",
    "description": "Intensive focus session",
    "durationMinutes": 90
  }
}
```

---

### Start Focus Mode

**POST** `/modes/start`

Start a focus session for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "userId": "user-123",
  "durationMinutes": 90
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "state": {
      "userId": "user-123",
      "currentMode": "focus",
      "sessionId": 456,
      "updatedAt": "2024-01-01T12:00:00.000Z"
    },
    "session": {
      "id": 456,
      "startedAt": "2024-01-01T12:00:00.000Z",
      "mode": "focus",
      "expectedEnd": "2024-01-01T13:30:00.000Z"
    },
    "alreadyActive": false
  }
}
```

---

### Stop Focus Mode

**POST** `/modes/stop`

Stop the current focus session for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "userId": "user-123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "summary": {
      "session": { ... },
      "metrics": {
        "actualDurationMinutes": 85,
        "interruptions": 2,
        "blockedMessages": 5
      }
    },
    "state": {
      "userId": "user-123",
      "currentMode": "break",
      "sessionId": null
    }
  }
}
```

---

### Get Current Mode

**GET** `/modes/current/:userId?`

Get the current mode state for a user.

**Headers:** `Authorization: Bearer <token>` (optional)

**Query Parameters:**
- `userId` - User ID (optional, uses authenticated user if not provided)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "currentMode": "focus",
    "sessionId": 456,
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "session": {
      "id": 456,
      "startedAt": "2024-01-01T12:00:00.000Z",
      "mode": "focus",
      "expectedEnd": "2024-01-01T13:30:00.000Z"
    }
  }
}
```

---

### Get Mode Summary

**GET** `/modes/summary/:userId?`

Get mode summary with statistics for a user.

**Headers:** `Authorization: Bearer <token>` (optional)

**Query Parameters:**
- `userId` - User ID (optional, uses authenticated user if not provided)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "activeSession": {
      "id": 456,
      "mode_label": "focus",
      "started_at": "2024-01-01T12:00:00.000Z",
      "expected_end": "2024-01-01T13:30:00.000Z"
    },
    "recentSessions": [
      {
        "id": 456,
        "mode_label": "focus",
        "started_at": "2024-01-01T12:00:00.000Z",
        "ended_at": "2024-01-01T13:30:00.000Z",
        "interruption_count": 2
      }
    ],
    "blockedMessagesLast7Days": 15
  }
}
```

---

## Analytics Endpoints

### Get Daily Analytics

**GET** `/analytics/daily`

Get daily productivity analytics for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `date` - Date in YYYY-MM-DD format (optional, defaults to today)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "date": "2024-01-01",
    "userId": "user-123",
    "focusScore": 85,
    "distractionScore": 12,
    "completionScore": 92,
    "consistencyScore": 78,
    "sessionCount": 5,
    "totalMinutes": 450,
    "interruptions": 8,
    "blockedMessages": 12
  }
}
```

---

### Get Weekly Analytics

**GET** `/analytics/weekly`

Get weekly productivity analytics for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `week` - Week start date in YYYY-MM-DD format (optional, defaults to current week)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "weekStart": "2024-01-01",
    "weekEnd": "2024-01-07",
    "userId": "user-123",
    "averageFocusScore": 82,
    "averageDistractionScore": 15,
    "totalSessions": 35,
    "totalMinutes": 3150,
    "totalInterruptions": 56,
    "totalBlockedMessages": 84,
    "dailyTrends": [ ... ]
  }
}
```

---

### Get Monthly Analytics

**GET** `/analytics/monthly`

Get monthly productivity analytics for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `month` - Month in YYYY-MM format (optional, defaults to current month)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "month": "2024-01",
    "userId": "user-123",
    "averageFocusScore": 80,
    "totalSessions": 150,
    "totalMinutes": 13500,
    "weeklyTrends": [ ... ]
  }
}
```

---

## Subscription Endpoints

### Get Current Subscription

**GET** `/subscription/current`

Get the current subscription for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "sub-123",
    "userId": "user-123",
    "planId": "pro-monthly",
    "planName": "Pro",
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-02-01T00:00:00.000Z",
    "autoRenew": true
  }
}
```

---

### List Available Plans

**GET** `/subscription/plans`

Get all available subscription plans.

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "free",
      "name": "Free",
      "description": "Basic features",
      "price": 0,
      "currency": "USD",
      "duration": "unlimited",
      "features": ["Basic focus modes", "Daily analytics"]
    },
    {
      "id": "pro-monthly",
      "name": "Pro",
      "description": "All features",
      "price": 9.99,
      "currency": "USD",
      "duration": "monthly",
      "features": ["All focus modes", "Advanced analytics", "AI features", "Priority support"]
    }
  ]
}
```

---

### Upgrade Subscription

**POST** `/subscription/upgrade`

Upgrade to a different subscription plan.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "planId": "pro-monthly"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/...",
    "subscription": { ... }
  }
}
```

---

## Bot Endpoints

### Bot Ping

**POST** `/bot/ping`

Health check endpoint for Zoho Cliq bot.

**Request Body:**

```json
{
  "challenge": "challenge-token"
}
```

**Response:** `200 OK`

```json
{
  "challenge": "challenge-token"
}
```

---

### Handle Slash Command

**POST** `/bot/slash`

Handle slash command invocations from Zoho Cliq.

**Request Body:**

```json
{
  "command": "/focusflow",
  "text": "mode start deep-work",
  "user": {
    "id": "user-123",
    "name": "John Doe"
  },
  "response_url": "https://cliq.zoho.com/..."
}
```

**Response:** `200 OK`

```json
{
  "status": "processed"
}
```

---

## Admin Endpoints

All admin endpoints require admin role.

### Get Dashboard Stats

**GET** `/admin/dashboard`

Get admin dashboard statistics.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "activeUsers": 850,
    "totalSessions": 15000,
    "totalRevenue": 12500.00,
    "subscriptionStats": {
      "free": 800,
      "pro": 450
    }
  }
}
```

---

### List Users

**GET** `/admin/users`

List all users with pagination.

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search term (optional)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "users": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1250,
      "pages": 63
    }
  }
}
```

---

## Webhook Endpoints

### Stripe Webhook

**POST** `/payment/webhooks/stripe`

Handle Stripe payment webhooks.

**Headers:**
- `Stripe-Signature` - Stripe webhook signature

**Response:** `200 OK`

---

### Razorpay Webhook

**POST** `/payment/webhooks/razorpay`

Handle Razorpay payment webhooks.

**Headers:**
- `X-Razorpay-Signature` - Razorpay webhook signature

**Response:** `200 OK`

---

## Health Check

### Health Check

**GET** `/health`

Check server health status.

**Response:** `200 OK`

```json
{
  "status": "ok",
  "service": "FocusFlow",
  "version": "2.0.0",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

---

## Rate Limiting

API requests are rate-limited:

- **General endpoints:** 100 requests per 15 minutes per IP
- **Authentication endpoints:** 10 requests per 15 minutes per IP
- **Admin endpoints:** 50 requests per 15 minutes per IP

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1633024800
```

---

## Error Codes

Common error codes:

- `ERR_INVALID_TOKEN` - Invalid or expired JWT token
- `ERR_UNAUTHORIZED` - Authentication required
- `ERR_FORBIDDEN` - Insufficient permissions
- `ERR_NOT_FOUND` - Resource not found
- `ERR_VALIDATION` - Request validation failed
- `ERR_DUPLICATE` - Resource already exists
- `ERR_RATE_LIMIT` - Rate limit exceeded
- `ERR_INTERNAL_SERVER_ERROR` - Internal server error

---

## Changelog

### Version 2.0.0 (2024-01-01)

- Added JWT-based authentication
- Added subscription management
- Added payment integration (Stripe/Razorpay)
- Added comprehensive analytics endpoints
- Added admin dashboard endpoints
- Enhanced error handling
- Improved API documentation

---

**Last Updated:** 2024-01-01  
**API Version:** 2.0.0

