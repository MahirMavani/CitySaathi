/**
 * CitySaathi Duplicate Hub Controller
 * Proactive duplicate detection radar, cluster grouping, and master ticket consolidation.
 */

const { PrismaClient } = require('@prisma/client');
const duplicateDetector = require('../services/duplicateDetector');
const fastapiClient = require('../services/fastapiClient');

const prisma = new PrismaClient();

// 1. Check an incoming report draft or query for existing duplicates in the area
async function checkDuplicates(req, res) {
  try {
    const { title, description, category, latitude, longitude, ward } = req.body;

    if (!title && !description) {
      return res.status(400).json({
        success: false,
        error: 'Title or description is required for duplicate comparison.'
      });
    }

    const whereClause = {
      status: { in: ['Submitted', 'Under Review', 'Assigned', 'In Progress'] }
    };
    if (category) {
      whereClause.category = category;
    }

    const activeComplaints = await prisma.complaint.findMany({
      where: whereClause,
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

    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    // 1. Attempt detection via private Python FastAPI microservice
    const fastApiResult = await fastapiClient.checkDuplicates({
      title,
      description,
      category,
      latitude: lat,
      longitude: lng,
      ward,
      candidates: activeComplaints
    });

    if (fastApiResult) {
      return res.json({
        success: true,
        source: 'python-fastapi-microservice',
        hasDuplicates: fastApiResult.hasDuplicates,
        count: fastApiResult.count,
        highestSimilarity: fastApiResult.highestSimilarity,
        candidates: fastApiResult.candidates
      });
    }

    // 2. Fallback to local JavaScript duplicate detector if FastAPI is unavailable or times out
    const matches = duplicateDetector.findDuplicates(
      {
        title: title || '',
        description: description || '',
        category: category || '',
        latitude: lat,
        longitude: lng,
        ward: ward || ''
      },
      activeComplaints
    );

    return res.json({
      success: true,
      source: 'citysaathi-local-js-detector',
      hasDuplicates: matches.length > 0,
      count: matches.length,
      highestSimilarity: matches.length > 0 ? matches[0].compositeScore : 0,
      candidates: matches
    });
  } catch (err) {
    console.error('Duplicate check error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform duplicate check.'
    });
  }
}

// 2. Merge multiple complaints into a Master Civic Issue (Authority action)
async function mergeIntoMaster(req, res) {
  try {
    const {
      masterTitle,
      category,
      ward,
      primaryComplaintId,
      duplicateComplaintIds = [],
      complaintIds = [],
      notes = ''
    } = req.body;

    let targetPrimaryId = primaryComplaintId ? parseInt(primaryComplaintId, 10) : null;
    let targetDupIds = Array.isArray(duplicateComplaintIds) ? duplicateComplaintIds.map(id => parseInt(id, 10)) : [];

    if (!targetPrimaryId && Array.isArray(complaintIds) && complaintIds.length > 0) {
      targetPrimaryId = parseInt(complaintIds[0], 10);
      targetDupIds = complaintIds.slice(1).map(id => parseInt(id, 10));
    }

    if (!targetPrimaryId && isNaN(targetPrimaryId)) {
      return res.status(400).json({
        success: false,
        error: 'At least one primary complaint or duplicate list must be specified.'
      });
    }

    // Determine target primary complaint
    const primary = await prisma.complaint.findFirst({
      where: {
        OR: [
          { id: isNaN(targetPrimaryId) ? -1 : targetPrimaryId },
          { complaintCode: String(primaryComplaintId || complaintIds[0] || '') }
        ]
      }
    });

    if (!primary) {
      return res.status(404).json({
        success: false,
        error: `Primary complaint #${primaryComplaintId || targetPrimaryId} not found.`
      });
    }

    // Create a new Master Issue or link to existing
    let masterIssue = null;
    const count = await prisma.masterIssue.count();
    const code = `MI-2026-00${count + 1}`;

    masterIssue = await prisma.masterIssue.create({
      data: {
        code,
        title: masterTitle || `Consolidated Issue: ${primary.title}`,
        category: category || primary.category,
        priority: primary.priority,
        status: 'In Progress',
        ward: ward || primary.ward,
        latitude: primary.latitude,
        longitude: primary.longitude,
        notes: notes || `Merged from primary complaint ${primary.complaintCode} and duplicates.`,
        departmentId: primary.departmentId
      }
    });

    // Link primary complaint to master issue
    await prisma.complaint.update({
      where: { id: primary.id },
      data: { masterIssueId: masterIssue.id }
    });

    // Process duplicate complaints
    const idsToMerge = targetDupIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id !== primary.id);

    if (idsToMerge.length > 0) {
      await prisma.complaint.updateMany({
        where: { id: { in: idsToMerge } },
        data: {
          isDuplicate: true,
          duplicateOfId: primary.id,
          masterIssueId: masterIssue.id,
          status: 'Under Review'
        }
      });

      // Notify citizen reporters of merged complaints
      for (const dupId of idsToMerge) {
        const dupComplaint = await prisma.complaint.findUnique({
          where: { id: dupId },
          include: { citizen: true }
        });

        if (dupComplaint) {
          await prisma.notification.create({
            data: {
              userId: dupComplaint.citizenId,
              complaintId: dupComplaint.id,
              title: `Report Linked to Master Issue [${masterIssue.code}]`,
              message: `Your report ${dupComplaint.complaintCode} has been linked with primary incident ${primary.complaintCode} for unified municipal dispatch. You will receive updates as the team resolves this hotspot.`,
              type: 'info'
            }
          });

          await prisma.complaintStatusHistory.create({
            data: {
              complaintId: dupId,
              fromStatus: dupComplaint.status,
              toStatus: 'Under Review',
              changedById: req.user.id,
              notes: `Consolidated under Master Issue ${masterIssue.code} (Primary: ${primary.complaintCode}).`
            }
          });
        }
      }
    }

    // Record audit event
    await prisma.auditEvent.create({
      data: {
        eventType: 'DUPLICATE_MERGE',
        userId: req.user.id,
        complaintId: primary.id,
        details: JSON.stringify({
          masterIssueCode: masterIssue.code,
          primaryComplaintCode: primary.complaintCode,
          mergedComplaintCount: idsToMerge.length,
          mergedIds: idsToMerge
        })
      }
    });

    return res.json({
      success: true,
      message: `Successfully created Master Issue ${masterIssue.code} and linked ${idsToMerge.length + 1} complaints.`,
      masterIssue: {
        id: masterIssue.id,
        code: masterIssue.code,
        title: masterIssue.title,
        linkedCount: idsToMerge.length + 1
      }
    });
  } catch (err) {
    console.error('Merge master error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to merge complaints into Master Issue.'
    });
  }
}

// 3. List Master Civic Issues with associated tickets
async function listMasterIssues(req, res) {
  try {
    const issues = await prisma.masterIssue.findMany({
      include: {
        department: true,
        complaints: {
          select: {
            id: true,
            complaintCode: true,
            title: true,
            status: true,
            priority: true,
            isDuplicate: true,
            createdAt: true,
            citizen: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      total: issues.length,
      masterIssues: issues
    });
  } catch (err) {
    console.error('List master issues error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch master issues.'
    });
  }
}

module.exports = {
  checkDuplicates,
  mergeIntoMaster,
  listMasterIssues
};
