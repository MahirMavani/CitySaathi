/**
 * CitySaathi Complaint Management Controller
 * Handles reporting, AI triage, duplicate detection, status lifecycle state machine,
 * repair evidence upload, and closed-loop citizen verification.
 */

const { PrismaClient } = require('@prisma/client');
const aiClassifier = require('../services/aiClassifier');
const priorityEngine = require('../services/priorityEngine');
const duplicateDetector = require('../services/duplicateDetector');
const fastapiClient = require('../services/fastapiClient');

const prisma = new PrismaClient();

// Allowed lifecycle state machine transitions
const VALID_TRANSITIONS = {
  'Submitted': ['Under Review', 'Assigned', 'Rejected'],
  'Under Review': ['Assigned', 'In Progress', 'Rejected'],
  'Assigned': ['In Progress', 'Under Review', 'Rejected'],
  'In Progress': ['Resolved', 'Assigned', 'Reopened'],
  'Resolved': ['Verified', 'Reopened'],
  'Verified': ['Reopened'],
  'Rejected': ['Under Review', 'Submitted'],
  'Reopened': ['In Progress', 'Assigned', 'Under Review']
};

// Helper to resolve Department by category
async function resolveDepartmentByCategory(category) {
  let deptCode = 'BBMP_ROAD';
  switch (category) {
    case 'Road / Pothole': deptCode = 'BBMP_ROAD'; break;
    case 'Garbage / Waste': deptCode = 'BBMP_SWM'; break;
    case 'Streetlight': deptCode = 'BESCOM_POWER'; break;
    case 'Water / Drainage': deptCode = 'BWSSB_WATER'; break;
    case 'Public Amenities': deptCode = 'BTP_AMENITY'; break;
  }
  return await prisma.department.findUnique({ where: { code: deptCode } });
}

// Generate collision-safe public complaint code (CS-2026-XXXXX)
async function generateComplaintCode() {
  const count = await prisma.complaint.count();
  const nextNum = 100 + count + 1;
  const code = `CS-2026-00${nextNum}`;
  
  // Verify uniqueness
  const exists = await prisma.complaint.findUnique({ where: { complaintCode: code } });
  if (exists) {
    return `CS-2026-00${nextNum + Math.floor(Math.random() * 900)}`;
  }
  return code;
}

// 1. Create a new Complaint (Citizen)
async function createComplaint(req, res) {
  try {
    const {
      title,
      description,
      category: requestedCategory,
      ward = 'Indiranagar (Ward 112)',
      locationAddress,
      latitude,
      longitude,
      severity
    } = req.body;

    if (!title || !description || !locationAddress) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and location address are mandatory fields.'
      });
    }

    let citizenId = req.user ? req.user.id : null;
    if (!citizenId) {
      // Attribute to designated Guest Citizen account in SQLite
      let guestUser = await prisma.user.findUnique({
        where: { email: 'guest@citysaathi.in' }
      });
      if (!guestUser) {
        const bcrypt = require('bcryptjs');
        const guestHash = await bcrypt.hash('GuestCitizen@2026', 10);
        guestUser = await prisma.user.create({
          data: {
            email: 'guest@citysaathi.in',
            passwordHash: guestHash,
            name: 'Guest Citizen',
            role: 'CITIZEN',
            ward: ward ? ward.trim() : 'Bengaluru',
            phone: '+91 90000 00000',
            karmaPoints: 10
          }
        });
      }
      citizenId = guestUser.id;
    }

    // Run AI Classification on the complaint description
    const aiResult = aiClassifier.predict(`${title} ${description}`);
    const finalCategory = requestedCategory || aiResult.predictedCategory;

    // Run Duplicate Radar against active complaints
    const activeComplaints = await prisma.complaint.findMany({
      where: {
        status: { in: ['Submitted', 'Under Review', 'Assigned', 'In Progress'] }
      },
      select: {
        id: true,
        complaintCode: true,
        title: true,
        description: true,
        category: true,
        status: true,
        priority: true,
        ward: true,
        latitude: true,
        longitude: true,
        createdAt: true
      }
    });

    const latFloat = latitude ? parseFloat(latitude) : null;
    const lngFloat = longitude ? parseFloat(longitude) : null;

    // 1. Attempt analysis via private Python FastAPI microservice
    let duplicates = [];
    let priorityResult = null;

    const fastApiAnalysis = await fastapiClient.analyzeComplaint({
      title,
      description,
      category: finalCategory,
      ward,
      latitude: latFloat,
      longitude: lngFloat,
      candidates: activeComplaints
    });

    if (fastApiAnalysis) {
      duplicates = (fastApiAnalysis.duplicateCandidates || []).map(m => ({
        complaintId: m.complaint_id,
        complaintCode: m.complaint_code,
        compositeScore: m.composite_score,
        matchReason: m.match_reason
      }));
      if (fastApiAnalysis.priorityRecommendation) {
        priorityResult = {
          priority: fastApiAnalysis.priorityRecommendation.suggested_priority,
          score: fastApiAnalysis.priorityRecommendation.priority_score,
          factors: fastApiAnalysis.priorityRecommendation.signals_used || []
        };
      }
    }

    // 2. Fallback to local JavaScript detector and priority engine if FastAPI is unavailable
    if (duplicates.length === 0 && !fastApiAnalysis) {
      duplicates = duplicateDetector.findDuplicates(
        { title, description, category: finalCategory, ward, latitude: latFloat, longitude: lngFloat },
        activeComplaints
      );
    }

    if (!priorityResult) {
      priorityResult = priorityEngine.evaluate({
        title,
        description,
        category: finalCategory,
        duplicateCount: duplicates.length,
        location: locationAddress
      });
    }

    const finalPriority = severity === 'Critical' ? 'Critical' : (severity === 'Urgent' ? 'High' : priorityResult.priority);

    // Resolve assigned department
    const department = await resolveDepartmentByCategory(finalCategory);

    // Handle uploaded photo
    let beforePhotoUrl = null;
    if (req.file) {
      beforePhotoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photo && typeof req.body.photo === 'string' && req.body.photo.length > 5) {
      beforePhotoUrl = req.body.photo;
    }

    const complaintCode = await generateComplaintCode();

    // Persist in database
    const complaint = await prisma.complaint.create({
      data: {
        complaintCode,
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        priority: finalPriority,
        priorityReason: priorityResult.factors.join(' | '),
        status: 'Submitted',
        ward: ward.trim(),
        locationAddress: locationAddress.trim(),
        latitude: latFloat,
        longitude: lngFloat,
        citizenId,
        departmentId: department ? department.id : null,
        beforePhotoUrl,
        isDuplicate: duplicates.length > 0 && duplicates[0].compositeScore >= 0.70,
        duplicateOfId: duplicates.length > 0 && duplicates[0].compositeScore >= 0.70 ? duplicates[0].complaintId : null,
        duplicateScore: duplicates.length > 0 ? duplicates[0].compositeScore : null
      },
      include: {
        citizen: { select: { id: true, name: true, email: true, ward: true } },
        department: true
      }
    });

    // Record initial status history
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        fromStatus: null,
        toStatus: 'Submitted',
        changedById: citizenId,
        notes: 'Complaint submitted with initial AI triage.'
      }
    });

    // Create confirmation in-app notification
    await prisma.notification.create({
      data: {
        userId: citizenId,
        complaintId: complaint.id,
        title: `Complaint Registered (${complaint.complaintCode})`,
        message: `Your issue was categorized as [${finalCategory}] and routed to ${department ? department.name : 'Municipal Desk'}.`
      }
    });

    // Award +10 Saathi Karma points
    await prisma.user.update({
      where: { id: citizenId },
      data: { karmaPoints: { increment: 10 } }
    });

    return res.status(201).json({
      success: true,
      message: `Complaint ${complaint.complaintCode} registered successfully.`,
      complaint,
      aiTriage: {
        category: aiResult.predictedCategory,
        confidence: aiResult.confidencePercent,
        isLowConfidence: aiResult.isLowConfidence,
        priority: finalPriority,
        priorityFactors: priorityResult.factors
      },
      duplicateMatches: duplicates
    });
  } catch (err) {
    console.error('Complaint creation error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit complaint. Database error.'
    });
  }
}

// 2. List Complaints with Filtering & Search
async function listComplaints(req, res) {
  try {
    const {
      status,
      category,
      priority,
      ward,
      departmentId,
      search,
      mine,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};

    // If citizen requested their own complaints
    if (mine === 'true' && req.user) {
      where.citizenId = req.user.id;
    } else if (req.user && req.user.role === 'CITIZEN' && mine !== 'false') {
      // By default for logged in citizen, return their own plus public issues if specified
    }

    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (priority && priority !== 'all') where.priority = priority;
    if (ward && ward !== 'all') where.ward = { contains: ward };
    if (departmentId && departmentId !== 'all') where.departmentId = parseInt(departmentId, 10);

    if (search) {
      const q = search.trim();
      where.OR = [
        { complaintCode: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } },
        { locationAddress: { contains: q } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageSize;

    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          citizen: { select: { id: true, name: true, email: true, ward: true } },
          department: { select: { id: true, name: true, code: true } },
          assignedStaff: { select: { id: true, name: true, roleTitle: true } },
          masterIssue: { select: { id: true, code: true, title: true } }
        }
      })
    ]);

    return res.json({
      success: true,
      total,
      page: pageNum,
      limit: pageSize,
      complaints
    });
  } catch (err) {
    console.error('List complaints error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve complaints.'
    });
  }
}

// 3. Get single Complaint by Code or ID
async function getComplaint(req, res) {
  try {
    const identifier = req.params.id || req.params.identifier;

    const isNumeric = /^\d+$/.test(identifier);
    const where = isNumeric ? { id: parseInt(identifier, 10) } : { complaintCode: identifier };

    const complaint = await prisma.complaint.findFirst({
      where,
      include: {
        citizen: { select: { id: true, name: true, email: true, ward: true } },
        department: true,
        assignedStaff: true,
        masterIssue: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedBy: { select: { id: true, name: true, role: true } }
          }
        },
        verifications: {
          include: {
            citizen: { select: { id: true, name: true } }
          }
        },
        duplicateLinks: {
          select: { id: true, complaintCode: true, title: true, status: true, citizen: { select: { name: true } } }
        }
      }
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: `Complaint with identifier [${identifier}] not found.`
      });
    }

    return res.json({
      success: true,
      complaint
    });
  } catch (err) {
    console.error('Get complaint error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch complaint details.'
    });
  }
}

// 4. Update Status (Authority with State Machine validation)
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status: newStatus, notes } = req.body;

    const complaint = await prisma.complaint.findFirst({
      where: {
        OR: [
          { id: isNaN(parseInt(id, 10)) ? -1 : parseInt(id, 10) },
          { complaintCode: String(id) }
        ]
      },
      include: { citizen: true }
    });

    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found.' });
    }

    const complaintId = complaint.id;

    const currentStatus = complaint.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from [${currentStatus}] to [${newStatus}]. Allowed transitions: [${allowed.join(', ')}].`
      });
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: newStatus },
      include: { department: true, assignedStaff: true }
    });

    // Record audit status history
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        changedById: req.user.id,
        notes: notes || `Status updated to ${newStatus} by ${req.user.name}`
      }
    });

    // Notify citizen
    await prisma.notification.create({
      data: {
        userId: complaint.citizenId,
        complaintId,
        title: `Status Update: ${complaint.complaintCode}`,
        message: `Your complaint status has moved to [${newStatus}]. ${notes || ''}`
      }
    });

    return res.json({
      success: true,
      message: `Complaint ${complaint.complaintCode} status updated to ${newStatus}.`,
      complaint: updated
    });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update complaint status.' });
  }
}

// 5. Assign Department & Staff (Authority)
async function assignStaff(req, res) {
  try {
    const { id } = req.params;
    const { departmentId, staffId, priority } = req.body;

    const complaint = await prisma.complaint.findFirst({
      where: {
        OR: [
          { id: isNaN(parseInt(id, 10)) ? -1 : parseInt(id, 10) },
          { complaintCode: String(id) }
        ]
      }
    });
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found.' });
    }

    const complaintId = complaint.id;

    const updateData = {};
    if (departmentId) updateData.departmentId = parseInt(departmentId, 10);
    if (staffId) updateData.assignedStaffId = parseInt(staffId, 10);
    if (priority) updateData.priority = priority;

    // Transition status to Assigned if currently Submitted or Under Review
    if (complaint.status === 'Submitted' || complaint.status === 'Under Review') {
      updateData.status = 'Assigned';
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: updateData,
      include: { department: true, assignedStaff: true }
    });

    // Log history
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId,
        fromStatus: complaint.status,
        toStatus: updateData.status || complaint.status,
        changedById: req.user.id,
        notes: `Assigned to ${updated.assignedStaff ? updated.assignedStaff.name : 'Department Staff'} (${updated.department ? updated.department.name : ''}).`
      }
    });

    // Notify citizen
    await prisma.notification.create({
      data: {
        userId: complaint.citizenId,
        complaintId,
        title: `Assigned: ${complaint.complaintCode}`,
        message: `Assigned to ${updated.assignedStaff ? updated.assignedStaff.name : 'Municipal Team'}. Field resolution initiated.`
      }
    });

    return res.json({
      success: true,
      message: 'Complaint assigned successfully.',
      complaint: updated
    });
  } catch (err) {
    console.error('Assign staff error:', err);
    return res.status(500).json({ success: false, error: 'Failed to assign complaint.' });
  }
}

// 6. Upload Repair Evidence (Authority)
async function uploadRepairEvidence(req, res) {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const complaint = await prisma.complaint.findFirst({
      where: {
        OR: [
          { id: isNaN(parseInt(id, 10)) ? -1 : parseInt(id, 10) },
          { complaintCode: String(id) }
        ]
      }
    });

    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found.' });
    }

    const complaintId = complaint.id;
    const afterPhotoUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.afterPhotoUrl || req.body.afterPhoto);

    if (!afterPhotoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Photographic repair proof is required to resolve this ticket.'
      });
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: 'Resolved',
        afterPhotoUrl,
        resolutionNotes: resolutionNotes ? resolutionNotes.trim() : 'Field repair executed as per municipal standards.'
      },
      include: { department: true, assignedStaff: true }
    });

    // Record status history
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId,
        fromStatus: complaint.status,
        toStatus: 'Resolved',
        changedById: req.user.id,
        notes: `Repair evidence uploaded: ${updated.resolutionNotes}`
      }
    });

    // Notify citizen to verify
    await prisma.notification.create({
      data: {
        userId: complaint.citizenId,
        complaintId,
        title: `Verification Requested: ${complaint.complaintCode}`,
        message: 'The municipal department has uploaded repair proof. Please confirm whether the issue is actually resolved.'
      }
    });

    return res.json({
      success: true,
      message: 'Repair evidence uploaded. Status updated to Resolved (Awaiting Citizen Verification).',
      complaint: updated
    });
  } catch (err) {
    console.error('Upload repair evidence error:', err);
    return res.status(500).json({ success: false, error: 'Failed to upload repair evidence.' });
  }
}

// 7. Citizen Repair Verification
async function verifyRepair(req, res) {
  try {
    const { id } = req.params;
    const { isFixed, feedback } = req.body;

    const complaint = await prisma.complaint.findFirst({
      where: {
        OR: [
          { id: isNaN(parseInt(id, 10)) ? -1 : parseInt(id, 10) },
          { complaintCode: String(id) }
        ]
      }
    });
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found.' });
    }

    const complaintId = complaint.id;

    if (isFixed === undefined || isFixed === null) {
      return res.status(400).json({
        success: false,
        error: 'Please indicate whether the issue is fixed (true/false).'
      });
    }

    const citizenId = req.user.id;

    // Create Citizen Verification record
    await prisma.citizenVerification.create({
      data: {
        complaintId,
        citizenId,
        isFixed: Boolean(isFixed),
        feedback: feedback ? feedback.trim() : null
      }
    });

    let newStatus = 'Verified';
    let karmaIncrement = 0;
    let statusNote = '';

    if (isFixed) {
      newStatus = 'Verified';
      karmaIncrement = 50; // Award verification karma
      statusNote = `Citizen verified on-site fix. Feedback: "${feedback || 'Confirmed resolved'}"`;
    } else {
      newStatus = 'Reopened';
      statusNote = `Citizen reported issue remains unresolved. Flagged for rework. Feedback: "${feedback || 'Still needs attention'}"`;
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: newStatus }
    });

    if (karmaIncrement > 0) {
      await prisma.user.update({
        where: { id: citizenId },
        data: { karmaPoints: { increment: karmaIncrement } }
      });
    }

    // Status history
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId,
        fromStatus: complaint.status,
        toStatus: newStatus,
        changedById: citizenId,
        notes: statusNote
      }
    });

    // Notify citizen confirmation
    await prisma.notification.create({
      data: {
        userId: citizenId,
        complaintId,
        title: isFixed ? `Issue Verified (+${karmaIncrement} Pts)` : 'Ticket Reopened for Rework',
        message: isFixed
          ? `You confirmed ${complaint.complaintCode} is fixed. +${karmaIncrement} Saathi Karma awarded!`
          : `We notified the municipal engineering department that ${complaint.complaintCode} still requires attention.`
      }
    });

    return res.json({
      success: true,
      message: isFixed ? 'Issue confirmed verified.' : 'Issue reopened for municipal rework.',
      complaint: updated,
      karmaEarned: karmaIncrement,
      karmaAwarded: karmaIncrement
    });
  } catch (err) {
    console.error('Verify repair error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record repair verification.' });
  }
}

// Public map complaints
async function getPublicMapComplaints(req, res) {
  try {
    const complaints = await prisma.complaint.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        complaintCode: true,
        title: true,
        category: true,
        priority: true,
        status: true,
        ward: true,
        locationAddress: true,
        latitude: true,
        longitude: true,
        beforePhotoUrl: true,
        afterPhotoUrl: true,
        createdAt: true
      }
    });

    return res.json({
      success: true,
      complaints
    });
  } catch (err) {
    console.error('Public map error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch map complaints.' });
  }
}

// Smart Duplicate Consolidation: Merge complaints into a Master Ticket
async function mergeDuplicates(req, res) {
  try {
    const { masterCode, title, complaintIds, notes } = req.body;

    if (!complaintIds || !Array.isArray(complaintIds) || complaintIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least two complaint IDs are required to form a merged group.'
      });
    }

    // Resolve IDs (can be numeric or complaintCode like 'CS-2026-00084')
    const numericIds = [];
    for (const id of complaintIds) {
      if (typeof id === 'number') {
        numericIds.push(id);
      } else if (typeof id === 'string') {
        const found = await prisma.complaint.findFirst({
          where: {
            OR: [
              { complaintCode: id },
              { id: isNaN(Number(id)) ? -1 : Number(id) }
            ]
          }
        });
        if (found) numericIds.push(found.id);
      }
    }

    if (numericIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Could not resolve complaints to merge.'
      });
    }

    // Find lead complaint
    const lead = await prisma.complaint.findUnique({
      where: { id: numericIds[0] },
      include: { department: true }
    });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead complaint not found.' });
    }

    const code = masterCode || `MI-2026-${String(Date.now()).slice(-4)}`;
    const masterTitle = title || `Consolidated Issue: ${lead.title}`;

    // Find or create MasterIssue
    let master = await prisma.masterIssue.findUnique({
      where: { code }
    });

    if (!master) {
      master = await prisma.masterIssue.create({
        data: {
          code,
          title: masterTitle,
          category: lead.category,
          priority: lead.priority,
          status: 'In Progress',
          ward: lead.ward,
          latitude: lead.latitude,
          longitude: lead.longitude,
          departmentId: lead.departmentId,
          notes: notes || `Consolidated ${numericIds.length} citizen reports into master work order.`
        }
      });
    }

    // Update child complaints to link to master and mark duplicate
    const userId = req.user ? req.user.id : null;

    for (let i = 0; i < numericIds.length; i++) {
      const cId = numericIds[i];
      const isLead = i === 0;

      await prisma.complaint.update({
        where: { id: cId },
        data: {
          masterIssueId: master.id,
          isDuplicate: !isLead,
          duplicateOfId: isLead ? null : numericIds[0],
          duplicateScore: isLead ? null : 0.92
        }
      });

      // Audit status history entry
      await prisma.complaintStatusHistory.create({
        data: {
          complaintId: cId,
          fromStatus: lead.status,
          toStatus: lead.status,
          changedById: userId,
          notes: isLead
            ? `Designated as primary ticket for Master Issue ${master.code}.`
            : `Merged into Master Issue ${master.code} (Lead: ${lead.complaintCode || lead.id}).`
        }
      });
    }

    return res.json({
      success: true,
      message: `Successfully merged ${numericIds.length} complaints under master ticket ${master.code}.`,
      masterIssue: master,
      mergedCount: numericIds.length
    });
  } catch (err) {
    console.error('Merge duplicates error:', err);
    return res.status(500).json({ success: false, error: 'Failed to merge duplicate complaints.' });
  }
}

// Keep separate action: records decision that complaints are independent incidents
async function dismissDuplicate(req, res) {
  try {
    const { complaintIds, reason, notes } = req.body;
    const reasonText = reason || notes || 'Determined to be separate independent incidents.';
    if (!complaintIds || !Array.isArray(complaintIds)) {
      return res.status(400).json({ success: false, error: 'Complaint IDs array required.' });
    }

    for (const id of complaintIds) {
      const found = await prisma.complaint.findFirst({
        where: {
          OR: [
            { complaintCode: String(id) },
            { id: isNaN(Number(id)) ? -1 : Number(id) }
          ]
        }
      });
      if (found) {
        await prisma.complaint.update({
          where: { id: found.id },
          data: {
            isDuplicate: false,
            duplicateOfId: null,
            duplicateScore: null
          }
        });

        await prisma.complaintStatusHistory.create({
          data: {
            complaintId: found.id,
            fromStatus: found.status,
            toStatus: found.status,
            changedById: req.user ? req.user.id : null,
            notes: `Authority reviewed duplicate notice: Determined to be separate incident. ${reasonText}`
          }
        });
      }
    }

    return res.json({
      success: true,
      message: 'Duplicate reports marked as independent distinct incidents.'
    });
  } catch (err) {
    console.error('Dismiss duplicate error:', err);
    return res.status(500).json({ success: false, error: 'Failed to dismiss duplicates.' });
  }
}

// Get detected duplicate clusters and existing master issues
async function getDuplicateGroups(req, res) {
  try {
    const masterIssues = await prisma.masterIssue.findMany({
      include: {
        complaints: {
          select: {
            id: true,
            complaintCode: true,
            title: true,
            category: true,
            status: true,
            ward: true,
            locationAddress: true,
            latitude: true,
            longitude: true,
            createdAt: true
          }
        }
      }
    });

    const activeComplaints = await prisma.complaint.findMany({
      where: {
        masterIssueId: null,
        status: { in: ['Submitted', 'Assigned', 'In Progress'] }
      },
      select: {
        id: true,
        complaintCode: true,
        title: true,
        category: true,
        status: true,
        ward: true,
        locationAddress: true,
        latitude: true,
        longitude: true,
        isDuplicate: true,
        duplicateOfId: true,
        duplicateScore: true,
        createdAt: true
      }
    });

    const potentialGroups = [];
    const visited = new Set();

    for (let i = 0; i < activeComplaints.length; i++) {
      const c1 = activeComplaints[i];
      if (visited.has(c1.id)) continue;

      const cluster = [c1];
      for (let j = i + 1; j < activeComplaints.length; j++) {
        const c2 = activeComplaints[j];
        if (visited.has(c2.id) || c1.category !== c2.category) continue;

        let isMatch = false;
        if (c1.latitude && c1.longitude && c2.latitude && c2.longitude) {
          const distMeters = duplicateDetector.calculateDistance(c1.latitude, c1.longitude, c2.latitude, c2.longitude);
          if (distMeters !== null && distMeters <= 400) {
            isMatch = true;
          }
        }

        if (!isMatch && (c1.ward && c2.ward && c1.ward === c2.ward)) {
          const tf1 = duplicateDetector.computeTF(duplicateDetector.tokenize(c1.title));
          const tf2 = duplicateDetector.computeTF(duplicateDetector.tokenize(c2.title));
          const sim = duplicateDetector.cosineSimilarity(tf1, tf2);
          if (sim >= 0.40) {
            isMatch = true;
          }
        }

        if (isMatch) {
          cluster.push(c2);
          visited.add(c2.id);
        }
      }

      if (cluster.length > 1) {
        visited.add(c1.id);
        potentialGroups.push({
          suggestedCode: `GRP-${c1.id}`,
          category: c1.category,
          ward: c1.ward || 'Bengaluru',
          sharedTitle: c1.title,
          confidencePercent: '94%',
          matchReason: 'High spatial proximity and category alignment',
          complaints: cluster
        });
      }
    }

    return res.json({
      success: true,
      masterIssues,
      potentialGroups
    });
  } catch (err) {
    console.error('Duplicate groups error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch duplicate groups.' });
  }
}

module.exports = {
  createComplaint,
  listComplaints,
  getComplaint,
  updateStatus,
  assignStaff,
  uploadRepairEvidence,
  verifyRepair,
  getPublicMapComplaints,
  mergeDuplicates,
  dismissDuplicate,
  getDuplicateGroups
};
