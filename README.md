🛡️ ChurnGuard: Real-Time AI Churn Prevention


"Stopping customer attrition before it happens through Agentic AI and Real-Time Behavioral Intelligence."


ChurnGuard is a professional-grade, full-stack AI platform that predicts and prevents customer churn. By bridging Node.js/React with a Python Machine Learning core, it creates a closed-loop system: Perceive (Real-time logs), Predict (XGBoost), and Prevent (Automated Sentinel).
________________________________________
🏗️ System Architecture
ChurnGuard is built on a Polyglot Microservices architecture, utilizing a "best-of-breed" approach for each component:
1.	The Sensor (React 19 Frontend): Captures high-frequency micro-interactions (clicks, feature usage, session patterns) via WebSockets.
2.	The Memory (Node.js + Supabase): Acts as a high-speed "Data Lake." Ingests event streams and persists them into a structured PostgreSQL schema.
3.	The Brain (FastAPI + XGBoost): A Python-based inference engine that calculates churn probability and SHAP explainability values in sub-50ms.
4.	The Sentinel (Background Agent): An autonomous Node.js worker that monitors the data, executes interventions, and manages safety cooldowns.
________________________________________
✨ Core Features


🎯 Real-Time Behavioral Tracking


Unlike traditional "Batch" analytics, ChurnGuard updates a user's risk profile the moment they interact with the app.
•	Event Ingestion: Powered by Socket.io for zero-latency updates.
•	Activity Heatmaps: Visualizes user engagement levels across different modules.


🛡️ Intervention Command Center


A dedicated /admin dashboard for Customer Success Managers to:
•	Visualize Risk: Color-coded user lists (Red: High, Yellow: Med, Green: Low).
•	One-Click Actions: Manually trigger "Nudges," "Priority Support," or "Special Offers".
•	Live Audit Trail: See every action taken by both humans and the AI Sentinel.
________________________________________


🧠 Intelligence Layer (SHAP)


ChurnGuard solves the "Black Box" AI problem by integrating SHAP (SHapley Additive exPlanations).
Why SHAP?
The system doesn't just output a percentage. It explains the drivers of that score:
•	Red Indicators: Factors increasing churn (e.g., "Support Tickets > 5").
•	Blue Indicators: Factors decreasing churn (e.g., "Export Tool Usage > 10").
XAI (Explainable AI): Every high-risk prediction is accompanied by a human-readable justification, allowing your team to act with confidence.


________________________________________


🤖 The Automated Sentinel


The Sentinel is your 24/7 Digital Retention Agent. It operates on a Tiered Logic system:
Risk Level	Automatic Action	Logic
85% - 90%	✉️ Auto-Nudge		Send a re-engagement email/notification.
90% - 95%	🎫 Support Priority	Flag the user for an immediate CSM call.
> 95%		💎 Offer Drop		Automatically apply a discount or credit.

🛡️ Safety Guards


•	24h Cooldown: Prevents the AI from spamming a single user.
•	Human Priority: If a human CSM has talked to the user in the last 12h, the Sentinel stands down.
•	Dry Run Mode: Test the Sentinel's logic in the logs without actually triggering emails.


________________________________________


🛠️ Tech Stack


Frontend
•	Framework: React 19 (Vite)
•	Styling: Tailwind CSS + Framer Motion
•	Charts: Recharts (Real-time Analytics)
Backend (Node.js)
•	Server: Express.js
•	Communication: Socket.io (WebSockets)
•	Database: Supabase / PostgreSQL
•	Automation: Node-Cron
ML Engine (Python)
•	Framework: FastAPI
•	ML Model: XGBoost Classifier
•	Explainability: SHAP


________________________________________


🚀 Quick Start & Installation


1. Prerequisites
•	Node.js v20+
•	Python 3.13+
•	Supabase Account
2. Environment Setup
Create a .env file in both /server and /ml-service:
Code snippet
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_service_role_key
3. Database Initialization
Run the SQL scripts in server/sql/ via the Supabase SQL Editor:
1.	create_user_activity.sql
2.	create_interventions.sql
3.	add_outcome_columns.sql
4. Launch the Stack
Bash
# Terminal 1: Node Server
cd server && npm install && npm run dev

# Terminal 2: ML API
cd ml-service && venv\Scripts\activate && pip install -r requirements.txt && uvicorn main:app --port 8000

# Terminal 3: React UI
cd client && npm install && npm run dev


________________________________________


🔧 Technical Challenges & Solutions


1. Python 3.13 Compatibility
Problem: Several ML libraries lacked stable binary wheels for Python 3.13.
Solution: Built a Resilient Inference Layer that falls back to Scikit-Learn's HistGradientBoostingClassifier if native C++ compilation for XGBoost fails, ensuring cross-platform stability.
2. Polyglot State Synchronization
Problem: Managing real-time data across JavaScript and Python ecosystems.
Solution: Implemented a Shared-Secret API Contract using the Supabase Service Role Key, allowing the Node.js Sentinel to trigger predictions while the Python service queries the live database concurrently.


Built with ❤️ by Aniruddha Payas as a Masterpiece in Vibe Coding & Agentic Systems
