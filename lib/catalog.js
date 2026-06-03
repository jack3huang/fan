// ═══════════════════════════════════════════════
// lib/catalog.js — Catalog Helper Utilities
// Used by build scripts and optional Node.js tools
// ═══════════════════════════════════════════════

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'assets', 'js', 'data.js');

/**
 * Read and parse data.js, returning the MOCKINGJAY_DATA object.
 */
function readData() {
  const src = fs.readFileSync(DATA_PATH, 'utf8');
  // Extract the object literal assigned to window.MOCKINGJAY_DATA
  const match = src.match(/window\.MOCKINGJAY_DATA\s*=\s*(\{[\s\S]*\});\s*$/);
  if (!match) throw new Error('Cannot parse data.js — MOCKINGJAY_DATA not found');
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${match[1]})`)();
}

/**
 * Write an updated data object back to data.js.
 */
function writeData(data) {
  const json = JSON.stringify(data, null, 2);
  const content =
    `// ═══════════════════════════════════════════════\n` +
    `// data.js — Mockingjay Tech · Central Data Store\n` +
    `// Last updated: ${new Date().toISOString().slice(0, 10)}\n` +
    `// ═══════════════════════════════════════════════\n\n` +
    `window.MOCKINGJAY_DATA = ${json};\n`;
  fs.writeFileSync(DATA_PATH, content, 'utf8');
}

/**
 * Get all products, optionally filtered by category type.
 */
function getProducts(type) {
  const { products } = readData();
  if (!type || type === 'ALL') return products;
  return products.filter(p => p.type === type);
}

/**
 * Get all categories.
 */
function getCategories() {
  return readData().categories;
}

/**
 * Find a product by SKU (case-insensitive).
 */
function findProduct(sku) {
  const { products } = readData();
  return products.find(p => p.sku.toLowerCase() === sku.toLowerCase()) || null;
}

/**
 * Add or update a product (matched by SKU).
 */
function upsertProduct(product) {
  const data = readData();
  const idx = data.products.findIndex(p => p.sku === product.sku);
  if (idx >= 0) {
    data.products[idx] = product;
  } else {
    data.products.push(product);
  }
  writeData(data);
  return product;
}

/**
 * Remove a product by SKU.
 */
function deleteProduct(sku) {
  const data = readData();
  const before = data.products.length;
  data.products = data.products.filter(p => p.sku !== sku);
  if (data.products.length === before) return false;
  writeData(data);
  return true;
}

/**
 * Generate sitemap entries from current data.
 */
function generateSitemapEntries(baseUrl) {
  const { products, categories } = readData();
  const entries = [];
  const date = new Date().toISOString().slice(0, 10);

  // Category pages
  entries.push(`  <url>\n    <loc>${baseUrl}/category.html</loc>\n    <lastmod>${date}</lastmod>\n    <priority>0.9</priority>\n  </url>`);
  categories.forEach(c => {
    entries.push(`  <url>\n    <loc>${baseUrl}/category.html?type=${c.type}&amp;name=${encodeURIComponent(c.name)}</loc>\n    <lastmod>${date}</lastmod>\n    <priority>0.85</priority>\n  </url>`);
  });

  // Product pages
  products.forEach(p => {
    entries.push(`  <url>\n    <loc>${baseUrl}/product.html?sku=${p.sku}</loc>\n    <lastmod>${date}</lastmod>\n    <priority>0.8</priority>\n  </url>`);
  });

  return entries;
}

module.exports = {
  readData,
  writeData,
  getProducts,
  getCategories,
  findProduct,
  upsertProduct,
  deleteProduct,
  generateSitemapEntries,
};
