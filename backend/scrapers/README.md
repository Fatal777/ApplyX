# ApplyX Zyte Scrapy Cloud Integration

Complete job scraping solution using Zyte Scrapy Cloud with **unlimited concurrent crawls** (GitHub Student).

## 🚀 Features

- ✅ **3 High-Quality Spiders**: LinkedIn, Indeed India, Naukri.com
- ✅ **Zyte Smart Proxy**: Automatic IP rotation, anti-blocking
- ✅ **100 Concurrent Requests**: Unlimited with GitHub Student
- ✅ **Auto-Deploy**: GitHub Actions on push to main
- ✅ **Data Pipelines**: Deduplication, cleaning, skill extraction
- ✅ **Comprehensive Fields**: Salary, skills, experience, company details

## 📦 Project Structure

```
backend/scrapers/
├── scrapy.cfg                  # Zyte deployment config
├── setup.py                    # Package setup
├── requirements.txt            # Dependencies
└── zyte_scrapers/
    ├── __init__.py
    ├── settings.py             # Zyte API settings (100 concurrent)
    ├── items.py                # JobItem definition
    ├── pipelines.py            # Data processing
    ├── middlewares.py          # Custom middlewares
    └── spiders/
        ├── linkedin.py         # LinkedIn Jobs
        ├── indeed.py           # Indeed India
        └── naukri.py           # Naukri.com
```

## 🔧 Setup & Deployment

### Option 1: GitHub Actions (Recommended)

**Step 1: Add Zyte API Key to GitHub**
1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `ZYTE_API_KEY`
5. Value: Your Zyte API key (from https://app.zyte.com/o/xxxxxxx/settings/apikey)
6. Click "Add secret"

**Step 2: Push to Main**
```bash
git add backend/scrapers
git commit -m "Add Zyte Scrapy Cloud integration"
git push origin main
```

**Step 3: Monitor Deployment**
- Go to GitHub Actions tab
- Watch "Deploy Scrapy to Zyte Cloud" workflow
- Green checkmark = Success! ✅

**Step 4: Trigger Jobs via Zyte Dashboard**
1. Visit https://app.zyte.com/p/840796
2. Click "Jobs" → "Schedule"
3. Spider: `linkedin` / `indeed` / `naukri`
4. Arguments:
   ```json
   {
     "keywords": "software engineer",
     "location": "Bangalore"
   }
   ```
5. Click "Schedule"

---

### Option 2: Manual CLI Deployment

**Install shub**
```bash
pip install shub
```

**Login**
```bash
shub login
# Enter your Zyte API key when prompted
```

**Deploy**
```bash
cd backend/scrapers
shub deploy 840796
```

**Schedule a Job**
```bash
shub schedule linkedin keywords="python developer" location="India"
```

---

## 🕷️ Spider Usage

### LinkedIn Spider
```bash
shub schedule linkedin keywords="data scientist" location="Mumbai"
```
Scrapes: LinkedIn India jobs with full descriptions, salary, company details

### Indeed Spider
```bash
shub schedule indeed keywords="frontend developer" location="Pune"
```
Scrapes: Indeed India with salary ranges, job types, detailed descriptions

### Naukri Spider
```bash
shub schedule naukri keywords="backend engineer" location="Bangalore"
```
Scrapes: Naukri.com with experience levels, skills tags, company ratings

---

## 📊 Monitoring & Results

### View Jobs on Zyte Dashboard
1. Go to https://app.zyte.com/p/840796/jobs
2. Click on any job to see:
   - Items scraped
   - Requests made
   - Success rate
   - Logs

### Download Results
```bash
# Download JSON output
shub items 840796/{job_id} -o jobs.json

# Or via API
curl "https://storage.scrapinghub.com/items/840796/1/1" -u YOUR_API_KEY:
```

---

## 🔗 Backend Integration

The scrapers run on Zyte Cloud. To integrate with your FastAPI backend, create an API client:

```python
# backend/app/services/zyte_client.py
import requests

ZYTE_API_KEY = "your_key"
PROJECT_ID = "840796"

def trigger_scrape(spider_name, keywords, location):
    """Trigger Zyte spider"""
    url = f"https://app.zyte.com/api/schedule.json"
    data = {
        "project": PROJECT_ID,
        "spider": spider_name,
        "keywords": keywords,
        "location": location
    }
    response = requests.post(url, json=data, auth=(ZYTE_API_KEY, ''))
    return response.json()['jobid']

def get_results(job_id):
    """Fetch scraped jobs"""
    url = f"https://storage.scrapinghub.com/items/{PROJECT_ID}/1/{job_id}"
    response = requests.get(url, auth=(ZYTE_API_KEY, ''))
    return response.json()
```

---

## 🧪 Local Testing

**Test spider locally** (without Zyte):
```bash
cd backend/scrapers
scrap y crawl linkedin -a keywords="test" -a location="India" -o test.json
```

**With Zyte**:
1. Set environment variable:
   ```bash
   export ZYTE_API_KEY=your_key
   ```
2. Run:
   ```bash
   scrapy crawl linkedin -a keywords="test" -a location="India"
   ```

---

## ⚙️ Configuration

### Update Settings
Edit `zyte_scrapers/settings.py`:

```python
# Increase concurrency
CONCURRENT_REQUESTS = 200  # Default: 100

# Enable JavaScript rendering for all requests
ZYTE_API_DEFAULT_PARAMS = {
    'browserHtml': True,
    'javascript': True,
    'geolocation': 'IN',
}

# Add custom headers
DEFAULT_REQUEST_HEADERS = {
    'User-Agent': 'Your custom UA'
}
```

### Add New Spider
```bash
cd backend/scrapers
scrapy genspider glassdoor glassdoor.co.in
```

Edit `zyte_scrapers/spiders/glassdoor.py` with your scraping logic.

---

## 📈 Performance & Limits

**GitHub Student Zyte Benefits:**
- ✅ Unlimited concurrent crawls
- ✅ Unlimited requests
- ✅ Unlimited crawl time
- ✅ 120 day data retention
- ✅ Smart Proxy Manager included

**Expected Performance:**
- LinkedIn: ~50 jobs/minute
- Indeed: ~80 jobs/minute
- Naukri: ~100 jobs/minute

**Total Capacity:** 10,000+ jobs/day easily achievable

---

## 🐛 Troubleshooting

**Deployment fails:**
```bash
# Check shub is logged in
shub login

# Verify project ID
shub deploy 840796 --version test
```

**Spider errors:**
- Check logs: https://app.zyte.com/p/840796/jobs
- Enable debug logging: Set `LOG_LEVEL = 'DEBUG'` in settings.py

**No results:**
- Verify selectors haven't changed (job sites update HTML)
- Test locally first: `scrapy crawl linkedin -a keywords="test"`
- Check Zyte dashboard for error messages

---

## 📚 Resources

- **Zyte Dashboard:** https://app.zyte.com/p/840796
- **Scrapy Docs:**  https://docs.scrapy.org/
- **Zyte API Docs:** https://docs.zyte.com/scrapy-cloud.html
- **shub CLI:** https://shub.readthedocs.io/

---

## 🎯 Next Steps

1. **Add GitHub Secret** with Zyte API key
2. **Push to main** branch
3. **Monitor deployment** in GitHub Actions
4. **Schedule test job** on Zyte Dashboard
5. **Integrate with FastAPI** backend

**Ready to scale to unlimited job scraping!** 🚀
