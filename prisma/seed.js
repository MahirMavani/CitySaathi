/**
 * CitySaathi Database Seed Script
 * Pre-populates departments, municipal staff, demo citizen & authority accounts,
 * realistic complaints across Bengaluru wards, status histories, and repair evidence.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CitySaathi database seed...');

  // 1. Clean existing records in proper relational order
  await prisma.auditEvent.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.citizenVerification.deleteMany({});
  await prisma.complaintStatusHistory.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.masterIssue.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleaned existing database records.');

  // 2. Seed Departments
  const departmentsData = [
    {
      code: 'BBMP_ROAD',
      name: 'BBMP Road Infrastructure',
      description: 'Major roads, pothole repairs, asphalt resurfacing, footpaths, and stormwater drainage bridges.',
      contactEmail: 'roads@bbmp.gov.in'
    },
    {
      code: 'BBMP_SWM',
      name: 'Solid Waste Management (SWM)',
      description: 'Daily municipal garbage collection, blackspot clearing, commercial dump remediation, and segregation.',
      contactEmail: 'swm@bbmp.gov.in'
    },
    {
      code: 'BESCOM_POWER',
      name: 'BESCOM Electrical Cell',
      description: 'Public illumination, sodium-vapor & LED streetlights, underground cables, and transformer safety.',
      contactEmail: 'streetlights@bescom.karnataka.gov.in'
    },
    {
      code: 'BWSSB_WATER',
      name: 'BWSSB Water & Drainage',
      description: 'Cauvery potable water supply pipelines, sewer line clearing, manhole maintenance, and leakage response.',
      contactEmail: 'watercomplaints@bwssb.gov.in'
    },
    {
      code: 'BTP_AMENITY',
      name: 'Public Amenities & Traffic Engineering',
      description: 'Traffic signals, public parks, pedestrian skywalks, bus shelters, zebra crossings, and public signage.',
      contactEmail: 'civicamenities@bbmp.gov.in'
    }
  ];

  const departments = {};
  for (const dept of departmentsData) {
    const created = await prisma.department.create({ data: dept });
    departments[dept.code] = created;
  }
  console.log(`✅ Seeded ${Object.keys(departments).length} municipal departments.`);

  // 3. Seed Municipal Staff
  const staffData = [
    {
      name: 'AE Ramesh Kumar',
      roleTitle: 'Assistant Engineer (Road Infrastructure)',
      email: 'ramesh.kumar@bbmp.gov.in',
      phone: '+91 94806 85201',
      departmentId: departments['BBMP_ROAD'].id
    },
    {
      name: 'JE Sneha Patil',
      roleTitle: 'Junior Engineer (South Zone Roads)',
      email: 'sneha.patil@bbmp.gov.in',
      phone: '+91 94806 85202',
      departmentId: departments['BBMP_ROAD'].id
    },
    {
      name: 'Insp. C. Manjunath',
      roleTitle: 'Chief Sanitary Inspector (East Zone SWM)',
      email: 'c.manjunath@bbmp.gov.in',
      phone: '+91 94806 85301',
      departmentId: departments['BBMP_SWM'].id
    },
    {
      name: 'Eng. Girish Rao',
      roleTitle: 'Executive Engineer (BESCOM E4 Sub-division)',
      email: 'girish.rao@bescom.karnataka.gov.in',
      phone: '+91 94806 85401',
      departmentId: departments['BESCOM_POWER'].id
    },
    {
      name: 'AE V. Murthy',
      roleTitle: 'Assistant Executive Engineer (BWSSB South)',
      email: 'v.murthy@bwssb.gov.in',
      phone: '+91 94806 85501',
      departmentId: departments['BWSSB_WATER'].id
    }
  ];

  const staffList = [];
  for (const s of staffData) {
    const created = await prisma.staff.create({ data: s });
    staffList.push(created);
  }
  console.log(`✅ Seeded ${staffList.length} municipal field engineers & inspectors.`);

  // 4. Seed Users (Citizens & Authorities)
  const citizenPasswordHash = await bcrypt.hash('Citizen@123', 10);
  const authorityPasswordHash = await bcrypt.hash('Authority@123', 10);

  const citizenUser1 = await prisma.user.create({
    data: {
      email: 'citizen@citysaathi.in',
      passwordHash: citizenPasswordHash,
      name: 'Ananya Rao',
      role: 'CITIZEN',
      phone: '+91 98450 12345',
      ward: 'Indiranagar (Ward 112)',
      karmaPoints: 420
    }
  });

  const citizenUser2 = await prisma.user.create({
    data: {
      email: 'citizen2@citysaathi.in',
      passwordHash: citizenPasswordHash,
      name: 'Vikram Kulkarni',
      role: 'CITIZEN',
      phone: '+91 98450 54321',
      ward: 'Koramangala (Ward 151)',
      karmaPoints: 310
    }
  });

  const authorityUser1 = await prisma.user.create({
    data: {
      email: 'authority@bbmp.gov.in',
      passwordHash: authorityPasswordHash,
      name: 'AE Ramesh Kumar',
      role: 'AUTHORITY',
      phone: '+91 80 2266 0000',
      ward: 'Indiranagar (Ward 112)',
      karmaPoints: 0
    }
  });

  const authorityUser2 = await prisma.user.create({
    data: {
      email: 'swm@bbmp.gov.in',
      passwordHash: authorityPasswordHash,
      name: 'Insp. C. Manjunath',
      role: 'AUTHORITY',
      phone: '+91 80 2266 1111',
      ward: 'Koramangala (Ward 151)',
      karmaPoints: 0
    }
  });

  console.log('✅ Seeded demo Citizen and Authority user accounts.');

  // 5. Seed Master Issue Group (For Duplicate Consolidation Demonstration)
  const masterIssue1 = await prisma.masterIssue.create({
    data: {
      code: 'MI-2026-001',
      title: 'Major Road Crater and Cave-in on 100ft Road Indiranagar',
      category: 'Road / Pothole',
      priority: 'Critical',
      status: 'In Progress',
      ward: 'Indiranagar (Ward 112)',
      latitude: 12.9784,
      longitude: 77.6408,
      departmentId: departments['BBMP_ROAD'].id,
      notes: 'Consolidated master ticket representing multiple citizen reports along 100ft road corridor.'
    }
  });

  // 6. Seed Realistic Complaints
  // Pothole - In Progress (Linked to Master Issue)
  const complaint1 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00084',
      title: 'Deep crater pothole opposite Toit on 100ft road',
      description: 'Massive crater pothole right on the arterial lane. Two two-wheelers slipped during evening rain. Immediate asphalt patching needed before peak traffic.',
      category: 'Road / Pothole',
      priority: 'Critical',
      priorityReason: 'Critical Hazard Trigger: Detected terms [crater, slipped, rain] on major arterial corridor.',
      status: 'In Progress',
      ward: 'Indiranagar (Ward 112)',
      locationAddress: '100ft Road, Near 12th Main Junction, Indiranagar',
      latitude: 12.9784,
      longitude: 77.6408,
      citizenId: citizenUser1.id,
      departmentId: departments['BBMP_ROAD'].id,
      assignedStaffId: staffList[0].id,
      masterIssueId: masterIssue1.id,
      beforePhotoUrl: '/uploads/demo-pothole-before.svg',
      createdAt: new Date(Date.now() - 48 * 3600 * 1000)
    }
  });

  // Duplicate of Complaint 1
  const complaint1Dup = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00088',
      title: 'Dangerous road crater near 100ft road junction',
      description: 'Large deep pothole on 100ft road near 12th main corner causing bikes to swerve into traffic.',
      category: 'Road / Pothole',
      priority: 'Critical',
      priorityReason: 'Critical Hazard Trigger: Detected road crater in proximity to existing high-risk defect.',
      status: 'In Progress',
      ward: 'Indiranagar (Ward 112)',
      locationAddress: '100ft Road, Indiranagar',
      latitude: 12.9786,
      longitude: 77.6410,
      citizenId: citizenUser2.id,
      departmentId: departments['BBMP_ROAD'].id,
      assignedStaffId: staffList[0].id,
      masterIssueId: masterIssue1.id,
      isDuplicate: true,
      duplicateOfId: complaint1.id,
      duplicateScore: 0.88,
      beforePhotoUrl: '/uploads/demo-pothole-before.svg',
      createdAt: new Date(Date.now() - 36 * 3600 * 1000)
    }
  });

  // Garbage - Resolved, Awaiting Verification
  const complaint2 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00091',
      title: 'Commercial garbage dump on footpath near 5th Block',
      description: 'Continuous dumping of hotel food waste and wet garbage on public footpath. Foul odor and stray dogs causing pedestrian obstruction.',
      category: 'Garbage / Waste',
      priority: 'High',
      priorityReason: 'High Severity Trigger: Detected commercial food waste blackspot causing public health hazard.',
      status: 'Resolved',
      ward: 'Koramangala (Ward 151)',
      locationAddress: '80ft Road, Opposite Sony World Signal, Koramangala',
      latitude: 12.9352,
      longitude: 77.6245,
      citizenId: citizenUser2.id,
      departmentId: departments['BBMP_SWM'].id,
      assignedStaffId: staffList[2].id,
      beforePhotoUrl: '/uploads/demo-garbage-before.svg',
      afterPhotoUrl: '/uploads/demo-garbage-after.svg',
      resolutionNotes: 'Footpath fully cleared by mechanical sweeper; lime powder bleaching sprayed and warning notices issued to commercial vendors.',
      createdAt: new Date(Date.now() - 72 * 3600 * 1000)
    }
  });

  // Streetlight - Verified by Citizen
  const complaint3 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00072',
      title: 'Dark stretch due to 4 non-functional streetlights',
      description: 'Four consecutive sodium-vapor streetlights are out of order for 3 nights. Road is pitch dark and hazardous for pedestrians crossing near bus stop.',
      category: 'Streetlight',
      priority: 'Medium',
      priorityReason: 'Public Night Safety: Public illumination defect on active transit path.',
      status: 'Verified',
      ward: 'Whitefield (Ward 84)',
      locationAddress: 'ITPL Main Road, Near Hope Farm Circle, Whitefield',
      latitude: 12.9850,
      longitude: 77.7440,
      citizenId: citizenUser1.id,
      departmentId: departments['BESCOM_POWER'].id,
      assignedStaffId: staffList[3].id,
      beforePhotoUrl: '/uploads/demo-streetlight-before.svg',
      afterPhotoUrl: '/uploads/demo-streetlight-after.svg',
      resolutionNotes: 'Blown underground junction fuse replaced; LED luminaires installed and tested.',
      createdAt: new Date(Date.now() - 96 * 3600 * 1000)
    }
  });

  // Water / Drainage - In Progress
  const complaint4 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00105',
      title: 'BWSSB potable water pipeline burst flooding 27th Main',
      description: 'High-pressure clean water pipe ruptured beneath road surface. Thousands of liters of drinking water wasting and undermining the road pavement.',
      category: 'Water / Drainage',
      priority: 'Critical',
      priorityReason: 'Critical Hazard Trigger: Ruptured potable supply line wasting thousands of liters per hour.',
      status: 'In Progress',
      ward: 'HSR Layout (Ward 174)',
      locationAddress: '27th Main Road, Sector 1, HSR Layout',
      latitude: 12.9121,
      longitude: 77.6446,
      citizenId: citizenUser1.id,
      departmentId: departments['BWSSB_WATER'].id,
      assignedStaffId: staffList[4].id,
      beforePhotoUrl: '/uploads/demo-water-before.svg',
      createdAt: new Date(Date.now() - 20 * 3600 * 1000)
    }
  });

  // Public Amenities - Assigned
  const complaint5 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00055',
      title: 'Broken pedestrian foot-overbridge step near Trinity Metro',
      description: 'Concrete step cracked and loose steel rebar sticking out on pedestrian stairway. Elder citizens risking severe fall.',
      category: 'Public Amenities',
      priority: 'Medium',
      priorityReason: 'Pedestrian safety defect on high-traffic public access transit corridor.',
      status: 'Assigned',
      ward: 'MG Road / CBD (Ward 111)',
      locationAddress: 'MG Road, Near Trinity Metro Station Exit B',
      latitude: 12.9734,
      longitude: 77.6186,
      citizenId: citizenUser2.id,
      departmentId: departments['BTP_AMENITY'].id,
      assignedStaffId: staffList[0].id,
      beforePhotoUrl: '/uploads/demo-pothole-before.svg',
      createdAt: new Date(Date.now() - 120 * 3600 * 1000)
    }
  });

  // Complaint 6: Jayanagar Storm Drain
  const complaint6 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00112',
      title: 'Overflowing stormwater drain near 4th Block Complex',
      description: 'Heavy blockage in underground culvert causing blackwater overflow onto market road during evening rush.',
      category: 'Water / Drainage',
      priority: 'High',
      priorityReason: 'Sanitation hazard in major commercial market zone.',
      status: 'In Progress',
      ward: 'Jayanagar (Ward 153)',
      locationAddress: '11th Main Road, 4th Block, Jayanagar',
      latitude: 12.9298,
      longitude: 77.5833,
      citizenId: citizenUser1.id,
      departmentId: departments['BWSSB_WATER'].id,
      assignedStaffId: staffList[4].id,
      beforePhotoUrl: '/uploads/demo-water-before.svg',
      createdAt: new Date(Date.now() - 18 * 3600 * 1000)
    }
  });

  // Complaint 7: Malleshwaram Missing Footpath Slab
  const complaint7 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00118',
      title: 'Missing footpath storm drain slab on 8th Cross',
      description: 'Open trench where concrete slab broke away. Pedestrians forced into vehicular traffic lane.',
      category: 'Road / Pothole',
      priority: 'High',
      priorityReason: 'Open trench hazard on busy pedestrian street.',
      status: 'Assigned',
      ward: 'Malleshwaram (Ward 65)',
      locationAddress: '8th Cross Road, Near Margosa Road, Malleshwaram',
      latitude: 13.0034,
      longitude: 77.5684,
      citizenId: citizenUser2.id,
      departmentId: departments['BBMP_ROAD'].id,
      assignedStaffId: staffList[1].id,
      beforePhotoUrl: '/uploads/demo-pothole-before.svg',
      createdAt: new Date(Date.now() - 15 * 3600 * 1000)
    }
  });

  // Complaint 8: Bellandur Outer Ring Road Waterlogging
  const complaint8 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00124',
      title: 'Severe rainwater logging on ORR service lane',
      description: 'Clogged shoulder drains leaving 2 feet standing water on Bellandur service road toward tech parks.',
      category: 'Water / Drainage',
      priority: 'Critical',
      priorityReason: 'Critical disruption on major arterial IT traffic corridor.',
      status: 'Submitted',
      ward: 'Bellandur (Ward 150)',
      locationAddress: 'Outer Ring Road, Opp Ecospace, Bellandur',
      latitude: 12.9260,
      longitude: 77.6762,
      citizenId: citizenUser1.id,
      departmentId: departments['BWSSB_WATER'].id,
      beforePhotoUrl: '/uploads/demo-water-before.svg',
      createdAt: new Date(Date.now() - 8 * 3600 * 1000)
    }
  });

  // Complaint 9: BTM Layout Market Garbage Blackspot
  const complaint9 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00130',
      title: 'Uncollected vegetable market waste creating foul stench',
      description: 'Over 500kg vegetable crate debris and rotting wet waste left uncollected beside bus shelter.',
      category: 'Garbage / Waste',
      priority: 'High',
      priorityReason: 'Commercial waste pile causing environmental and health risk.',
      status: 'In Progress',
      ward: 'BTM Layout (Ward 176)',
      locationAddress: '7th Main Road, 2nd Stage, BTM Layout',
      latitude: 12.9166,
      longitude: 77.6101,
      citizenId: citizenUser2.id,
      departmentId: departments['BBMP_SWM'].id,
      assignedStaffId: staffList[2].id,
      beforePhotoUrl: '/uploads/demo-garbage-before.svg',
      createdAt: new Date(Date.now() - 10 * 3600 * 1000)
    }
  });

  // Complaint 10: Marathahalli Railway Bridge Lights Out
  const complaint10 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00136',
      title: 'Non-functional streetlights along railway bridge',
      description: 'Six pole fixtures completely dark along Marathahalli flyover approach road.',
      category: 'Streetlight',
      priority: 'Medium',
      priorityReason: 'Bridge approach illumination failure at night.',
      status: 'Assigned',
      ward: 'Marathahalli (Ward 85)',
      locationAddress: 'Old Airport Road, Near Marathahalli Bridge',
      latitude: 12.9562,
      longitude: 77.7011,
      citizenId: citizenUser1.id,
      departmentId: departments['BESCOM_POWER'].id,
      assignedStaffId: staffList[3].id,
      beforePhotoUrl: '/uploads/demo-streetlight-before.svg',
      createdAt: new Date(Date.now() - 22 * 3600 * 1000)
    }
  });

  // Complaint 11: Basavanagudi Gandhi Bazaar Paver Repair
  const complaint11 = await prisma.complaint.create({
    data: {
      complaintCode: 'CS-2026-00142',
      title: 'Damaged pedestrian pavers outside Gandhi Bazaar',
      description: 'Sunk paver stones repaired and leveled with new concrete bedding and cement interlocking.',
      category: 'Public Amenities',
      priority: 'Low',
      priorityReason: 'Heritage precinct footpath renewal.',
      status: 'Resolved',
      ward: 'Basavanagudi (Ward 154)',
      locationAddress: 'Gandhi Bazaar Main Road, Basavanagudi',
      latitude: 12.9421,
      longitude: 77.5755,
      citizenId: citizenUser2.id,
      departmentId: departments['BTP_AMENITY'].id,
      assignedStaffId: staffList[0].id,
      beforePhotoUrl: '/uploads/demo-pothole-before.svg',
      afterPhotoUrl: '/uploads/demo-pothole-after.svg',
      resolutionNotes: 'Paver blocks re-leveled with compacted M20 sand base and mortar jointing.',
      createdAt: new Date(Date.now() - 40 * 3600 * 1000)
    }
  });

  console.log('✅ Seeded 11 realistic Bengaluru civic complaints across multiple categories and wards.');

  // 7. Seed Status History
  await prisma.complaintStatusHistory.createMany({
    data: [
      {
        complaintId: complaint1.id,
        fromStatus: null,
        toStatus: 'Submitted',
        changedById: citizenUser1.id,
        notes: 'Citizen submitted complaint with photo evidence.',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000)
      },
      {
        complaintId: complaint1.id,
        fromStatus: 'Submitted',
        toStatus: 'Assigned',
        changedById: authorityUser1.id,
        notes: 'Assigned to AE Ramesh Kumar (Indiranagar Ward 112).',
        createdAt: new Date(Date.now() - 40 * 3600 * 1000)
      },
      {
        complaintId: complaint1.id,
        fromStatus: 'Assigned',
        toStatus: 'In Progress',
        changedById: authorityUser1.id,
        notes: 'Cold mix asphalt crew dispatched to site with road roller.',
        createdAt: new Date(Date.now() - 24 * 3600 * 1000)
      },
      // Complaint 2 History
      {
        complaintId: complaint2.id,
        fromStatus: 'In Progress',
        toStatus: 'Resolved',
        changedById: authorityUser2.id,
        notes: 'Site sanitized and after-repair evidence uploaded. Verification requested from citizen.',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000)
      },
      // Complaint 3 History
      {
        complaintId: complaint3.id,
        fromStatus: 'Resolved',
        toStatus: 'Verified',
        changedById: citizenUser1.id,
        notes: 'Citizen verified issue fixed on-site. Awarded +50 Karma Points.',
        createdAt: new Date(Date.now() - 24 * 3600 * 1000)
      }
    ]
  });

  // 8. Seed Citizen Verification Record
  await prisma.citizenVerification.create({
    data: {
      complaintId: complaint3.id,
      citizenId: citizenUser1.id,
      isFixed: true,
      feedback: 'Streetlights are glowing brightly now. Road is safe for walking at night. Thank you BESCOM team!',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000)
    }
  });

  // 9. Seed In-App Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: citizenUser1.id,
        complaintId: complaint1.id,
        title: 'Repair In Progress',
        message: 'BBMP Road Infrastructure has dispatched the asphalt repair crew for CS-2026-00084.',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000)
      },
      {
        userId: citizenUser2.id,
        complaintId: complaint2.id,
        title: 'Repair Verification Requested',
        message: 'Insp. C. Manjunath uploaded after-repair evidence for CS-2026-00091. Please confirm if the waste has been cleared.',
        isRead: false,
        createdAt: new Date(Date.now() - 12 * 3600 * 1000)
      },
      {
        userId: citizenUser1.id,
        complaintId: complaint3.id,
        title: 'Verification Complete (+50 Pts)',
        message: 'Your verification for CS-2026-00072 has been confirmed. You earned 50 Saathi Karma Points!',
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 3600 * 1000)
      }
    ]
  });

  console.log('✅ Seeded status history, verification response, and notifications.');
  console.log('🎉 CitySaathi database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
