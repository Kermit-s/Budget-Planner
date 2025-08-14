'use strict';

const path = require('path');
const express = require('express');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression
app.use(compression());

// Basic security headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Static assets (this project root contains index.html, styles.css, script.js)
const staticRoot = __dirname;
app.use(express.static(staticRoot, {
  etag: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  setHeaders: (res, filePath) => {
    if (/(\.js|\.css|\.svg|\.png|\.jpg|\.jpeg|\.gif)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Health endpoint
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Fallback to index.html for unknown routes (useful if deployed behind a router)
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Budget Planner Online running on http://localhost:${PORT}`);
});


