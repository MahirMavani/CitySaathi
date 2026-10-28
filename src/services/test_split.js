const fs = require('fs');

const dataset = JSON.parse(fs.readFileSync('./data/civic_dataset.json', 'utf8'));

// Test split
const testRatio = 0.2;
const trainData = [];
const testData = [];

// Stratified split (ensure balanced representation across all 5 classes)
const byCat = {};
dataset.forEach(d => {
  if (!byCat[d.category]) byCat[d.category] = [];
  byCat[d.category].push(d);
});

Object.keys(byCat).forEach(cat => {
  const items = byCat[cat];
  const split = Math.floor(items.length * (1 - testRatio));
  trainData.push(...items.slice(0, split));
  testData.push(...items.slice(split));
});

console.log('Train:', trainData.length, 'Test:', testData.length);
