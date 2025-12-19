"""
ScrapingBee Middleware for Scrapy
Proxies all requests through ScrapingBee API
"""

from scrapy import signals
from scrapy.exceptions import NotConfigured
import urllib.parse


class ScrapingBeeMiddleware:
    """
    Middleware to proxy all requests through ScrapingBee
    """
    
    def __init__(self, api_key):
        if not api_key:
            raise NotConfigured('SCRAPINGBEE_API_KEY not set')
        self.api_key = api_key
        self.api_url = 'https://app.scrapingbee.com/api/v1/'
    
    @classmethod
    def from_crawler(cls, crawler):
        api_key = crawler.settings.get('SCRAPINGBEE_API_KEY')
        if not api_key:
            raise NotConfigured('SCRAPINGBEE_API_KEY not set')
        
        middleware = cls(api_key)
        crawler.signals.connect(middleware.spider_opened, signal=signals.spider_opened)
        return middleware
    
    def process_request(self, request, spider):
        """
        Proxy the request through ScrapingBee
        """
        # Skip if already a ScrapingBee URL
        if 'scrapingbee.com' in request.url:
            return None
        
        # Build ScrapingBee URL
        params = {
            'api_key': self.api_key,
            'url': request.url,
            'render_js': 'true',  # Enable JavaScript rendering for LinkedIn
            'premium_proxy': 'true',  # Use premium proxies for better success rate
            'country_code': 'in',  # Use India IP addresses
        }
        
        # Construct the ScrapingBee request URL
        scrapingbee_url = f"{self.api_url}?{urllib.parse.urlencode(params)}"
        
        # Replace the original request URL with ScrapingBee URL
        request = request.replace(
            url=scrapingbee_url,
            method='GET',
            dont_filter=True
        )
        
        return request
    
    def spider_opened(self, spider):
        spider.logger.info(f'ScrapingBee middleware enabled for spider: {spider.name}')
