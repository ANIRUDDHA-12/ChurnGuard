# 🛡️ ChurnGuard - Real-Time Churn Prevention System

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow.svg)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

ChurnGuard is an intelligent, real-time customer churn prevention platform that combines machine learning with automated intervention strategies to retain at-risk customers.

![ChurnGuard Dashboard](docs/dashboard-preview.png)

## ✨ Features

### 🎯 Core Capabilities
- **ML-Powered Risk Scoring** - XGBoost model predicts churn probability in real-time
- **Automated Sentinel** - Scans and flags at-risk users automatically
- **Tiered Interventions** - Nudge, Support, and Offer strategies based on risk level
- **Self-Optimizing Loop** - Tracks intervention efficacy and learns from outcomes

### 📊 Analytics & Insights
- **Trend Charts** - Visualize churn rates over time
- **ROI Calculator** - Track revenue saved per intervention type
- **Cohort Analysis** - Understand churn by signup period
- **User Segmentation** - Power Users, At-Risk, Dormant, etc.

### 🏢 Enterprise Features
- **Role-Based Access Control** - Admin, Operator, Viewer roles
- **Audit Logging** - Track all system actions
- **Feature Drift Detection** - Alert when data patterns change
- **Configurable Settings** - Risk thresholds, LTV, intervals

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase account (for database)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/ChurnGuard-RealTime.git
cd ChurnGuard-RealTime
```

### 2. Setup Server
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

### 3. Setup ML Service
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase credentials
uvicorn main:app --reload --port 8000
```

### 4. Setup Client
```bash
cd client
npm install
npm run dev
```

### 5. Open Browser
Navigate to **http://localhost:5173**

**Demo Credentials:**
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| operator | op123 | Operator |
| viewer | view123 | Viewer |

## 📁 Project Structure

```
ChurnGuard-RealTime/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.jsx         # Main app
│   │   └── index.css       # Styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── lib/                # Utilities
│   │   ├── supabase.js     # DB client
│   │   ├── sentinelConfig.js
│   │   ├── auditLog.js     # Audit logging
│   │   ├── rbac.js         # Role-based access
│   │   └── emailService.js # Email templates
│   ├── sentinel.js         # Auto-intervention engine
│   ├── optimizer.js        # Efficacy tracker
│   ├── index.js            # Express server
│   └── sql/                # Database migrations
├── ml-service/             # Python ML API
│   ├── main.py             # FastAPI endpoints
│   ├── train_model.py      # Model training
│   ├── models/             # Saved models
│   └── requirements.txt
└── docs/                   # Documentation
```

## 🔌 API Endpoints

### Server (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/intervene` | Create intervention |
| GET | `/api/users` | List all users |
| GET | `/api/sentinel/status` | Sentinel status |
| POST | `/api/sentinel/run` | Trigger Sentinel |
| GET | `/api/efficacy` | Intervention success rates |
| GET | `/api/analytics/trends` | Churn trends |
| GET | `/api/analytics/roi` | ROI by action type |
| GET | `/api/analytics/cohorts` | Cohort analysis |
| GET | `/api/audit/logs` | Audit logs |
| GET | `/api/roles` | Available roles |

### ML Service (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict` | Single prediction |
| POST | `/predict/batch` | Batch predictions |
| GET | `/segments` | User segments |
| GET | `/model/drift` | Drift detection |
| POST | `/model/retrain` | Trigger retraining |
| GET | `/health` | Health check |

## ⚙️ Configuration

### Environment Variables

**Server (.env)**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
PORT=3001
```

**ML Service (.env)**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

### Supabase Tables

Run these SQL scripts in Supabase SQL Editor:
1. `server/sql/create_user_segments.sql`
2. `server/sql/create_interventions.sql`
3. `server/sql/add_source_column.sql`
4. `server/sql/add_outcome_columns.sql`
5. `server/sql/create_audit_logs.sql`

## 🎨 UI Pages

| Page | Access | Description |
|------|--------|-------------|
| Dashboard | All | Main metrics & activity |
| Analytics | All | Trends, ROI, Cohorts |
| ML Intelligence | All | Segments, Drift |
| Intervention Center | Admin/Operator | Manage interventions |
| Audit & Access | Admin | Logs, RBAC |
| Settings | Admin | Configuration |

## 📱 Mobile Support

ChurnGuard is fully responsive with:
- Bottom navigation on mobile
- Touch-friendly buttons
- Collapsible sidebar
- Stacked layouts

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for customer success teams
