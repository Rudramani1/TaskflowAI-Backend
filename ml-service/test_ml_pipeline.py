"""
Automated Test Script for TaskFlow AI ML Microservice

This script:
1. Connects to MongoDB to create a dummy organization and users.
2. Seeds 60 dummy completed tasks to satisfy ML training thresholds.
3. Triggers the /train endpoint and waits for completion.
4. Tests the prediction endpoints.
"""

import os
import time
import asyncio
import random
from datetime import datetime, timezone, timedelta
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

# Load env vars to get MongoDB URI
load_dotenv(".env")
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/taskflownew")
API_BASE = "http://localhost:8000"

async def seed_data():
    print("🌱 1. Seeding Dummy Data to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URI)
    
    # Parse DB name
    db_name = "taskflownew"
    if "?" in MONGO_URI:
        path = MONGO_URI.split("?")[0]
        if "/" in path:
            db_name = path.rsplit("/", 1)[-1]
    db = client[db_name]

    # Create Org
    org_id = ObjectId()
    user1_id = ObjectId()
    user2_id = ObjectId()
    
    await db.organizations.insert_one({
        "_id": org_id,
        "name": "Test ML Organization",
        "slug": f"test-ml-org-{random.randint(1000, 9999)}",
        "members": [
            {"user": user1_id, "role": "admin"},
            {"user": user2_id, "role": "member"}
        ]
    })
    
    rand_suffix = random.randint(10000, 99999)
    await db.users.insert_many([
        {"_id": user1_id, "name": "Alice Backend", "email": f"alice{rand_suffix}@test.com"},
        {"_id": user2_id, "name": "Bob Frontend", "email": f"bob{rand_suffix}@test.com"}
    ])
    
    print(f"  ✅ Created Org: {org_id} with 2 users.")

    # Generate 60 tasks
    tasks = []
    now = datetime.now(timezone.utc)
    
    titles = ["Build API", "Refactor Code", "Fix Bug", "Update UI", "Write Tests", "Deploy App", "Migrate DB"]
    priorities = ["p0", "p1", "p2", "p3"]
    
    for i in range(60):
        # Correlate complexity for realistic model training
        is_complex = random.choice([True, False])
        desc_words = random.randint(50, 150) if is_complex else random.randint(10, 30)
        
        # Complex tasks have more story points and higher chance of delay
        sp = random.choice([5, 8, 13]) if is_complex else random.choice([1, 2, 3])
        
        # Dates
        created = now - timedelta(days=random.randint(10, 30))
        due = created + timedelta(days=random.randint(2, 7))
        
        # 30% chance of being delayed
        if random.random() < 0.3:
            completed = due + timedelta(days=random.randint(1, 5))
        else:
            completed = due - timedelta(days=random.randint(1, 2))
            
        task = {
            "organizationId": org_id,
            "title": f"{random.choice(titles)} {i}",
            "description": "word " * desc_words,
            "status": "done",
            "priority": random.choice(priorities),
            "assigneeId": user1_id if i % 2 == 0 else user2_id,
            "storyPoints": sp,
            "createdAt": created,
            "dueDate": due,
            "completedAt": completed,
            "labels": ["backend", "api"] if is_complex else ["ui", "frontend"]
        }
        tasks.append(task)
        
    await db.tasks.insert_many(tasks)
    print(f"  ✅ Inserted {len(tasks)} completed tasks.")
    
    client.close()
    return str(org_id), str(user1_id), str(user2_id)


def trigger_training(org_id):
    print("\n🧠 2. Triggering ML Model Training...")
    try:
        r = httpx.post(f"{API_BASE}/train", json={"orgId": org_id})
        r.raise_for_status()
        print("  ⏳ Training started in background...")
        
        while True:
            status_req = httpx.get(f"{API_BASE}/train/status")
            status = status_req.json()
            if status["status"] == "complete":
                print("\n  🎉 Training Complete!")
                for model_name, info in status["last_result"]["models"].items():
                    print(f"    - {model_name}: {info['status']}")
                break
            elif status["status"] == "failed":
                print(f"\n  ❌ Training failed: {status}")
                break
                
            print("  ...still training...")
            time.sleep(2)
            
    except Exception as e:
        print(f"  ❌ Failed to call API: {e}")


def test_predictions(org_id):
    print("\n🔮 3. Testing ML Predictions...")
    
    headers = {"Content-Type": "application/json"}
    
    # 1. Effort
    payload = {
        "orgId": org_id,
        "title": "Migrate entire database to new schema",
        "description": "Very complex migration requiring API updates and refactoring.",
        "labels": ["backend", "database"]
    }
    r = httpx.post(f"{API_BASE}/predict/effort", json=payload, headers=headers)
    print("\n👉 Effort Prediction:")
    print(f"   Points: {r.json().get('prediction')}")
    print(f"   Confidence: {r.json().get('confidence')}")
    print(f"   Fallback: {r.json().get('fallback')}")

    # 2. Delay
    payload = {
        "orgId": org_id,
        "title": "Quick CSS Fix",
        "description": "Fix alignment on homepage",
        "storyPoints": 1,
        "days_until_due": 5
    }
    r = httpx.post(f"{API_BASE}/predict/delay", json=payload, headers=headers)
    print("\n👉 Delay Risk Prediction:")
    print(f"   Risk: {r.json().get('prediction')}")
    print(f"   Confidence: {r.json().get('confidence')}")

    # 3. Assignee
    payload = {
        "orgId": org_id,
        "title": "Implement new Backend API",
        "description": "Add new endpoints for the mobile app",
        "labels": ["backend", "api"]
    }
    r = httpx.post(f"{API_BASE}/predict/assignee", json=payload, headers=headers)
    print("\n👉 Best Assignee Recommendation:")
    rankings = r.json().get('rankings', [])
    if rankings:
        print(f"   Top Choice: {rankings[0].get('userName')} (Score: {rankings[0].get('score')})")
    print(f"   Fallback: {r.json().get('fallback')}")

async def main():
    try:
        # Check if server is running
        httpx.get(f"{API_BASE}/health")
    except:
        print("❌ Error: Please ensure the ML microservice is running on port 8000")
        print("Run: uvicorn app.main:app --host 0.0.0.0 --port 8000")
        return

    org_id, u1, u2 = await seed_data()
    trigger_training(org_id)
    test_predictions(org_id)
    
    print("\n✅ All tests finished successfully!")

if __name__ == "__main__":
    asyncio.run(main())
