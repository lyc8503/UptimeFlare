# This is a script to create D1 database, initialize tables, and get D1_ID for later use.
import requests
import os

api_endpoint = f"https://api.cloudflare.com/client/v4/accounts/{os.environ['CLOUDFLARE_ACCOUNT_ID']}"
headers = {
    "Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}",
}
d1_name = "uptimeflare_d1"
with open('init.sql', 'r') as f:
    init_sql = f.read()

# Try to create D1 database (if it doesn't exist)
r = requests.post(
    api_endpoint + "/d1/database",
    headers=headers,
    json={
        "name": d1_name,
        "primary_location_hint": "wnam"
    }
).json()

if not r['success']:
    print("Error creating D1 database: ", r)
    if r['errors'][0]['code'] == 7502:
        print("D1 database already exists, skipping creation.")
    elif r['errors'][0]['code'] == 10000:
        print("Authentication error when creating D1 database. Please make sure your CLOUDFLARE_API_TOKEN has the necessary permissions for D1 Database. This is required for versions after 2026/01/02.")
        exit(1)
    else:
        print("Unknown error creating D1 database: ", r)
        print("Please report this issue at https://github.com/lyc8503/UptimeFlare/issues.")
        exit(1)
else:
    print("D1 database created successfully: ", r)

# Fetch D1 database ID
r = requests.get(
    api_endpoint + "/d1/database?per_page=1000",
    headers=headers
).json()

if not r['success']:
    print("Error fetching D1 database info: ", r)
    exit(1)

d1_id = ''
for db in r['result']:
    if db['name'] == d1_name:
        d1_id = db['uuid']
        break

if d1_id == '':
    print("D1 database not found after creation. Please report this issue at https://github.com/lyc8503/UptimeFlare/issues.")
    print("Full response: ", r)
    exit(1)
print(f"Got D1 database ID: {d1_id}")

# Create initial table in D1
r = requests.post(
    api_endpoint + f"/d1/database/{d1_id}/query",
    headers=headers,
    json={
        "sql": init_sql,
        "params": []
    }
).json()

print("Initialize D1 database response: ", r)
if not r['success']:
    print("Error initializing D1 database.")
    exit(1)
print("D1 database initialized successfully.")

with open(os.environ['GITHUB_ENV'], "a") as f:
    f.write(f"D1_ID={d1_id}\n")
