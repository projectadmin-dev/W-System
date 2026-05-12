#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Linear poll script for processing Todo tasks.
"""
import requests
import json
import os
import datetime

API_KEY = os.environ.get("LINEAR_API_KEY")
if not API_KEY:
    with open("/tmp/.lin_api_key") as f:
        API_KEY = f.read().strip()

TEAM_ID = "8eb8a9c6-fba5-4712-a567-ab8539f45eba"
ORG_ID = "4b4c93be-3f76-4cb1-8318-4fef1b50f8b3"
STATE_TODO_ID = "7b70916f-82d3-4766-b4ca-54796a16f756"
STATE_IN_PROGRESS_ID = "38d4cbed-aded-459f-ab4f-859b6e229a14"
STATE_IN_REVIEW_ID = "94cc620e-dc9b-4df6-87cc-260491e5cacb"

URL = "https://api.linear.app/graphql"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": API_KEY,
}

def run_query(query: str):
    r = requests.post(URL, headers=HEADERS, json={"query": query})
    r.raise_for_status()
    data = r.json()
    if "errors" in data:
        raise RuntimeError(data["errors"])
    return data

def get_all_issues():
    query = f'''
    {{
      issues(first: 100, filter: {{ team: {{ id: {{ eq: "{TEAM_ID}" }} }} }}) {{
        nodes {{
          id
          identifier
          title
          description
          state {{ id name type }}
          assignee {{ id name }}
          priority
          createdAt
          updatedAt
        }}
      }}
    }}
    '''
    return run_query(query)["data"]["issues"]["nodes"]

def update_state(issue_id: str, state_id: str):
    mutation = f'''
    mutation {{
      issueUpdate(id: "{issue_id}", input: {{ stateId: "{state_id}" }}) {{
        success
        issue {{ id state {{ name }} }}
      }}
    }}
    '''
    return run_query(mutation)["data"]["issueUpdate"]

def add_comment(issue_id: str, body: str):
    mutation = json.loads(json.dumps({
        "query": f'mutation {{ commentCreate(input: {{ issueId: "{issue_id}", body: {json.dumps(body)} }}) {{ success comment {{ id }} }} }}'
    }))
    r = requests.post(URL, headers=HEADERS, json=mutation)
    r.raise_for_status()
    data = r.json()
    return data

if __name__ == "__main__":
    issues = get_all_issues()
    id_map = {i["identifier"]: i["id"] for i in issues}
    # Save map to file for later use
    with open("/tmp/linear_id_map.json", "w") as f:
        json.dump(id_map, f)
    # Print issues for inspection
    print(json.dumps(issues, indent=2, ensure_ascii=False))
