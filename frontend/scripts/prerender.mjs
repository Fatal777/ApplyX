#!/usr/bin/env node
/**
 * Pre-render script for SEO optimization
 * Generates static HTML for key routes using Puppeteer
 * 
 * Usage: node scripts/prerender.mjs
 */

import puppeteer from 'puppeteer';
import { createServer } from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

// Routes to pre-render for SEO
const ROUTES = [
  { path: '/', filename: 'index.html' },
  { path: '/pricing', filename: 'pricing.html' },
  { path: '/login', filename: 'login.html' },
  { path: '/signup', filename: 'signup.html' },
];

// SEO meta tags for each route
const META_TAGS = {
  '/': {
    title: 'ApplyX - AI-Powered Resume Builder & Job Application Platform',
    description: 'Create ATS-optimized resumes, track job applications, and get AI-powered career insights. Land your dream job faster with ApplyX.',
    keywords: 'resume builder, ATS resume, job application tracker, AI resume, career platform',
  },
  '/pricing': {
    title: 'Pricing - ApplyX | Affordable AI Resume & Job Tools',
    description: 'Choose the perfect plan for your job search. Free tier available. Premium features for serious job seekers.',
    keywords: 'resume builder pricing, career tools pricing, job search subscription',
  },
  '/login': {
    title: 'Login - ApplyX',
    description: 'Sign in to your ApplyX account to manage resumes and job applications.',
    keywords: 'login, sign in, ApplyX account',
  },
  '/signup': {
    title: 'Sign Up - ApplyX | Start Your Career Journey',
    description: 'Create your free ApplyX account and start building ATS-optimized resumes today.',
    keywords: 'sign up, create account, free resume builder',
  },
};

// Site URL for sitemap
const SITE_URL = process.env.SITE_URL || 'https://applyx.app';

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mjs': 'text/javascript',
};

function createStaticServer(port) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = req.url === '/' ? '/index.html' : req.url;
      
      // Remove query strings
      filePath = filePath.split('?')[0];
      
      // For SPA, serve index.html for all routes
      let fullPath = path.join(distDir, filePath);
      
      try {
        if (!existsSync(fullPath)) {
          fullPath = path.join(distDir, 'index.html');
        }
        
        const ext = path.extname(fullPath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        
        const content = readFileSync(fullPath);
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(content);
      } catch (err) {
        console.error('Server error:', err.message);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });
    
    server.listen(port, () => {
      resolve(server);
    });
  });
}

async function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(r => `  <url>
    <loc>${SITE_URL}${r.path === '/' ? '' : r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${r.path === '/' ? '1.0' : r.path === '/pricing' ? '0.8' : '0.6'}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  await fs.writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf-8');
  console.log('   ✅ Generated sitemap.xml');
}

async function prerender() {
  console.log('🚀 Starting pre-render process...\n');

  // Check if dist folder exists
  if (!existsSync(distDir)) {
    console.error('❌ Error: dist folder not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Check if index.html exists
  const indexPath = path.join(distDir, 'index.html');
  if (!existsSync(indexPath)) {
    console.error('❌ Error: dist/index.html not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Start a simple static server
  const PORT = 4173;
  console.log('📦 Starting static server...');
  const server = await createStaticServer(PORT);
  const serverUrl = `http://localhost:${PORT}`;
  console.log(`   Server running at ${serverUrl}`);

  // Launch Puppeteer
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const route of ROUTES) {
      console.log(`\n📄 Pre-rendering ${route.path}...`);

      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to the route
      const url = `${serverUrl}${route.path}`;
      console.log(`   Navigating to ${url}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for React to fully render - check for main content
      try {
        await page.waitForSelector('#root', { timeout: 10000 });
      } catch (e) {
        console.log('   Warning: #root not found, using body content');
      }
      
      // Extra wait for animations and hydration
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get the rendered HTML
      let html = await page.content();

      // Inject SEO meta tags
      const meta = META_TAGS[route.path];
      if (meta) {
        html = html.replace(
          /<head>/i,
          `<head>
    <!-- Pre-rendered by ApplyX for SEO -->
    <meta name="description" content="${meta.description}" />
    <meta name="keywords" content="${meta.keywords}" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${meta.title}" />
    <meta name="twitter:description" content="${meta.description}" />`
        );
        
        // Update title tag
        html = html.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);
      }

      // Add hydration marker for client-side React
      html = html.replace(
        '</body>',
        `<script>window.__PRERENDERED__ = true;</script></body>`
      );

      // Write the pre-rendered HTML
      const outputPath = path.join(distDir, route.filename);
      await fs.writeFile(outputPath, html, 'utf-8');
      console.log(`   ✅ Saved to ${route.filename} (${(html.length / 1024).toFixed(1)} KB)`);

      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  // Generate sitemap
  await generateSitemap();

  console.log('\n✨ Pre-rendering complete!\n');
  console.log('Pre-rendered routes:');
  ROUTES.forEach(r => console.log(`   - ${r.path} → ${r.filename}`));
}

// Run the script
prerender().catch(error => {
  console.error('❌ Pre-render failed:', error);
  process.exit(1);
});
