# This is a script to migrate state from KV to D1 database.
# It reads the state from KV namespace, compacts it, and writes it to D1 database.
# It also deletes the KV namespace after a successful migration.
import requests
import os
import json

api_endpoint = f"https://api.cloudflare.com/client/v4/accounts/{os.environ['CLOUDFLARE_ACCOUNT_ID']}"
headers = {
    "Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}",
}
d1_id = os.environ['D1_ID']
kv_name = "uptimeflare_kv"

# Fetch KV namespace ID
r = requests.get(
    api_endpoint + "/storage/kv/namespaces?per_page=1000",
    headers=headers
).json()

if not r['success']:
    print("Error fetching KV namespace info: ", r)
    exit(1)

kv_id = ''
for ns in r['result']:
    if ns['title'] == kv_name:
        kv_id = ns['id']
        break

if kv_id == '':
    print("KV namespace not found. Skipping migration.")
    exit(0)

print(f"Got KV namespace ID: {kv_id}")

# Fetch state from KV
r = requests.post(
    api_endpoint + f"/storage/kv/namespaces/{kv_id}/bulk/get",
    headers=headers,
    json={
        "keys": ["state"]
    }
).json()

if not r['success']:
    print("Error fetching state from KV: ", r)
    exit(1)

# Compact it
original_state = r['result']['values']['state']
state = json.loads(original_state)
compacted_state = {
    'lastUpdate': state['lastUpdate'],
    'overallUp': state['overallUp'],
    'overallDown': state['overallDown'],
    'incident': {
        k: {
            'start': [x['start'] for x in v],
            'end': [x.get('end') for x in v],
            'error': [x['error'] for x in v]
        } for k, v in state['incident'].items()
    },
    'latency': {}
}
compacted_state_str = json.dumps(compacted_state)

print("Original state: ", original_state[:256] + "..." if len(original_state) > 256 else original_state)
print("Compacted state: ", compacted_state_str[:256] + "..." if len(compacted_state_str) > 256 else compacted_state_str)

# Write compacted state to D1
r = requests.post(
    api_endpoint + f"/d1/database/{d1_id}/query",
    headers=headers,
    json={
        "sql": "INSERT INTO uptimeflare (key, value) VALUES (?, ?)",
        "params": ["state", compacted_state_str]
    }
).json()

if not r['success']:
    # UNIQUE constraint failed: uptimeflare.key: SQLITE_CONSTRAINT
    if r['errors'][0]['code'] == 7500 and "UNIQUE" in r['errors'][0]['message']:
        print("State probably already migrated to D1. Migration skipped.")
    else:
        print("Error writing state to D1: ", r)
        print("Migration failed. Please report this issue at https://github.com/lyc8503/UptimeFlare/issues.")
        exit(1)

print("State migrated to D1 successfully. Trying to delete unused KV namespace...")
r = requests.delete(
    api_endpoint + f"/storage/kv/namespaces/{kv_id}",
    headers=headers
).json()
if r['success']:
    print("KV namespace deleted successfully.")
else:
    print("Error deleting KV namespace: ", r)
