# DigitalOcean Serverless Setup

You've done git pull. Now follow these steps:

## Which Models We're Using

- **Interview Agent**: GPT-oss-120b (~$0.003/session)
- **Resume Suggestions**: GPT-oss-120b (~$0.001/request)

Monthly cost for 1000 users: ~$2-5

---

## Step 1: Install doctl (already done)

```bash
cd /tmp
curl -sL https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz | tar -xzv
mv doctl /usr/local/bin/
doctl version
```

## Step 2: Login to DigitalOcean

```bash
doctl auth init
```

Go to https://cloud.digitalocean.com/account/api/tokens and create a token, then paste it.

## Step 3: Install Serverless Plugin

```bash
doctl serverless install
```

## Step 4: Create Namespace

```bash
doctl serverless namespaces create --label "applyx-ai" --region blr1
doctl serverless connect
```

## Step 5: Get DO GenAI API Key

1. Go to: https://cloud.digitalocean.com/gen-ai
2. Click "API Keys" or "Create API Key"
3. Copy the key

## Step 6: Create .env and Deploy

```bash
cd /opt/applyx/serverless

# Create .env file with your DO GenAI key
echo "DO_GENAI_API_KEY=paste-your-key-here" > .env

# Deploy both functions
doctl serverless deploy . --env .env
```

## Step 7: Get Function URLs

```bash
doctl serverless functions get ai/resume-suggestions --url
doctl serverless functions get ai/interview-agent --url
```

Save these URLs!

## Step 8: Add URLs to Backend

```bash
nano /opt/applyx/backend/.env
```

Add these two lines at the bottom:
```
DO_RESUME_SUGGESTIONS_URL=paste-resume-suggestions-url-here
DO_INTERVIEW_AGENT_URL=paste-interview-agent-url-here
```

Save: Ctrl+O, Enter, Ctrl+X

## Step 9: Rebuild Backend and Run Migration

```bash
cd /opt/applyx/backend

# Rebuild backend with new code
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d api

# Run migration for new resume_builder table
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

## Step 10: Rebuild Frontend (optional - for template selection)

```bash
/opt/applyx/rebuild-frontend.sh
```

---

## Quick Redeploy Script

Create this script for future updates:

```bash
cat > /opt/applyx/redeploy-functions.sh << 'EOF'
#!/bin/bash
cd /opt/applyx
git pull origin master
cd serverless
doctl serverless deploy . --env .env
echo "✅ Functions redeployed!"
EOF
chmod +x /opt/applyx/redeploy-functions.sh
```

---

## Test the Functions

```bash
# Test resume suggestions
curl -X POST "YOUR_RESUME_SUGGESTIONS_URL" \
  -H "Content-Type: application/json" \
  -d '{"resume_text": "John Doe, Software Engineer with 5 years experience at Google..."}'

# Test interview agent
curl -X POST "YOUR_INTERVIEW_AGENT_URL" \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "persona": "friendly", "job_role": "Software Engineer"}'
```

---

## View Logs

```bash
doctl serverless activations list --limit 10
doctl serverless activations logs --follow
```

---

## Directory Structure

```
/opt/applyx/
├── serverless/
│   ├── project.yml          # Function config
│   ├── .env                  # Your DO_GENAI_API_KEY
│   └── packages/
│       └── ai/
│           ├── resume-suggestions/
│           │   ├── __main__.py
│           │   └── requirements.txt
│           └── interview-agent/
│               ├── __main__.py
│               └── requirements.txt
└── backend/
    └── .env                  # Add function URLs here
```
