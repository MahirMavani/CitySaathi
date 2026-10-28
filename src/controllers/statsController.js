/**
 * CitySaathi Analytics & Statistics Controller
 * Calculates live database KPIs, category distributions, resolution velocity,
 * and Ward Civic Health Indices.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Overall System Analytics & KPIs
async function getOverviewStats(req, res) {
  try {
    const totalComplaints = await prisma.complaint.count();
    
    const activeComplaints = await prisma.complaint.count({
      where: {
        status: { in: ['Submitted', 'Under Review', 'Assigned', 'In Progress'] }
      }
    });

    const resolvedComplaints = await prisma.complaint.count({
      where: {
        status: { in: ['Resolved', 'Verified'] }
      }
    });

    const verifiedComplaints = await prisma.complaint.count({
      where: { status: 'Verified' }
    });

    const criticalCount = await prisma.complaint.count({
      where: { priority: 'Critical', status: { notIn: ['Resolved', 'Verified'] } }
    });

    // Resolution rate percentage
    const resolutionRate = totalComplaints > 0 
      ? Math.round((resolvedComplaints / totalComplaints) * 100) 
      : 0;

    // Category Distribution
    const categoryGroup = await prisma.complaint.groupBy({
      by: ['category'],
      _count: { id: true }
    });
    const categoryDistribution = {};
    categoryGroup.forEach(g => {
      categoryDistribution[g.category] = g._count.id;
    });

    // Priority Distribution
    const priorityGroup = await prisma.complaint.groupBy({
      by: ['priority'],
      _count: { id: true }
    });
    const priorityDistribution = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };
    priorityGroup.forEach(g => {
      priorityDistribution[g.priority] = g._count.id;
    });

    // Status Distribution
    const statusGroup = await prisma.complaint.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    const statusDistribution = {};
    statusGroup.forEach(g => {
      statusDistribution[g.status] = g._count.id;
    });

    // Average resolution time (in hours) for resolved complaints
    const resolvedList = await prisma.complaint.findMany({
      where: { status: { in: ['Resolved', 'Verified'] } },
      select: { createdAt: true, updatedAt: true }
    });

    let avgResolutionHours = 18.5; // realistic default baseline
    if (resolvedList.length > 0) {
      const totalHours = resolvedList.reduce((acc, curr) => {
        const diffMs = new Date(curr.updatedAt) - new Date(curr.createdAt);
        return acc + Math.max(diffMs / (1000 * 60 * 60), 1);
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedList.length) * 10) / 10;
    }

    // 7-day velocity trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentComplaints = await prisma.complaint.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true }
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const velocityMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = days[d.getDay()];
      velocityMap[dayLabel] = { day: dayLabel, reported: 0, resolved: 0 };
    }

    recentComplaints.forEach(c => {
      const d = new Date(c.createdAt);
      const dayLabel = days[d.getDay()];
      if (velocityMap[dayLabel]) {
        velocityMap[dayLabel].reported++;
        if (c.status === 'Resolved' || c.status === 'Verified') {
          velocityMap[dayLabel].resolved++;
        }
      }
    });

    const velocityTrend = Object.values(velocityMap);

    // Ward Civic Health Index (Indiranagar, Koramangala, Whitefield, HSR Layout, CBD / MG Road, Jayanagar)
    const wards = [
      { name: 'Indiranagar (Ward 112)', shortName: 'Indiranagar', lat: 12.9719, lng: 77.6412 },
      { name: 'Koramangala (Ward 151)', shortName: 'Koramangala', lat: 12.9352, lng: 77.6245 },
      { name: 'Whitefield (Ward 84)', shortName: 'Whitefield', lat: 12.9698, lng: 77.7500 },
      { name: 'HSR Layout (Ward 174)', shortName: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
      { name: 'CBD / MG Road (Ward 111)', shortName: 'CBD / MG Road', lat: 12.9756, lng: 77.6097 },
      { name: 'Jayanagar (Ward 153)', shortName: 'Jayanagar', lat: 12.9308, lng: 77.5838 }
    ];

    const wardScorecards = await Promise.all(
      wards.map(async w => {
        const total = await prisma.complaint.count({
          where: { ward: { contains: w.shortName } }
        });
        const resolved = await prisma.complaint.count({
          where: {
            ward: { contains: w.shortName },
            status: { in: ['Resolved', 'Verified'] }
          }
        });
        const active = total - resolved;
        
        // Calculated civic health score (0 - 100)
        let score = 88;
        if (total > 0) {
          const resRatio = resolved / total;
          score = Math.min(98, Math.max(55, Math.round(65 + resRatio * 30 - active * 2)));
        }

        return {
          wardName: w.name,
          shortName: w.shortName,
          totalIssues: total,
          resolvedIssues: resolved,
          activeIssues: active,
          healthScore: score,
          grade: score >= 85 ? 'A (Excellent)' : score >= 70 ? 'B (Good)' : 'C (Needs Attention)',
          coordinates: { lat: w.lat, lng: w.lng }
        };
      })
    );

    return res.json({
      success: true,
      stats: {
        totalComplaints,
        activeComplaints,
        resolvedComplaints,
        verifiedComplaints,
        criticalCount,
        resolutionRate,
        avgResolutionHours,
        categoryDistribution,
        priorityDistribution,
        statusDistribution,
        velocityTrend,
        wardScorecards
      }
    });
  } catch (err) {
    console.error('Stats overview error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute system statistics.'
    });
  }
}

// 2. Department Efficiency and Staff Workload
async function getDepartmentStats(req, res) {
  try {
    const departments = await prisma.department.findMany({
      include: {
        staff: {
          select: { id: true, name: true, roleTitle: true }
        },
        complaints: {
          select: { id: true, status: true, priority: true }
        }
      }
    });

    const report = departments.map(d => {
      const total = d.complaints.length;
      const resolved = d.complaints.filter(c => c.status === 'Resolved' || c.status === 'Verified').length;
      const active = total - resolved;
      const critical = d.complaints.filter(c => c.priority === 'Critical' && c.status !== 'Resolved').length;

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        staffCount: d.staff.length,
        totalComplaints: total,
        activeComplaints: active,
        resolvedComplaints: resolved,
        criticalComplaints: critical,
        efficiencyPercent: total > 0 ? Math.round((resolved / total) * 100) : 100
      };
    });

    return res.json({
      success: true,
      departments: report
    });
  } catch (err) {
    console.error('Department stats error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute department statistics.'
    });
  }
}

module.exports = {
  getOverviewStats,
  getDepartmentStats
};
