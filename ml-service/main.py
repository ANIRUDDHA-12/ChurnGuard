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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
