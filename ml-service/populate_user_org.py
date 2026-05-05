import os
import asyncio
import random
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
from dotenv import load_dotenv

# Load env vars
load_dotenv(".env")
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/taskflownew")
API_BASE = "http://localhost:8000"

async def populate_real_user_org():
    print("🌱 Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URI)
    
    db_name = "taskflownew"
    if "?" in MONGO_URI:
        path = MONGO_URI.split("?")[0]
        if "/" in path:
            db_name = path.rsplit("/", 1)[-1]
    db = client[db_name]

    # Find the most recently created Organization
    recent_orgs = await db.organizations.find().sort([("_id", -1)]).limit(1).to_list(1)
    if not recent_orgs:
        print("❌ No organizations found! Please create an organization in the UI first.")
        return
        
    org = recent_orgs[0]
    org_id = org["_id"]
    print(f"✅ Found Organization: {org.get('name')} (ID: {org_id})")
    
    # Get the members of the org
    members = org.get("members", [])
    if not members:
        print("❌ Organization has no members.")
        return
        
    member_ids = [m["user"] for m in members]
    print(f"👥 Found {len(member_ids)} members in this organization.")

    # 1. Create Sprints
    print("🏃 Creating 4 completed Sprints...")
    now = datetime.now(timezone.utc)
    sprints = []
    sprint_ids = []
    
    for i in range(4):
        sprint_end = now - timedelta(days=(3 - i) * 14) # Past 4 sprints, 2 weeks each
        sprint_start = sprint_end - timedelta(days=14)
        
        sprint = {
            "organizationId": org_id,
            "name": f"Sprint {i+1} (Auto-Generated)",
            "startDate": sprint_start,
            "endDate": sprint_end,
            "status": "completed",
            "goals": f"Goal for Sprint {i+1}"
        }
        res = await db.sprints.insert_one(sprint)
        sprint_ids.append(res.inserted_id)

    # 2. Create Tasks
    print("📝 Creating 40 completed tasks across these sprints...")
    tasks = []
    titles = ["Build API", "Refactor Code", "Fix Bug", "Update UI", "Write Tests", "Deploy App", "Migrate DB", "Setup Redis", "Design DB Schema"]
    priorities = ["p0", "p1", "p2", "p3"]
    
    for i in range(40):
        is_complex = random.choice([True, False])
        desc_words = random.randint(50, 150) if is_complex else random.randint(10, 30)
        sp = random.choice([5, 8, 13]) if is_complex else random.choice([1, 2, 3])
        
        sprint_idx = i % 4
        sprint_id = sprint_ids[sprint_idx]
        
        # Sprints 1-4 dates
        sprint_end = now - timedelta(days=(3 - sprint_idx) * 14)
        sprint_start = sprint_end - timedelta(days=14)
        
        created = sprint_start + timedelta(days=random.randint(0, 3))
        due = sprint_end
        
        # 30% chance of being delayed
        if random.random() < 0.3:
            completed = due + timedelta(days=random.randint(1, 5))
        else:
            completed = due - timedelta(days=random.randint(1, 4))
            
        task = {
            "organizationId": org_id,
            "sprintId": sprint_id,
            "title": f"{random.choice(titles)} {i+1}",
            "description": "word " * desc_words,
            "status": "done",
            "priority": random.choice(priorities),
            "assigneeId": random.choice(member_ids),
            "storyPoints": sp,
            "createdAt": created,
            "dueDate": due,
            "completedAt": completed,
            "labels": ["backend", "api"] if is_complex else ["ui", "frontend"]
        }
        tasks.append(task)
        
    await db.tasks.insert_many(tasks)
    print("✅ Inserted 40 completed tasks into the real organization!")
    
    # Update Sprint History for Velocity Trend chart
    print("📊 Populating Sprint History for Velocity Trends...")
    for i, sid in enumerate(sprint_ids):
        # Calculate planned vs completed for this sprint
        sprint_tasks = [t for t in tasks if t["sprintId"] == sid]
        planned = sum(t["storyPoints"] for t in sprint_tasks)
        # Randomly complete slightly less sometimes
        completed_pts = planned if random.random() > 0.3 else planned - random.choice([1, 2])
        
        history = {
            "organizationId": org_id,
            "sprintId": sid,
            "sprintName": f"Sprint {i+1} (Auto-Generated)",
            "plannedPoints": planned,
            "completedPoints": completed_pts,
            "endDate": now - timedelta(days=(3 - i) * 14)
        }
        await db.sprinthistories.insert_one(history)
        
    client.close()

    print(f"\n🧠 Triggering ML Model Training for Organization {org_id}...")
    try:
        r = httpx.post(f"{API_BASE}/train", json={"orgId": str(org_id)})
        r.raise_for_status()
        print("✅ Training request sent! Refresh your browser in 10-15 seconds to see the magic.")
    except Exception as e:
        print(f"❌ Failed to trigger training: {e}")

if __name__ == "__main__":
    asyncio.run(populate_real_user_org())
