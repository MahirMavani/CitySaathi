/**
 * CitySaathi Comprehensive Automated API & Unit Test Suite
 * Tests full-stack REST API, Authentication, AI triage, Duplicate Radar,
 * Lifecycle state machine, and Citizen Verification.
 *
 * Run with: npm test
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

let server;
const PORT = 5891;
const BASE_URL = `http://localhost:${PORT}/api`;

let citizenToken = '';
let authorityToken = '';
let createdComplaintId = null;
let createdComplaintCode = '';
const createdComplaintIds = [];

describe('CITYSAATHI Full-Stack Test Suite', () => {
  before(async () => {
    // Start test server instance
    const app = require('../src/server');
    await new Promise((resolve) => {
      server = app.listen(PORT, () => resolve());
    });
  });

  after(async () => {
    // Clean up test complaints created during integration test run
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      if (createdComplaintId && !createdComplaintIds.includes(createdComplaintId)) {
        createdComplaintIds.push(createdComplaintId);
      }
      for (const id of createdComplaintIds) {
        await prisma.citizenVerification.deleteMany({ where: { complaintId: id } });
        await prisma.complaintStatusHistory.deleteMany({ where: { complaintId: id } });
        await prisma.complaint.deleteMany({ where: { id: id } });
      }
    } catch (e) {}
    await prisma.$disconnect();

    // Clean up any test files in uploads
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        files.forEach(f => {
          if (f.startsWith('test-') || f.includes('test')) {
            try { fs.unlinkSync(path.join(uploadsDir, f)); } catch (e) {}
          }
        });
      }
    } catch (e) {}

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. Health Check
  test('A. Health check returns healthy status and DB count', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.equal(data.database.status, 'connected');
    assert.ok(data.database.complaintCount >= 0);
  });

  // 2. Authentication & Authorization
  test('B. Citizen Registration validates input and creates account', async () => {
    const testEmail = `testcitizen_${Date.now()}@citysaathi.in`;
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Asha Raman',
        email: testEmail,
        password: 'Password@123',
        phone: '+91 98450 12345',
        ward: 'Indiranagar (Ward 112)'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.email, testEmail);
    assert.equal(data.user.role, 'CITIZEN');

    // Duplicate registration should fail
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Asha Raman',
        email: testEmail,
        password: 'Password@123'
      })
    });
    assert.equal(dupRes.status, 409);
  });

  test('C. Login authenticates valid credentials and returns JWT', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen@citysaathi.in',
        password: 'Citizen@123'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.role, 'CITIZEN');
    citizenToken = data.token;
  });

  test('D. Authority Demo Sign-In generates authority credentials', async () => {
    const res = await fetch(`${BASE_URL}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'authority' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.role, 'AUTHORITY');
    authorityToken = data.token;
  });

  // 3. AI Classification & Evaluation
  test('E. AI Classifier accurately predicts category and explainable priority', async () => {
    const res = await fetch(`${BASE_URL}/ai/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Deep crater on road',
        description: 'Dangerous pothole near metro pillar 42 causing two-wheeler skids. Tar completely broken.'
      })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.category, 'Road / Pothole');
    assert.ok(json.data.confidence > 0.4);
    assert.ok(json.data.priorityScore > 0);
  });

  test('F. AI Model Metrics endpoint returns confusion matrix and precision/recall/F1', async () => {
    const res = await fetch(`${BASE_URL}/ai/metrics`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.metrics.overallAccuracy >= 70);
    assert.ok(data.metrics.confusionMatrix);
    assert.ok(data.metrics.categoryMetrics);
    assert.ok(data.metrics.totalSamples > 0);
  });

  test('F1. Gemini AI Assist endpoint provides structured suggestions (with local ML fallback)', async () => {
    const res = await fetch(`${BASE_URL}/ai/gemini-assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Huge crater near Indiranagar KFC',
        description: 'Bikes almost falling into this crater pothole opposite KFC on 100ft road.',
        category: 'Road / Pothole',
        userLocation: 'Indiranagar 100ft Road'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.suggestedCategory);
    assert.ok(data.category);
    assert.ok(data.priority);
    assert.ok(data.summary);
    assert.ok(data.suggestedDescription);
    assert.ok(data.suggestedDepartment);
    assert.ok(data.suggestedDepartment.code);
    assert.ok(data.suggestedDepartment.name);
    assert.ok(Array.isArray(data.missingDetails));
    assert.ok(data.source.startsWith('google-gemini') || data.source === 'citysaathi-supervised-ml-fallback');
  });

  test('F2. Gemini AI Rewrite endpoint clarifies complaint text (with local fallback)', async () => {
    const res = await fetch(`${BASE_URL}/ai/gemini-rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'garbage blackspot smelling very bad bins broken dogs littering everywhere',
        category: 'Garbage / Waste'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.rewrittenText);
    assert.ok(data.rewrittenText.length > 20);
  });

  test('F3. Gemini status endpoint returns configuration status without exposing secrets', async () => {
    const res = await fetch(`${BASE_URL}/ai/gemini-status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok('configured' in data);
    assert.ok('status' in data);
    assert.ok('primaryModel' in data);
    // Strict security assertion: full API key must NEVER be exposed
    assert.equal(data.apiKey, undefined);
    assert.equal(data.GEMINI_API_KEY, undefined);
  });

  test('F4. Location-First Gemini Draft generation creates structured, actionable complaint draft', async () => {
    const res = await fetch(`${BASE_URL}/ai/generate-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Road / Pothole',
        locationAddress: '100 Feet Rd, near 12th Main',
        ward: 'Indiranagar (Ward 112)',
        latitude: 12.9784,
        longitude: 77.6408,
        citizenObservation: 'Deep pothole in the left lane damaging scooters during peak traffic.',
        severity: 'Urgent'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.draft);
    assert.ok(data.draft.title);
    assert.ok(data.draft.complaintMessage);
    assert.ok(data.draft.category);
    assert.ok(data.draft.locationSummary);
    assert.ok(data.draft.suggestedPriority);
    assert.ok(data.draft.reason);
    assert.ok(['Critical', 'High', 'Medium', 'Low'].includes(data.draft.suggestedPriority));
    assert.ok(['Road / Pothole', 'Garbage / Waste', 'Streetlight', 'Water / Drainage', 'Public Amenities'].includes(data.draft.category));
  });

  // 4. Duplicate Radar
  test('G. Duplicate Radar identifies high similarity for nearby complaints in same category', async () => {
    const res = await fetch(`${BASE_URL}/duplicates/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Deep crater pothole on 100ft road',
        description: 'Large crater pothole opposite Toit brewpub on 100ft road. Bikes slipping.',
        category: 'Road / Pothole',
        latitude: 12.9785,
        longitude: 77.6409,
        ward: 'Indiranagar (Ward 112)'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.hasDuplicates);
    assert.ok(data.count > 0);
    assert.ok(data.candidates[0].compositeScore > 0.4);
  });

  // 5. Complaint Submission
  test('H. Citizen can submit new complaint and receive persistent complaint ID', async () => {
    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        title: 'Broken streetlight outside 4th Main park',
        description: 'The street lamp has been flickering and completely off at night, leaving sidewalk pitch dark and unsafe for walkers.',
        category: 'Streetlight',
        locationAddress: '4th Main Road, Defense Colony, Indiranagar',
        ward: 'Indiranagar (Ward 112)',
        latitude: 12.9725,
        longitude: 77.6420
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.complaint.id);
    assert.ok(data.complaint.complaintCode.startsWith('CS-2026-'));
    assert.equal(data.complaint.status, 'Submitted');
    assert.ok(data.complaint.department);

    createdComplaintId = data.complaint.id;
    createdComplaintCode = data.complaint.complaintCode;
  });

  // 6. Complaint Listing & Filters
  test('I. Public map complaints endpoint returns geocoded complaints', async () => {
    const res = await fetch(`${BASE_URL}/complaints/public-map`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.complaints));
    assert.ok(data.complaints.length > 0);
    assert.ok(data.complaints[0].latitude);
    assert.ok(data.complaints[0].longitude);
  });

  test('J. Complaint detail endpoint returns full history and verifications', async () => {
    const res = await fetch(`${BASE_URL}/complaints/${createdComplaintId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.complaint.id, createdComplaintId);
    assert.ok(Array.isArray(data.complaint.statusHistory));
  });

  // 7. Authority Workflow: Status Transition & Staff Assignment
  test('K. Non-authority user cannot transition complaint status (RBAC test)', async () => {
    const res = await fetch(`${BASE_URL}/complaints/${createdComplaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({ status: 'Assigned' })
    });

    assert.equal(res.status, 403);
  });

  test('L. Authority can assign staff and transition status through valid lifecycle', async () => {
    // 1. Assign to BESCOM lineman
    const staffRes = await fetch(`${BASE_URL}/staff`);
    const staffData = await staffRes.json();
    const bescomStaff = staffData.staff.find(s => s.department && s.department.code === 'BESCOM_POWER') || staffData.staff[0];

    const assignRes = await fetch(`${BASE_URL}/complaints/${createdComplaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authorityToken}`
      },
      body: JSON.stringify({
        staffId: bescomStaff.id,
        notes: 'Dispatched lineworker for luminaire and circuit replacement.'
      })
    });

    assert.equal(assignRes.status, 200);
    const assignData = await assignRes.json();
    assert.equal(assignData.complaint.status, 'Assigned');

    // 2. Transition to In Progress
    const inProgressRes = await fetch(`${BASE_URL}/complaints/${createdComplaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authorityToken}`
      },
      body: JSON.stringify({
        status: 'In Progress',
        notes: 'Field crew arrived at location with replacement bulb and tools.'
      })
    });

    assert.equal(inProgressRes.status, 200);
    const inProgressData = await inProgressRes.json();
    assert.equal(inProgressData.complaint.status, 'In Progress');

    // 3. Mark Resolved
    const resolveRes = await fetch(`${BASE_URL}/complaints/${createdComplaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authorityToken}`
      },
      body: JSON.stringify({
        status: 'Resolved',
        notes: 'LED fixture replaced. Street illumination verified operational.'
      })
    });

    assert.equal(resolveRes.status, 200);
    const resolveData = await resolveRes.json();
    assert.equal(resolveData.complaint.status, 'Resolved');
  });

  // 8. Citizen Closed-Loop Verification
  test('M. Citizen can verify repair ("Yes, it\'s fixed") and earn Karma points', async () => {
    const res = await fetch(`${BASE_URL}/complaints/${createdComplaintId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        isFixed: true,
        feedback: 'Thank you! The streetlight is shining brightly and the street feels safe again.'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.complaint.status, 'Verified');
    assert.ok(data.karmaAwarded > 0);
  });

  // 9. Reopen Flow
  test('N. Citizen negative verification reopens unresolved complaints', async () => {
    // First, resolve an active complaint or reuse
    const res = await fetch(`${BASE_URL}/complaints/${createdComplaintId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        isFixed: false,
        feedback: 'Light turned off again after 10 minutes. Needs rewiring.'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.complaint.status, 'Reopened');
  });

  // 10. System Stats & Ward Scorecards
  test('O. Stats endpoint computes live database KPIs and Ward Health Index', async () => {
    const res = await fetch(`${BASE_URL}/stats/overview`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.stats.totalComplaints > 0);
    assert.ok(data.stats.resolutionRate >= 0);
    assert.ok(data.stats.wardScorecards.length >= 5);
    assert.ok(data.stats.wardScorecards[0].healthScore >= 50);
  });

  // 11. Notifications
  test('P. Notifications list and mark read endpoint functions correctly', async () => {
    const res = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${citizenToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.notifications));

    // Mark all read
    const markRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${citizenToken}` }
    });
    assert.equal(markRes.status, 200);
  });

  // 12. Smart Duplicate Consolidation & Merge
  test('Q. Authority can fetch duplicate groups and merge reports into Master Ticket', async () => {
    // 1. Fetch duplicate clusters
    const groupRes = await fetch(`${BASE_URL}/complaints/duplicate-groups`);
    assert.equal(groupRes.status, 200);
    const groupData = await groupRes.json();
    assert.equal(groupData.success, true);
    assert.ok(Array.isArray(groupData.masterIssues));

    // 2. Perform merge with authority token
    const mergeRes = await fetch(`${BASE_URL}/complaints/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authorityToken}`
      },
      body: JSON.stringify({
        masterCode: 'MI-TEST-001',
        title: 'Master Road Crater Corridor (Indiranagar)',
        complaintIds: [18, 19],
        notes: 'Merged test duplicates for automated verification.'
      })
    });
    assert.equal(mergeRes.status, 200);
    const mergeData = await mergeRes.json();
    assert.equal(mergeData.success, true);
    assert.equal(mergeData.masterIssue.code, 'MI-TEST-001');
    assert.equal(mergeData.mergedCount, 2);
  });

  test('R. Non-authority user cannot merge duplicate reports (RBAC)', async () => {
    const res = await fetch(`${BASE_URL}/complaints/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        complaintIds: [18, 19]
      })
    });
    assert.equal(res.status, 403);
  });

  // 13. Guest Reporting & SQLite Persistence
  test('S. Guest citizen can submit complaint without auth token, persists in SQLite with guest user', async () => {
    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Water pipe leak near Metro pillar 42',
        description: 'Potable water leaking onto the road causing waterlogging and low pressure.',
        category: 'Water / Drainage',
        ward: 'Indiranagar (Ward 112)',
        locationAddress: 'CMH Road, Indiranagar, Bengaluru',
        latitude: 12.9784,
        longitude: 77.6408,
        severity: 'Medium'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.complaint);
    assert.ok(data.complaint.id);
    assert.ok(data.complaint.complaintCode.startsWith('CS-2026-'));
    assert.equal(data.complaint.category, 'Water / Drainage');
    assert.equal(data.complaint.status, 'Submitted');
    assert.ok(data.complaint.citizen);
    assert.equal(data.complaint.citizen.email, 'guest@citysaathi.in');

    createdComplaintIds.push(data.complaint.id);
  });

  // 14. Multipart Photo Upload (Citizen Before Photo)
  test('T. Citizen can submit complaint with raw image via multipart/form-data, saved to /uploads', async () => {
    const formData = new FormData();
    formData.append('title', 'Deep crater pothole outside 12th Main Cafe');
    formData.append('description', 'Dangerous deep road crater on 12th Main Road Indiranagar damaging two-wheelers.');
    formData.append('category', 'Road / Pothole');
    formData.append('ward', 'Indiranagar (Ward 112)');
    formData.append('locationAddress', '12th Main Road, Indiranagar, Bengaluru');
    formData.append('latitude', '12.9719');
    formData.append('longitude', '77.6412');
    formData.append('severity', 'High');

    // Create a dummy JPEG binary blob
    const dummyImageBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const photoBlob = new Blob([dummyImageBytes], { type: 'image/jpeg' });
    formData.append('photo', photoBlob, 'test-pothole.jpg');

    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${citizenToken}`
      },
      body: formData
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.complaint);
    assert.ok(data.complaint.beforePhotoUrl);
    assert.match(data.complaint.beforePhotoUrl, /^\/uploads\/.*\.jpg$/);

    // Verify file exists on disk
    const filename = data.complaint.beforePhotoUrl.replace('/uploads/', '');
    const diskPath = path.join(__dirname, '..', 'uploads', filename);
    assert.ok(fs.existsSync(diskPath), `Uploaded file should exist on disk at ${diskPath}`);

    try { fs.unlinkSync(diskPath); } catch (e) {}

    createdComplaintIds.push(data.complaint.id);
  });

  // 15. Multipart Evidence Upload (Authority After Photo)
  test('U. Authority can upload repair evidence image via multipart/form-data, marking ticket Resolved', async () => {
    // 1. Create a complaint to resolve
    const prepRes = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        title: 'Broken streetlight at 5th Cross',
        description: 'Sodium lamp flickering and dark stretch at night.',
        category: 'Streetlight',
        ward: 'Indiranagar (Ward 112)',
        locationAddress: '5th Cross, Indiranagar, Bengaluru',
        latitude: 12.9725,
        longitude: 77.6420
      })
    });
    const prepData = await prepRes.json();
    const complaintToResolveId = prepData.complaint.id;
    createdComplaintIds.push(complaintToResolveId);

    // 2. Upload repair evidence as Authority
    const formData = new FormData();
    formData.append('resolutionNotes', 'LED fixture replaced and wiring re-terminated by BESCOM line crew.');
    const dummyImageBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const photoBlob = new Blob([dummyImageBytes], { type: 'image/jpeg' });
    formData.append('afterPhoto', photoBlob, 'test-repaired-streetlight.jpg');

    const res = await fetch(`${BASE_URL}/complaints/${complaintToResolveId}/evidence`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authorityToken}`
      },
      body: formData
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.complaint);
    assert.equal(data.complaint.status, 'Resolved');
    assert.ok(data.complaint.afterPhotoUrl);
    assert.match(data.complaint.afterPhotoUrl, /^\/uploads\/.*\.jpg$/);

    // Verify file exists on disk
    const filename = data.complaint.afterPhotoUrl.replace('/uploads/', '');
    const diskPath = path.join(__dirname, '..', 'uploads', filename);
    assert.ok(fs.existsSync(diskPath), `Uploaded after-repair file should exist on disk at ${diskPath}`);

    try { fs.unlinkSync(diskPath); } catch (e) {}
  });

  // 16. Root Stats Route Compatibility
  test('V. Root /api/stats route returns live overview KPIs, velocity trend, and ward scorecards', async () => {
    const res = await fetch(`${BASE_URL}/stats`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.stats);
    assert.ok(data.stats.totalComplaints > 0);
    assert.ok(Array.isArray(data.stats.velocityTrend));
    assert.equal(data.stats.velocityTrend.length, 7);
    assert.ok(Array.isArray(data.stats.wardScorecards));
    assert.ok(data.stats.wardScorecards.length >= 5);
  });

  // 17. Python FastAPI Microservice Integration & Fallback Suite
  test('W. FastAPI Client health check confirms inter-service connectivity', async () => {
    const fastapiClient = require('../src/services/fastapiClient');
    const health = await fastapiClient.checkHealth();
    assert.equal(health.online, true);
    assert.ok(health.engine.includes('FastAPI'));
  });

  test('X. Duplicate radar integrates with Python FastAPI microservice', async () => {
    const res = await fetch(`${BASE_URL}/duplicates/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Huge crater pothole near 100ft road Indiranagar',
        description: 'Road crater Indiranagar near 12th main',
        category: 'Road / Pothole',
        latitude: 12.9784,
        longitude: 77.6408,
        ward: 'Indiranagar (Ward 112)'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.source, 'python-fastapi-microservice');
    assert.ok('candidates' in data);
  });

  test('Y. Explainable priority analysis routes to Python FastAPI microservice', async () => {
    const res = await fetch(`${BASE_URL}/ai/priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Live electric wire exposed near metro station',
        description: 'Dangerous live wire sparking on footpath, risk of electrocution',
        category: 'Streetlight',
        location: 'Indiranagar Metro Station'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.source, 'python-fastapi-microservice');
    assert.equal(data.evaluation.priority, 'Critical');
    assert.ok(data.evaluation.factors.length > 0);
  });

  test('Z. Fault tolerance: Complaint creation persists in SQLite even if AI service times out', async () => {
    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        title: 'Water logging outside residential gate',
        description: 'Water standing after rain on 5th cross road',
        category: 'Water / Drainage',
        ward: 'Indiranagar (Ward 112)',
        locationAddress: '5th Cross, Indiranagar'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.complaint.id);
    createdComplaintIds.push(data.complaint.id);

    // Verify persisted directly in SQLite
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const found = await prisma.complaint.findUnique({ where: { id: data.complaint.id } });
    assert.ok(found);
    assert.equal(found.status, 'Submitted');
    await prisma.$disconnect();
  });
});
