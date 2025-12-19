from setuptools import setup, find_packages

setup(
    name='applyx-scrapers',
    version='1.0.0',
    description='ApplyX job scrapers for Zyte Scrapy Cloud',
    author='ApplyX Team',
    packages=find_packages(),
    install_requires=[
        # Dependencies are handled by requirements.txt
    ],
    entry_points={
        'scrapy': [
            'settings = zyte_scrapers.settings',
        ],
    },
    python_requires='>=3.9',
)
