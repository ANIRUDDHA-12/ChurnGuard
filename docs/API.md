# 📡 ChurnGuard API Documentation

## Overview

ChurnGuard consists of two API services:
- **Node.js Server** (Port 3001) - Main application backend
- **ML Service** (Port 8000) - Machine learning predictions

---

## 🔵 Node.js Server API

Base URL: `http://localhost:3001`

### Authentication
Currently uses demo authentication. Set `X-User-Role` header for role-based access:
- `admin` - Full access
- `operator` - Can create interventions
- `viewer` - Read-only access

---

### Interventions

#### Create Intervention
```http
POST /api/intervene
Content-Type: application/json

{
  "userId": "user-123",
  "actionType": "nudge" | "support" | "offer",
  "metadata": { "reason": "low engagement" }
}
```

**Response:**
```json
{
  "success": true,
  "intervention": {
    "id": "uuid",
    "user_id": "user-123",
    "action_type": "nudge",
    "status": "completed",
    "created_at": "2026-01-17T00:00:00Z"
  }
}
```

---

### Users

#### List All Users with Risk Scores
```http
GET /api/users
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "user_id": "user-123",
      "churn_risk": 0.75,
      "risk_level": "high",
      "total_clicks": 150,
      "support_tickets": 5
    }
  ],
  "count": 100
}
```

---

### Sentinel (Automated Interventions)

#### Get Sentinel Status
```http
GET /api/sentinel/status
```

**Response:**
```json
{
  "enabled": true,
  "dryRun": false,
  "intervalMinutes": 60,
  "lastRun": "2026-01-17T12:00:00Z",
  "stats": {
    "totalScanned": 500,
    "interventionsCreated": 25
  }
}
```

#### Update Sentinel Config
```http
PATCH /api/sentinel/config
Content-Type: application/json

{
  "enabled": true,
  "dryRun": false,
  "intervalMinutes": 30
}
```

#### Trigger Manual Run
```http
POST /api/sentinel/run
```

---

### Analytics

#### Get Intervention Trends
```http
GET /api/analytics/trends
```

**Response:**
```json
{
  "success": true,
  "trends": [
    { "date": "2026-01-15", "interventions": 10, "success_rate": 0.7 },
    { "date": "2026-01-16", "interventions": 15, "success_rate": 0.8 }
  ]
}
```

#### Get ROI by Action Type
```http
GET /api/analytics/roi
```

**Response:**
```json
{
  "success": true,
  "roi": [
    {
      "action": "nudge",
      "count": 50,
      "success_count": 35,
      "estimated_revenue_saved": 17500
    }
  ]
}
```

#### Get Cohort Analysis
```http
GET /api/analytics/cohorts
```

**Response:**
```json
{
  "success": true,
  "cohorts": [
    { "cohort": "0-1 months", "total": 100, "churned": 15, "churn_rate": 0.15 }
  ]
}
```

#### Get Summary Stats
```http
GET /api/analytics/summary
```

---

### Efficacy

#### Get Intervention Success Rates
```http
GET /api/efficacy
```

**Response:**
```json
{
  "success": true,
  "efficacy": {
    "nudge": { "total": 50, "success": 35, "rate": 0.7 },
    "support": { "total": 30, "success": 20, "rate": 0.67 },
    "offer": { "total": 20, "success": 15, "rate": 0.75 }
  }
}
```

---

### Audit Logs

#### Get Audit Logs
```http
GET /api/audit/logs?limit=50&action=intervention_created
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "uuid",
      "action": "intervention_created",
      "actor": "admin",
      "details": { "userId": "user-123" },
      "created_at": "2026-01-17T12:00:00Z"
    }
  ]
}
```

#### Get Audit Summary
```http
GET /api/audit/summary
```

---

### Email

#### Preview Email Template
```http
GET /api/email/preview/:actionType
```
Action types: `nudge`, `support`, `offer`

#### Send Email
```http
POST /api/email/send
Content-Type: application/json

{
  "userId": "user-123",
  "actionType": "nudge",
  "userData": { "name": "John", "email": "john@example.com" }
}
```

---

### Roles

#### Get All Roles
```http
GET /api/roles
```

#### Get Role Info
```http
GET /api/role/:roleName
```

---

## 🟢 ML Service API

Base URL: `http://localhost:8000`

### Health Check
```http
GET /health
```

---

### Predictions

#### Single Prediction
```http
POST /predict
Content-Type: application/json

{
  "total_clicks": 150,
  "avg_session_time": 5.5,
  "support_tickets": 3,
  "days_since_signup": 90,
  "feature_usage_score": 45
}
```

**Response:**
```json
{
  "churn_probability": 0.72,
  "risk_level": "high",
  "recommendation": "offer",
  "top_factors": [
    { "feature": "support_tickets", "importance": 0.35 },
    { "feature": "feature_usage_score", "importance": 0.28 }
  ]
}
```

#### Batch Prediction
```http
POST /predict/batch
Content-Type: application/json

{
  "users": [
    { "total_clicks": 150, ... },
    { "total_clicks": 500, ... }
  ]
}
```

---

### User Segments

#### Get User Segments
```http
GET /segments
```

**Response:**
```json
{
  "success": true,
  "total_users": 500,
  "segments": [
    { "segment": "power_users", "count": 50, "percentage": 10 },
    { "segment": "at_risk", "count": 75, "percentage": 15 },
    { "segment": "dormant", "count": 100, "percentage": 20 }
  ]
}
```

---

### Model Management

#### Feature Drift Detection
```http
GET /model/drift
```

**Response:**
```json
{
  "success": true,
  "drift_detected": true,
  "alerts": [
    {
      "feature": "support_tickets",
      "severity": "high",
      "deviation": 2.5
    }
  ]
}
```

#### Trigger Model Retrain
```http
POST /model/retrain
```

#### Get Retrain Status
```http
GET /model/retrain/status
```

---

### Model Info
```http
GET /model/info
```

**Response:**
```json
{
  "model_version": "1.0.0",
  "algorithm": "XGBoost",
  "trained_at": "2026-01-15T00:00:00Z",
  "features": ["total_clicks", "avg_session_time", ...]
}
```

---

## 🔔 WebSocket Events

Connect to `ws://localhost:3001` via Socket.IO

### Events Emitted by Server

| Event | Description | Payload |
|-------|-------------|---------|
| `INTERVENTION_RECORDED` | New intervention created | `{ userId, actionType, timestamp }` |
| `SENTINEL_ACTIVITY` | Sentinel action | `{ type, userId, action, timestamp }` |
| `OPTIMIZER_UPDATE` | Efficacy updated | `{ outcomes }` |
| `PRIORITY_QUEUE_UPDATE` | User flagged | `{ userId, priority }` |

### Events to Emit

| Event | Description | Payload |
|-------|-------------|---------|
| `USER_ACTION` | Track user action | `{ action, timestamp }` |

---

## 📊 Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request - Invalid parameters |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal error |

---

## 🔐 Rate Limits

Currently no rate limits in development mode. For production, implement:
- 100 requests/minute for standard endpoints
- 10 requests/minute for `/predict` endpoints
- 1 request/hour for `/model/retrain`
