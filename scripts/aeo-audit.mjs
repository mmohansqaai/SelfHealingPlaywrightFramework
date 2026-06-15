/**
 * One-off AEO (Answer Engine Optimization) audit for a URL via Playwright.
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'fs';

const TARGET = process.argv[2] || 'https://www.bayone.com';

function scoreCategory(passed, total) {
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}

async function auditPage(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const getMeta = (sel) => document.querySelector(sel)?.getAttribute('content') || null;
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
      tag: h.tagName,
      text: (h.textContent || '').trim().slice(0, 120),
    }));
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try {
        return JSON.parse(s.textContent || '');
      } catch {
        return { parseError: true, raw: (s.textContent || '').slice(0, 200) };
      }
    });
    const faqSchema = jsonLd.some((j) => {
      const str = JSON.stringify(j);
      return /FAQPage|Question/i.test(str);
    });
    const orgSchema = jsonLd.some((j) => {
      const str = JSON.stringify(j);
      return /Organization|WebSite|LocalBusiness|Corporation/i.test(str);
    });
    const articleSchema = jsonLd.some((j) => {
      const str = JSON.stringify(j);
      return /Article|BlogPosting|NewsArticle/i.test(str);
    });
    const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const links = [...document.querySelectorAll('a[href]')].map((a) => ({
      text: (a.textContent || '').trim().slice(0, 80),
      href: a.getAttribute('href'),
    }));
    const imgs = [...document.querySelectorAll('img')];
    const imgsWithAlt = imgs.filter((i) => (i.getAttribute('alt') || '').trim().length > 0);

    return {
      title: document.title,
      lang: document.documentElement.lang || null,
      metaDescription: getMeta('meta[name="description"]'),
      metaRobots: getMeta('meta[name="robots"]'),
      ogTitle: getMeta('meta[property="og:title"]'),
      ogDescription: getMeta('meta[property="og:description"]'),
      ogImage: getMeta('meta[property="og:image"]'),
      ogType: getMeta('meta[property="og:type"]'),
      twitterCard: getMeta('meta[name="twitter:card"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
      h1Count: document.querySelectorAll('h1').length,
      headings,
      jsonLdCount: jsonLd.length,
      jsonLd,
      faqSchema,
      orgSchema,
      articleSchema,
      wordCount: bodyText.split(/\s+/).filter(Boolean).length,
      bodyPreview: bodyText.slice(0, 1500),
      hasMain: !!document.querySelector('main'),
      hasNav: !!document.querySelector('nav'),
      hasArticle: !!document.querySelector('article'),
      hasFooter: !!document.querySelector('footer'),
      linkCount: links.length,
      internalLinkSample: links.filter((l) => l.href?.startsWith('/') || l.href?.includes(location.hostname)).slice(0, 15),
      imgCount: imgs.length,
      imgsWithAltCount: imgsWithAlt.length,
      hasFaqSection: /faq|frequently asked/i.test(bodyText),
      hasAboutSection: /about (us|bayone)|who we are/i.test(bodyText),
      hasContactInfo: /contact|email|phone|@\w+\.\w+/i.test(bodyText),
    };
  });

  return { response, data };
}

async function fetchText(page, path) {
  try {
    const base = new URL(TARGET).origin;
    const res = await page.request.get(`${base}${path}`);
    return { status: res.status(), body: (await res.text()).slice(0, 2000) };
  } catch (e) {
    return { status: 0, body: String(e.message) };
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const checks = [];
  let homepage = null;

  try {
    const result = await auditPage(page, TARGET);
    homepage = result.data;
    const status = result.response?.status() ?? 0;

    checks.push({ id: 'http_ok', name: 'Homepage loads (HTTP < 400)', pass: status > 0 && status < 400, detail: `Status ${status}` });
    checks.push({ id: 'title', name: 'Page title present (10+ chars)', pass: (homepage.title || '').length >= 10, detail: homepage.title });
    checks.push({ id: 'meta_desc', name: 'Meta description (50-160 chars)', pass: !!homepage.metaDescription && homepage.metaDescription.length >= 50 && homepage.metaDescription.length <= 160, detail: homepage.metaDescription });
    checks.push({ id: 'h1', name: 'Exactly one H1', pass: homepage.h1Count === 1, detail: `H1 count: ${homepage.h1Count}` });
    checks.push({ id: 'heading_hierarchy', name: 'Heading hierarchy (H1 before H2)', pass: homepage.headings.length > 0 && homepage.headings[0]?.tag === 'H1', detail: homepage.headings.slice(0, 8).map((h) => `${h.tag}: ${h.text}`).join(' | ') });
    checks.push({ id: 'lang', name: 'HTML lang attribute', pass: !!homepage.lang, detail: homepage.lang });
    checks.push({ id: 'canonical', name: 'Canonical URL', pass: !!homepage.canonical, detail: homepage.canonical });
    checks.push({ id: 'og', name: 'Open Graph title + description', pass: !!homepage.ogTitle && !!homepage.ogDescription, detail: `${homepage.ogTitle} / ${homepage.ogDescription?.slice(0, 80)}` });
    checks.push({ id: 'jsonld', name: 'Structured data (JSON-LD)', pass: homepage.jsonLdCount > 0, detail: `${homepage.jsonLdCount} block(s)` });
    checks.push({ id: 'org_schema', name: 'Organization/WebSite schema', pass: homepage.orgSchema, detail: homepage.orgSchema ? 'Found' : 'Missing' });
    checks.push({ id: 'faq_schema', name: 'FAQ schema or FAQ content', pass: homepage.faqSchema || homepage.hasFaqSection, detail: `schema=${homepage.faqSchema}, content=${homepage.hasFaqSection}` });
    checks.push({ id: 'semantic', name: 'Semantic HTML (main + nav)', pass: homepage.hasMain && homepage.hasNav, detail: `main=${homepage.hasMain}, nav=${homepage.hasNav}` });
    checks.push({ id: 'content_depth', name: 'Substantive content (300+ words)', pass: homepage.wordCount >= 300, detail: `${homepage.wordCount} words` });
    checks.push({ id: 'img_alt', name: 'Image alt text (>80% with alt)', pass: homepage.imgCount === 0 || homepage.imgsWithAltCount / homepage.imgCount >= 0.8, detail: `${homepage.imgsWithAltCount}/${homepage.imgCount} images` });
    checks.push({ id: 'contact', name: 'Contact/identity signals in content', pass: homepage.hasContactInfo || homepage.hasAboutSection, detail: `contact=${homepage.hasContactInfo}, about=${homepage.hasAboutSection}` });
    checks.push({ id: 'internal_links', name: 'Internal navigation links', pass: homepage.internalLinkSample.length >= 3, detail: `${homepage.internalLinkSample.length} sample internal links` });

    const robots = await fetchText(page, '/robots.txt');
    const llms = await fetchText(page, '/llms.txt');
    const sitemap = await fetchText(page, '/sitemap.xml');

    checks.push({ id: 'robots', name: 'robots.txt accessible', pass: robots.status === 200, detail: `Status ${robots.status}` });
    checks.push({ id: 'llms', name: 'llms.txt (AI crawler guidance)', pass: llms.status === 200, detail: `Status ${llms.status}` });
    checks.push({ id: 'sitemap', name: 'sitemap.xml accessible', pass: sitemap.status === 200, detail: `Status ${sitemap.status}` });

    const categories = {
      'Discoverability & Crawlability': checks.filter((c) => ['http_ok', 'robots', 'sitemap', 'llms', 'canonical'].includes(c.id)),
      'Metadata & Entity Clarity': checks.filter((c) => ['title', 'meta_desc', 'og', 'lang', 'org_schema', 'jsonld'].includes(c.id)),
      'Content Structure for AI': checks.filter((c) => ['h1', 'heading_hierarchy', 'semantic', 'content_depth', 'faq_schema', 'contact'].includes(c.id)),
      'Accessibility & Richness': checks.filter((c) => ['img_alt', 'internal_links'].includes(c.id)),
    };

    const categoryScores = Object.fromEntries(
      Object.entries(categories).map(([name, items]) => [
        name,
        scoreCategory(items.filter((c) => c.pass).length, items.length),
      ])
    );

    const overall = scoreCategory(checks.filter((c) => c.pass).length, checks.length);

    const report = {
      url: TARGET,
      auditedAt: new Date().toISOString(),
      overallScore: overall,
      grade: overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : overall >= 40 ? 'D' : 'F',
      categoryScores,
      checks,
      supplementary: { robots: robots.body.slice(0, 500), llms: llms.body.slice(0, 500), sitemapPreview: sitemap.body.slice(0, 300) },
      homepage: {
        title: homepage.title,
        metaDescription: homepage.metaDescription,
        wordCount: homepage.wordCount,
        headings: homepage.headings.slice(0, 15),
        jsonLdTypes: homepage.jsonLd.map((j) => j['@type'] || (Array.isArray(j['@graph']) ? j['@graph'].map((g) => g['@type']) : null)),
        bodyPreview: homepage.bodyPreview,
      },
    };

    writeFileSync('aeo-audit-report.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    console.error('AUDIT_FAILED:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
