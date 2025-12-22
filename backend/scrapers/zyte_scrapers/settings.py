"""
ApplyX Scrapy Settings
Configured for ScrapingBee Proxy API
"""
import os

BOT_NAME = 'applyx'

SPIDER_MODULES = ['zyte_scrapers.spiders']
NEWSPIDER_MODULE = 'zyte_scrapers.spiders'

# ScrapingBee API Key (from environment variable)
SCRAPINGBEE_API_KEY = os.getenv('SCRAPINGBEE_API_KEY', '')

# Obey robots.txt rules
ROBOTSTXT_OBEY = False  # ScrapingBee handles this

# Configure concurrent requests (be conservative with free tier)
CONCURRENT_REQUESTS = 8
CONCURRENT_REQUESTS_PER_DOMAIN = 4

# Download delay
DOWNLOAD_DELAY = 1

# Disable cookies
COOKIES_ENABLED = False

# Disable Telnet Console
TELNETCONSOLE_ENABLED = False

# Override default request headers
DEFAULT_REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

# Enable ScrapingBee middleware
DOWNLOADER_MIDDLEWARES = {
    'zyte_scrapers.middlewares.ScrapingBeeMiddleware': 543,
}

# Retry settings
RETRY_ENABLED = True
RETRY_TIMES = 2
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# Enable or disable extensions
EXTENSIONS = {
    'scrapy.extensions.telnet.TelnetConsole': None,
}

# Configure item pipelines
ITEM_PIPELINES = {
    'zyte_scrapers.pipelines.DeduplicationPipeline': 100,
    'zyte_scrapers.pipelines.DataCleaningPipeline': 200,
    'zyte_scrapers.pipelines.SkillExtractionPipeline': 300,
    'zyte_scrapers.pipelines.JsonExportPipeline': 400,
}

# Enable and configure HTTP caching (disabled for cloud)
HTTPCACHE_ENABLED = False

# Set settings whose default value is deprecated
REQUEST_FINGERPRINTER_IMPLEMENTATION = '2.7'
TWISTED_REACTOR = 'twisted.internet.asyncioreactor.AsyncioSelectorReactor'
FEED_EXPORT_ENCODING = 'utf-8'

# ==================================================
# LOGGING
# ==================================================
LOG_LEVEL = 'INFO'
LOG_FORMAT = '%(asctime)s [%(name)s] %(levelname)s: %(message)s'

# ==================================================
# AUTOTHROTTLE
# ==================================================
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0
