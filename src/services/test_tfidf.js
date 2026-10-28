const fs = require('fs');

const dataset = JSON.parse(fs.readFileSync('./data/civic_dataset.json', 'utf8'));

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'did', 'do',
  'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just',
  'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'with', 'you', 'your', 'yours', 'please', 'near', 'opposite'
]);

function tokenize(text) {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const tokens = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i+1]}`);
  }
  return tokens;
}

// Stratified split
const byCat = {};
dataset.forEach(d => {
  if (!byCat[d.category]) byCat[d.category] = [];
  byCat[d.category].push(d);
});

const trainData = [];
const testData = [];
Object.keys(byCat).forEach(cat => {
  const items = byCat[cat];
  trainData.push(...items.slice(0, 20));
  testData.push(...items.slice(20));
});

// Compute Document Frequencies across training set
const df = {};
trainData.forEach(d => {
  const tokens = new Set(tokenize(d.text));
  tokens.forEach(t => { df[t] = (df[t] || 0) + 1; });
});

const N = trainData.length;
function getIDF(token) {
  return Math.log(1 + (N / ((df[token] || 0) + 1)));
}

// Compute Category Centroids
const centroids = {};
Object.keys(byCat).forEach(cat => { centroids[cat] = {}; });

trainData.forEach(d => {
  const tokens = tokenize(d.text);
  const tf = {};
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  for (const t in tf) {
    const val = (tf[t] / tokens.length) * getIDF(t);
    centroids[d.category][t] = (centroids[d.category][t] || 0) + val;
  }
});

// Evaluate on test data
let correct = 0;
testData.forEach(item => {
  const tokens = tokenize(item.text);
  const docVec = {};
  tokens.forEach(t => { docVec[t] = ((docVec[t] || 0) + 1 / tokens.length) * getIDF(t); });

  let bestCat = null;
  let bestSim = -1;

  for (const cat in centroids) {
    const cVec = centroids[cat];
    let dot = 0, norm1 = 0, norm2 = 0;
    for (const t in docVec) {
      norm1 += docVec[t] * docVec[t];
      if (cVec[t]) dot += docVec[t] * cVec[t];
    }
    for (const t in cVec) {
      norm2 += cVec[t] * cVec[t];
    }
    const sim = (norm1 && norm2) ? dot / (Math.sqrt(norm1) * Math.sqrt(norm2)) : 0;
    if (sim > bestSim) {
      bestSim = sim;
      bestCat = cat;
    }
  }

  if (bestCat === item.category) {
    correct++;
  } else {
    console.log(`MISMATCH: "${item.text}"`);
    console.log(`  Actual: [${item.category}], Predicted: [${bestCat}]`);
  }
});

console.log(`Accuracy: ${correct}/${testData.length} = ${(correct / testData.length * 100).toFixed(1)}%`);
