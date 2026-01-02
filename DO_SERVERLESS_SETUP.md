# DigitalOcean Serverless Setup

## Which Models to Use

For DO GenAI models:
- **Interview Agent**: GPT-oss-120b (~$0.003/session) - best conversational ability
- **Resume Parsing**: GPT-oss-20b (~$0.0008/resume) - cheaper, still good
- **AI Suggestions**: GPT-oss-120b (~$0.001/request) - needs good analysis

Monthly cost estimate for 1000 users: ~$2-5

---

## Setup Steps (SSH into your droplet)

```bash
ssh root@139.59.95.13
```

### 1. Install doctl

```bash
cd /tmp
curl -sL https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz | tar -xzv
mv doctl /usr/local/bin/
doctl version
```

### 2. Login to DigitalOcean

```bash
doctl auth init
```
Enter your API token from: https://cloud.digitalocean.com/account/api/tokens

### 3. Install Serverless Plugin

```bash
doctl serverless install
```

### 4. Create Namespace (first time only)

```bash
doctl serverless namespaces create --label "applyx-ai" --region blr1
doctl serverless connect
```

### 5. Deploy Functions

```bash
cd /opt/applyx/serverless

# Create .env with your OpenAI key
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Deploy
doctl serverless deploy . --env .env
```

### 6. Get Function URLs

```bash
doctl serverless functions get ai/resume-suggestions --url
doctl serverless functions get ai/interview-agent --url
```

### 7. Add URLs to Backend .env

```bash
cd /opt/applyx/backend
nano .env
```

Add these lines:
```
DO_RESUME_SUGGESTIONS_URL=https://faas-blr1-xxx.doserverless.co/api/v1/web/xxx/ai/resume-suggestions
DO_INTERVIEW_AGENT_URL=https://faas-blr1-xxx.doserverless.co/api/v1/web/xxx/ai/interview-agent
```

### 8. Restart Backend

```bash
docker compose -f docker-compose.prod.yml restart api
```

---

## Quick Redeploy Script

Create `/opt/applyx/redeploy-functions.sh`:

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

Run it anytime with:
```bash
/opt/applyx/redeploy-functions.sh
```

---

## Test Functions

```bash
# Test resume suggestions
curl -X POST "YOUR_RESUME_SUGGESTIONS_URL" \
  -H "Content-Type: application/json" \
  -d '{"resume_text": "John Doe, Software Engineer..."}'

# Test interview agent
curl -X POST "YOUR_INTERVIEW_AGENT_URL" \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "persona": "friendly", "job_role": "Software Engineer"}'
```

---

## Logs

```bash
# See recent function calls
doctl serverless activations list --limit 10

# Stream logs
doctl serverless activations logs --follow
```

---

## If Using DO GenAI Instead of OpenAI

Update the functions to use DO's API:

```python
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("DO_GENAI_API_KEY"),
    base_url="https://cloud.digitalocean.com/gen-ai/api/v1"
)

# Use "gpt-oss-120b" or "gpt-oss-20b" as model name
```

And in .env:
```
DO_GENAI_API_KEY=your-do-genai-key
```
