"""
ChurnGuard: XGBoost Churn Prediction Model
===========================================
Trains a churn prediction model using XGBoost and saves it for inference.

Features used:
- total_clicks
- avg_session_time
- support_tickets
- days_since_signup
- feature_usage_score

Target:
- is_churned (boolean)
"""

import os
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
    confusion_matrix
)
from xgboost import XGBClassifier

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env file")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Feature columns
FEATURE_COLUMNS = [
    'total_clicks',
    'avg_session_time',
    'support_tickets',
    'days_since_signup',
    'feature_usage_score'
]
TARGET_COLUMN = 'is_churned'


def fetch_training_data() -> pd.DataFrame:
    """Fetch user segments data from Supabase."""
    print("📥 Fetching training data from Supabase...")
    
    # Fetch all rows (paginate if needed for larger datasets)
    result = supabase.table("user_segments").select("*").execute()
    
    if not result.data:
        raise ValueError("No data found in user_segments table")
    
    df = pd.DataFrame(result.data)
    print(f"   Loaded {len(df)} records")
    
    return df


def prepare_features(df: pd.DataFrame):
    """Prepare features and target for training."""
    print("🔧 Preparing features...")
    
    # Select features
    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].astype(int)
    
    print(f"   Features shape: {X.shape}")
    print(f"   Target distribution: {y.value_counts().to_dict()}")
    
    return X, y


def train_model(X_train, y_train):
    """Train XGBoost classifier."""
    print("🚀 Training XGBoost model...")
    
    model = XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        objective='binary:logistic',
        eval_metric='auc',
        use_label_encoder=False,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    print("   ✓ Model trained successfully")
    
    return model


def evaluate_model(model, X_test, y_test):
    """Evaluate model performance."""
    print("📊 Evaluating model...")
    
    # Predictions
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    # Metrics
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred),
        'recall': recall_score(y_test, y_pred),
        'f1_score': f1_score(y_test, y_pred),
        'roc_auc': roc_auc_score(y_test, y_prob)
    }
    
    print("\n" + "=" * 50)
    print("📈 Model Performance Metrics")
    print("=" * 50)
    for metric, value in metrics.items():
        print(f"   {metric.upper():12}: {value:.4f}")
    
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Retained', 'Churned']))
    
    print("🔢 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"   [[TN={cm[0][0]:4}  FP={cm[0][1]:4}]")
    print(f"    [FN={cm[1][0]:4}  TP={cm[1][1]:4}]]")
    
    return metrics


def get_feature_importance(model, feature_names):
    """Get and display feature importance."""
    print("\n🎯 Feature Importance:")
    importance = dict(zip(feature_names, model.feature_importances_))
    sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    
    for feature, score in sorted_importance:
        bar = '█' * int(score * 40)
        print(f"   {feature:22}: {bar} {score:.3f}")
    
    return importance


def save_model(model, metrics, filepath='models/churn_model.pkl'):
    """Save trained model to disk."""
    # Create models directory if it doesn't exist
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    model_data = {
        'model': model,
        'features': FEATURE_COLUMNS,
        'metrics': metrics,
        'trained_at': datetime.now().isoformat()
    }
    
    with open(filepath, 'wb') as f:
        pickle.dump(model_data, f)
    
    print(f"\n💾 Model saved to: {filepath}")
    return filepath


def main():
    print("=" * 60)
    print("ChurnGuard: XGBoost Model Training")
    print("=" * 60)
    print()
    
    # Fetch data
    df = fetch_training_data()
    
    # Prepare features
    X, y = prepare_features(df)
    
    # Split data
    print("📂 Splitting data (80% train, 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   Train: {len(X_train)} samples")
    print(f"   Test:  {len(X_test)} samples")
    print()
    
    # Train model
    model = train_model(X_train, y_train)
    
    # Evaluate
    metrics = evaluate_model(model, X_test, y_test)
    
    # Feature importance
    get_feature_importance(model, FEATURE_COLUMNS)
    
    # Save model
    model_path = save_model(model, metrics)
    
    print()
    print("=" * 60)
    print("✅ Training Complete!")
    print("=" * 60)
    print(f"   Model saved to: {model_path}")
    print("   Next: Run FastAPI server to serve predictions")
    print()


if __name__ == "__main__":
    main()
