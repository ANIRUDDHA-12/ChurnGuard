"""
ChurnGuard: Synthetic User Data Generator
==========================================
Generates 1,000 simulated users with churn behavior patterns
and inserts them into the Supabase user_segments table.

Churn Logic:
- Users with >5 support tickets OR <10 clicks have 85% chance of churning
- All other users have 15% chance of churning
"""

import os
import random
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env file")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_user_id() -> str:
    """Generate a unique user ID."""
    return f"user_{uuid.uuid4().hex[:12]}"

def determine_churn(total_clicks: int, support_tickets: int) -> bool:
    """
    Determine if a user should be marked as churned.
    
    Rules:
    - >5 support tickets OR <10 clicks: 85% chance of churn
    - Otherwise: 15% chance of churn
    """
    if support_tickets > 5 or total_clicks < 10:
        return random.random() < 0.85  # 85% churn rate
    else:
        return random.random() < 0.15  # 15% churn rate

def generate_synthetic_user() -> dict:
    """Generate a single synthetic user with realistic feature values."""
    
    # Generate base features
    total_clicks = random.randint(0, 500)
    support_tickets = random.randint(0, 15)
    
    # Correlated features (more clicks = usually longer sessions, higher feature usage)
    base_session_time = random.uniform(0.5, 30.0)
    if total_clicks > 100:
        avg_session_time = base_session_time * random.uniform(1.2, 2.0)
    else:
        avg_session_time = base_session_time * random.uniform(0.5, 1.0)
    
    days_since_signup = random.randint(1, 365)
    
    # Feature usage score (0-100)
    feature_usage_score = min(100, max(0, 
        (total_clicks / 5) + 
        (avg_session_time * 2) - 
        (support_tickets * 5) + 
        random.uniform(-10, 10)
    ))
    
    # Determine churn based on business rules
    is_churned = determine_churn(total_clicks, support_tickets)
    
    return {
        "user_id": generate_user_id(),
        "total_clicks": total_clicks,
        "avg_session_time": round(avg_session_time, 2),
        "support_tickets": support_tickets,
        "days_since_signup": days_since_signup,
        "feature_usage_score": round(feature_usage_score, 2),
        "is_churned": is_churned,
    }

def insert_users_batch(users: list, batch_size: int = 100) -> int:
    """Insert users in batches to avoid timeout issues."""
    total_inserted = 0
    
    for i in range(0, len(users), batch_size):
        batch = users[i:i + batch_size]
        try:
            result = supabase.table("user_segments").insert(batch).execute()
            total_inserted += len(result.data)
            print(f"  ✓ Inserted batch {i // batch_size + 1}: {len(result.data)} users")
        except Exception as e:
            print(f"  ✗ Error in batch {i // batch_size + 1}: {e}")
    
    return total_inserted

def main():
    print("=" * 50)
    print("ChurnGuard: Synthetic Data Generator")
    print("=" * 50)
    print()
    
    # Generate 1,000 synthetic users
    num_users = 1000
    print(f"📊 Generating {num_users} synthetic users...")
    
    users = [generate_synthetic_user() for _ in range(num_users)]
    
    # Calculate statistics
    churned_count = sum(1 for u in users if u["is_churned"])
    high_risk_count = sum(1 for u in users if u["support_tickets"] > 5 or u["total_clicks"] < 10)
    
    print(f"   Total users: {len(users)}")
    print(f"   High-risk users (>5 tickets OR <10 clicks): {high_risk_count}")
    print(f"   Churned users: {churned_count} ({churned_count/len(users)*100:.1f}%)")
    print()
    
    # Insert into Supabase
    print(f"📤 Inserting users into Supabase...")
    total_inserted = insert_users_batch(users)
    
    print()
    print("=" * 50)
    print(f"✅ Successfully inserted {total_inserted} users!")
    print("=" * 50)
    print()
    print("Next steps:")
    print("  1. Check Supabase Table Editor for 'user_segments' table")
    print("  2. Verify data distribution looks correct")
    print("  3. Proceed to model training")

if __name__ == "__main__":
    main()
