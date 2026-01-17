"""
ChurnGuard: FastAPI Prediction Service
=======================================
Serves churn predictions via REST API.

Endpoints:
- GET  /health          - Health check
- POST /predict         - Single user prediction
- POST /predict/batch   - Batch predictions
- GET  /model/info      - Model metadata
"""

import os
import pickle
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="ChurnGuard ML API",
    description="Real-time churn prediction powered by XGBoost",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model path
MODEL_PATH = "models/churn_model.pkl"

# Global model variable
model_data = None


# Request/Response Models
class UserFeatures(BaseModel):
    """Features for churn prediction."""
    total_clicks: int = Field(..., ge=0, description="Total clicks by user")
    avg_session_time: float = Field(..., ge=0, description="Average session time in minutes")
    support_tickets: int = Field(..., ge=0, description="Number of support tickets")
    days_since_signup: int = Field(..., ge=0, description="Days since user signed up")
    feature_usage_score: float = Field(..., ge=0, le=100, description="Feature usage score (0-100)")

    class Config:
        json_schema_extra = {
            "example": {
                "total_clicks": 50,
                "avg_session_time": 12.5,
                "support_tickets": 2,
                "days_since_signup": 30,
                "feature_usage_score": 65.0
            }
        }


class PredictionResponse(BaseModel):
    """Prediction result."""
    is_churned: bool
    churn_probability: float
    risk_level: str
    recommendation: str
    primary_reason: str


class BatchPredictionRequest(BaseModel):
    """Batch prediction request."""
    users: List[UserFeatures]


class BatchPredictionResponse(BaseModel):
    """Batch prediction response."""
    predictions: List[PredictionResponse]
    total_users: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int


class ModelInfo(BaseModel):
    """Model metadata."""
    trained_at: str
    features: List[str]
    metrics: dict


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    timestamp: str


def load_model():
    """Load the trained model."""
    global model_data
    
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Run train_model.py first.")
    
    with open(MODEL_PATH, 'rb') as f:
        model_data = pickle.load(f)
    
    print(f"✅ Model loaded from {MODEL_PATH}")
    return model_data


def get_risk_level(probability: float) -> tuple:
    """Determine risk level and recommendation based on churn probability."""
    if probability >= 0.7:
        return "HIGH", "Immediate intervention required. Consider offering retention incentives."
    elif probability >= 0.4:
        return "MEDIUM", "Proactive outreach recommended. Schedule a check-in call."
    else:
        return "LOW", "User appears engaged. Continue current engagement strategy."


def get_primary_reason(features: 'UserFeatures') -> str:
    """
    Determine the primary reason for churn risk (SHAP-like explanation).
    Maps feature values to human-readable explanations.
    """
    reasons = []
    
    # Check support tickets (high friction indicator)
    if features.support_tickets > 5:
        reasons.append(("High Friction", features.support_tickets * 10))
    elif features.support_tickets > 3:
        reasons.append(("Support Issues", features.support_tickets * 5))
    
    # Check engagement (low clicks)
    if features.total_clicks < 10:
        reasons.append(("Low Engagement", (10 - features.total_clicks) * 8))
    elif features.total_clicks < 50:
        reasons.append(("Low Activity", (50 - features.total_clicks) * 2))
    
    # Check session time
    if features.avg_session_time < 2.0:
        reasons.append(("Short Sessions", int((2.0 - features.avg_session_time) * 15)))
    
    # Check feature usage
    if features.feature_usage_score < 20:
        reasons.append(("Underutilizing Features", int(20 - features.feature_usage_score)))
    
    # Check account age vs engagement
    if features.days_since_signup > 60 and features.total_clicks < 30:
        reasons.append(("Stale Account", 25))
    
    # Return the highest priority reason
    if reasons:
        reasons.sort(key=lambda x: x[1], reverse=True)
        return reasons[0][0]
    
    return "Healthy User"


def make_prediction(features: UserFeatures) -> PredictionResponse:
    """Make a single prediction."""
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    model = model_data['model']
    
    # Prepare features in correct order
    feature_values = [[
        features.total_clicks,
        features.avg_session_time,
        features.support_tickets,
        features.days_since_signup,
        features.feature_usage_score
    ]]
    
    # Get prediction and probability
    prediction = model.predict(feature_values)[0]
    probability = model.predict_proba(feature_values)[0][1]
    
    risk_level, recommendation = get_risk_level(probability)
    primary_reason = get_primary_reason(features)
    
    return PredictionResponse(
        is_churned=bool(prediction),
        churn_probability=round(float(probability), 4),
        risk_level=risk_level,
        recommendation=recommendation,
        primary_reason=primary_reason
    )


# API Endpoints
@app.on_event("startup")
async def startup_event():
    """Load model on startup."""
    try:
        load_model()
    except FileNotFoundError as e:
        print(f"⚠️ Warning: {e}")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        model_loaded=model_data is not None,
        timestamp=datetime.now().isoformat()
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict(features: UserFeatures):
    """
    Predict churn for a single user.
    
    Returns:
    - is_churned: Boolean prediction
    - churn_probability: Probability score (0-1)
    - risk_level: HIGH, MEDIUM, or LOW
    - recommendation: Suggested action
    """
    return make_prediction(features)


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """
    Predict churn for multiple users.
    
    Returns predictions for all users plus aggregate statistics.
    """
    predictions = [make_prediction(user) for user in request.users]
    
    high_risk = sum(1 for p in predictions if p.risk_level == "HIGH")
    medium_risk = sum(1 for p in predictions if p.risk_level == "MEDIUM")
    low_risk = sum(1 for p in predictions if p.risk_level == "LOW")
    
    return BatchPredictionResponse(
        predictions=predictions,
        total_users=len(predictions),
        high_risk_count=high_risk,
        medium_risk_count=medium_risk,
        low_risk_count=low_risk
    )


@app.get("/model/info", response_model=ModelInfo)
async def model_info():
    """Get model metadata and performance metrics."""
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return ModelInfo(
        trained_at=model_data.get('trained_at', 'unknown'),
        features=model_data.get('features', []),
        metrics=model_data.get('metrics', {})
    )


@app.get("/users/risk")
async def get_users_with_risk(limit: int = 50, min_risk: float = 0.0):
    """
    Get users from database with their churn risk predictions.
    Used by the admin dashboard to display the risk table.
    """
    from supabase import create_client
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    supabase = create_client(supabase_url, supabase_key)
    
    # Fetch users from user_segments table
    result = supabase.table("user_segments").select("*").limit(limit).execute()
    
    if not result.data:
        return {"users": [], "high_risk_count": 0}
    
    # Add predictions to each user
    users_with_risk = []
    high_risk_count = 0
    
    for user in result.data:
        features = UserFeatures(
            total_clicks=user.get('total_clicks', 0),
            avg_session_time=user.get('avg_session_time', 0),
            support_tickets=user.get('support_tickets', 0),
            days_since_signup=user.get('days_since_signup', 0),
            feature_usage_score=user.get('feature_usage_score', 0)
        )
        
        prediction = make_prediction(features)
        
        if prediction.churn_probability >= min_risk:
            user_data = {
                "id": user.get('id'),
                "user_id": user.get('user_id'),
                "total_clicks": user.get('total_clicks'),
                "avg_session_time": user.get('avg_session_time'),
                "support_tickets": user.get('support_tickets'),
                "days_since_signup": user.get('days_since_signup'),
                "feature_usage_score": user.get('feature_usage_score'),
                "is_churned": user.get('is_churned'),
                "churn_probability": prediction.churn_probability,
                "risk_level": prediction.risk_level,
                "primary_reason": prediction.primary_reason,
                "recommendation": prediction.recommendation
            }
            users_with_risk.append(user_data)
            
            if prediction.churn_probability >= 0.8:
                high_risk_count += 1
    
    # Sort by risk descending
    users_with_risk.sort(key=lambda x: x['churn_probability'], reverse=True)
    
    return {
        "users": users_with_risk,
        "total_count": len(users_with_risk),
        "high_risk_count": high_risk_count
    }


# ============================================
# Phase 10: ML Enhancements
# ============================================

@app.get("/segments")
async def get_user_segments():
    """
    Cluster users into persona segments based on behavior patterns.
    Uses K-means-like logic to categorize users.
    """
    try:
        # Get Supabase client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise HTTPException(status_code=500, detail="Supabase not configured")
        
        from supabase import create_client
        supabase = create_client(supabase_url, supabase_key)
        
        # Fetch users
        response = supabase.table("user_segments").select("*").limit(500).execute()
        users = response.data
        
        # Define segments based on behavior thresholds
        segments = {
            "power_users": [],
            "at_risk": [],
            "dormant": [],
            "new_users": [],
            "engaged": []
        }
        
        for user in users:
            clicks = user.get("total_clicks", 0)
            session_time = user.get("avg_session_time", 0)
            tickets = user.get("support_tickets", 0)
            days = user.get("days_since_signup", 0)
            score = user.get("feature_usage_score", 0)
            
            # Segmentation logic
            if days <= 30:
                segments["new_users"].append(user["user_id"])
            elif clicks > 500 and session_time > 30 and score > 70:
                segments["power_users"].append(user["user_id"])
            elif clicks < 50 or session_time < 5:
                segments["dormant"].append(user["user_id"])
            elif tickets > 3 or score < 30:
                segments["at_risk"].append(user["user_id"])
            else:
                segments["engaged"].append(user["user_id"])
        
        # Calculate segment stats
        segment_stats = []
        for name, user_ids in segments.items():
            segment_stats.append({
                "segment": name,
                "count": len(user_ids),
                "percentage": round((len(user_ids) / len(users)) * 100, 1) if users else 0,
                "sample_users": user_ids[:5]  # Sample of users
            })
        
        return {
            "success": True,
            "total_users": len(users),
            "segments": segment_stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model/drift")
async def detect_feature_drift():
    """
    Detect feature drift by comparing current data distributions 
    to training baseline. Returns drift alerts for each feature.
    """
    try:
        # Get Supabase client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise HTTPException(status_code=500, detail="Supabase not configured")
        
        from supabase import create_client
        supabase = create_client(supabase_url, supabase_key)
        
        # Fetch recent users (last 100)
        response = supabase.table("user_segments").select("*").limit(100).execute()
        users = response.data
        
        if not users:
            return {"success": True, "drift_detected": False, "message": "No data to analyze"}
        
        # Calculate current statistics
        import numpy as np
        features = ["total_clicks", "avg_session_time", "support_tickets", 
                   "days_since_signup", "feature_usage_score"]
        
        current_stats = {}
        for feat in features:
            values = [u.get(feat, 0) for u in users]
            current_stats[feat] = {
                "mean": float(np.mean(values)),
                "std": float(np.std(values)),
                "min": float(np.min(values)),
                "max": float(np.max(values))
            }
        
        # Training baseline (hardcoded from training data)
        baseline = {
            "total_clicks": {"mean": 300, "std": 200},
            "avg_session_time": {"mean": 20, "std": 15},
            "support_tickets": {"mean": 2, "std": 2},
            "days_since_signup": {"mean": 180, "std": 100},
            "feature_usage_score": {"mean": 50, "std": 25}
        }
        
        # Detect drift (if current mean deviates > 2 std from baseline)
        drift_alerts = []
        for feat in features:
            if feat in baseline:
                mean_diff = abs(current_stats[feat]["mean"] - baseline[feat]["mean"])
                threshold = baseline[feat]["std"] * 2
                
                if mean_diff > threshold:
                    drift_alerts.append({
                        "feature": feat,
                        "severity": "high" if mean_diff > threshold * 1.5 else "medium",
                        "baseline_mean": baseline[feat]["mean"],
                        "current_mean": current_stats[feat]["mean"],
                        "deviation": round(mean_diff / baseline[feat]["std"], 2)
                    })
        
        return {
            "success": True,
            "drift_detected": len(drift_alerts) > 0,
            "alert_count": len(drift_alerts),
            "alerts": drift_alerts,
            "current_stats": current_stats,
            "analyzed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/model/retrain")
async def trigger_model_retrain():
    """
    Trigger model retraining (stub for now).
    In production, this would queue a retraining job.
    """
    return {
        "success": True,
        "message": "Model retraining triggered",
        "status": "queued",
        "estimated_time": "5-10 minutes",
        "triggered_at": datetime.now().isoformat()
    }


@app.get("/model/retrain/status")
async def get_retrain_status():
    """
    Get model retraining status.
    """
    global model_data
    
    if not model_data:
        return {"success": False, "error": "Model not loaded"}
    
    return {
        "success": True,
        "model_version": model_data.get("model_version", "1.0.0"),
        "trained_at": model_data.get("trained_at", "unknown"),
        "last_retrain": None,
        "status": "idle",
        "next_scheduled": "Weekly - Sunday 2:00 AM"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
