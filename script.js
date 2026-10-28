/**
 * ============================================================================
 * CITYSAATHI — MASTER APPLICATION JAVASCRIPT
 * Brand: CitySaathi | “Your City. Your Voice. Your Saathi.”
 * Architecture:
 *   1. SafeStorage: Resilient storage with memory fallback for file:// protocol
 *   2. EvidenceAssets: Crisp, self-contained SVG evidence assets
 *   3. DemoData: Realistic Bengaluru civic dataset
 *   4. CivicStore: LocalStorage persistence & backward-compatibility adapter
 *   5. CivicAI: AI classification, transparent priority & duplicate radar
 *   6. CivicMap: Interactive Leaflet map with custom pins & offline SVG fallback
 *   7. CivicCharts: Pure HTML5 Canvas charts with zero external dependencies
 *   8. UI Controllers: Nav, Multi-Step Wizard, Tracking, Operations, Theme
 * ============================================================================
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. SAFE STORAGE (Resilient Storage Adapter)
     Handles file:// protocol restrictions, privacy mode, and QuotaExceeded
     -------------------------------------------------------------------------- */
  const SafeStorage = {
    _mem: {},
    getItem(key) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {
        // Fallback to memory
      }
      return this._mem[key] || null;
    },
    setItem(key, val) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, String(val));
          return;
        }
      } catch (e) {
        // Fallback to memory
      }
      this._mem[key] = String(val);
    },
    removeItem(key) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {}
      delete this._mem[key];
    }
  };

  /* --------------------------------------------------------------------------
     2. DEMO EVIDENCE PHOTOS (Crisp, Self-Contained SVG Data URIs)
     Guarantees 100% offline reliability without broken image links
     -------------------------------------------------------------------------- */
  const EvidenceAssets = {
    potholeBefore: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
        <rect width="400" height="250" fill="#334155"/>
        <line x1="0" y1="125" x2="400" y2="125" stroke="#FDE047" stroke-width="6" stroke-dasharray="25 20"/>
        <!-- Crater Pothole -->
        <ellipse cx="200" cy="140" rx="90" ry="45" fill="#0F172A" stroke="#1E293B" stroke-width="4"/>
        <ellipse cx="195" cy="145" rx="65" ry="30" fill="#020617"/>
        <path d="M120 140 Q 150 120 190 135 Q 240 120 280 145" stroke="#64748B" stroke-width="3" fill="none"/>
        <rect x="15" y="15" width="130" height="28" rx="6" fill="rgba(239,68,68,0.9)"/>
        <text x="80" y="34" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">BEFORE REPAIR</text>
      </svg>
    `),
    potholeAfter: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
        <rect width="400" height="250" fill="#334155"/>
        <line x1="0" y1="125" x2="400" y2="125" stroke="#FDE047" stroke-width="6" stroke-dasharray="25 20"/>
        <!-- Smooth Asphalt Patch -->
        <ellipse cx="200" cy="140" rx="95" ry="48" fill="#1E293B" stroke="#475569" stroke-width="2"/>
        <rect x="15" y="15" width="130" height="28" rx="6" fill="rgba(16,185,129,0.9)"/>
        <text x="80" y="34" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">AFTER REPAIR (BBMP)</text>
      </svg>
    `),
    garbageBefore: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
        <rect width="400" height="250" fill="#E2E8F0"/>
        <!-- Overflowing Dumpster -->
        <rect x="140" y="90" width="120" height="110" rx="8" fill="#047857"/>
        <path d="M120 85 L280 85 L260 65 L140 65 Z" fill="#065F46"/>
        <circle cx="160" cy="100" r="16" fill="#F59E0B"/>
        <circle cx="210" cy="80" r="22" fill="#EF4444"/>
        <circle cx="240" cy="105" r="18" fill="#3B82F6"/>
        <path d="M100 200 L300 200 L280 230 L120 230 Z" fill="#94A3B8"/>
        <rect x="15" y="15" width="130" height="28" rx="6" fill="rgba(239,68,68,0.9)"/>
        <text x="80" y="34" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">BEFORE REPAIR</text>
      </svg>
    `),
    garbageAfter: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
        <rect width="400" height="250" fill="#E2E8F0"/>
        <!-- Clean Dumpster & Sanitized Pavement -->
        <rect x="140" y="90" width="120" height="110" rx="8" fill="#047857"/>
        <rect x="130" y="80" width="140" height="12" rx="4" fill="#065F46"/>
        <path d="M100 200 L300 200 L280 230 L120 230 Z" fill="#CBD5E1"/>
        <circle cx="200" cy="140" r="15" fill="#10B981"/>
        <rect x="15" y="15" width="130" height="28" rx="6" fill="rgba(16,185,129,0.9)"/>
        <text x="80" y="34" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">AFTER REPAIR (SWM)</text>
      </svg>
    `),
    streetlightBefore: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
        <rect width="400" height="250" fill="#0B132B"/>
        <!-- Dark Street Pole -->
        <rect x="195" y="60" width="10" height="170" fill="#475569"/>
        <path d="M195 60 C195 30 240 30 250 45" stroke="#475569" stroke-width="8" fill="none"/>
        <circle cx="250" cy="50" r="10" fill="#334155"/>
        <rect x="15" y="15" width="130" height="28" rx="6" fill="rgba(239,68,68,0.9)"/>
        <text x="80" y="34" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">BEFORE REPAIR</text>
      </svg>
    `),
    streetlightAfter: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
        <rect width="400" height="250" fill="#0B132B"/>
        <!-- Glowing Light Pole -->
        <circle cx="250" cy="50" r="80" fill="url(#lightGlow)" opacity="0.6"/>
        <rect x="195" y="60" width="10" height="170" fill="#64748B"/>
        <path d="M195 60 C195 30 240 30 250 45" stroke="#64748B" stroke-width="8" fill="none"/>
        <circle cx="250" cy="50" r="12" fill="#FEF08A"/>
        <defs>
          <radialGradient id="lightGlow">
            <stop offset="0%" stop-color="#FEF08A" stop-opacity="1"/>
            <stop offset="100%" stop-color="#FEF08A" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect x="15" y="15" width="130" height="28" rx="6" fill="rgba(16,185,129,0.9)"/>
        <text x="80" y="34" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">AFTER REPAIR (BESCOM)</text>
      </svg>
    `),
    waterBefore: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
        <rect width="400" height="250" fill="#334155"/>
        <!-- Gushing Pipeline Leak -->
        <rect x="80" y="140" width="240" height="30" rx="6" fill="#64748B"/>
        <ellipse cx="200" cy="140" rx="20" ry="10" fill="#0284C7"/>
        <path d="M190 140 C170 80 230 70 210 140" fill="#38BDF8" opacity="0.8"/>
        <ellipse cx="200" cy="180" rx="90" ry="30" fill="#0284C7" opacity="0.6"/>
        <rect x="15" y="15" width="130" height="28" rx="6" fill="rgba(239,68,68,0.9)"/>
        <text x="80" y="34" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">BEFORE REPAIR</text>
      </svg>
    `),
    waterAfter: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
        <rect width="400" height="250" fill="#334155"/>
        <!-- Replaced Pipe Collar & Dry Surface -->
        <rect x="80" y="140" width="240" height="30" rx="6" fill="#64748B"/>
        <rect x="180" y="132" width="40" height="46" rx="4" fill="#F59E0B" stroke="#B45309" stroke-width="2"/>
        <rect x="15" y="15" width="130" height="28" rx="6" fill="rgba(16,185,129,0.9)"/>
        <text x="80" y="34" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">AFTER REPAIR (BWSSB)</text>
      </svg>
    `)
  };

  /* --------------------------------------------------------------------------
     3. REALISTIC BENGALURU SEED DATA
     Pre-seeded complaints with full timeline, agencies, and duplicate clusters
     -------------------------------------------------------------------------- */
  const InitialDemoComplaints = [
    {
      id: "CS-2026-00084",
      title: "Deep crater pothole opposite Toit on 100ft road",
      category: "Road / Pothole",
      priority: "Critical",
      ward: "Indiranagar (Ward 112)",
      location: "100ft Road, Near 12th Main Junction, Indiranagar",
      lat: 12.9784,
      lng: 77.6408,
      description: "Massive crater pothole right on the arterial lane. Two two-wheelers slipped during evening rain. Immediate asphalt patching needed before peak traffic.",
      createdAt: "2026-09-24, 09:15 AM",
      status: "In Progress",
      assignedDept: "BBMP Road Infrastructure",
      assignedStaff: "AE Ramesh Kumar (Indiranagar Ward)",
      photo: EvidenceAssets.potholeBefore,
      afterPhoto: null,
      duplicateCount: 4,
      groupId: "GRP-24",
      timeline: [
        { title: "Complaint Registered", desc: "Logged via CitySaathi App with geo-tag", time: "24 Sep, 09:15 AM", status: "completed" },
        { title: "AI Triage & Classification", desc: "Categorized as Critical Road Hazard (96% conf)", time: "24 Sep, 09:16 AM", status: "completed" },
        { title: "Assigned to BBMP Road Infrastructure", desc: "Dispatched to AE Ramesh Kumar (Ward 112)", time: "24 Sep, 10:30 AM", status: "completed" },
        { title: "Repair in Progress", desc: "Cold mix asphalt team dispatched on-site", time: "25 Sep, 08:00 AM", status: "current" },
        { title: "Repair Completed & Evidence Uploaded", desc: "Awaiting field supervisor sign-off", time: "Pending", status: "pending" },
        { title: "Citizen Verification", desc: "Citizen confirmation loop", time: "Pending", status: "pending" }
      ]
    },
    {
      id: "CS-2026-00091",
      title: "Commercial garbage dump on footpath near 5th Block",
      category: "Garbage / Waste",
      priority: "High",
      ward: "Koramangala (Ward 151)",
      location: "80ft Road, Opposite Sony World Signal, Koramangala",
      lat: 12.9352,
      lng: 77.6245,
      description: "Continuous dumping of hotel food waste and wet garbage on public footpath. Foul odor and stray dogs causing pedestrian obstruction.",
      createdAt: "2026-09-23, 11:40 AM",
      status: "Resolved",
      assignedDept: "Solid Waste Management (SWM)",
      assignedStaff: "Insp. C. Manjunath (SWM East)",
      photo: EvidenceAssets.garbageBefore,
      afterPhoto: EvidenceAssets.garbageAfter,
      resolutionNotes: "Footpath fully cleared by mechanical sweeper; lime powder bleaching sprayed and warning notices issued to commercial vendors.",
      duplicateCount: 2,
      timeline: [
        { title: "Complaint Registered", desc: "Logged with photo evidence", time: "23 Sep, 11:40 AM", status: "completed" },
        { title: "AI Triage & Classification", desc: "Solid waste blackspot identified", time: "23 Sep, 11:41 AM", status: "completed" },
        { title: "Assigned to SWM Division", desc: "Assigned to Ward 151 Cleanliness Inspector", time: "23 Sep, 01:10 PM", status: "completed" },
        { title: "Cleanliness Drive Executed", desc: "Waste marshals and compactors cleared site", time: "24 Sep, 07:30 AM", status: "completed" },
        { title: "Repair Evidence Uploaded", desc: "After photo attached by Insp. C. Manjunath", time: "24 Sep, 09:00 AM", status: "completed" },
        { title: "Citizen Verification", desc: "Awaiting citizen confirmation of clean site", time: "Active", status: "current" }
      ]
    },
    {
      id: "CS-2026-00072",
      title: "Dark stretch due to 4 non-functional streetlights",
      category: "Streetlight",
      priority: "Medium",
      ward: "Whitefield (Ward 84)",
      location: "ITPL Main Road, Near Hope Farm Circle, Whitefield",
      lat: 12.9850,
      lng: 77.7440,
      description: "Four consecutive sodium-vapor streetlights are out of order for 3 nights. Road is pitch dark and hazardous for pedestrians crossing near bus stop.",
      createdAt: "2026-09-22, 08:30 PM",
      status: "Verified",
      assignedDept: "BESCOM Electrical Cell",
      assignedStaff: "Eng. Girish Rao (BESCOM E4)",
      photo: EvidenceAssets.streetlightBefore,
      afterPhoto: EvidenceAssets.streetlightAfter,
      resolutionNotes: "Blown underground junction fuse replaced; LED luminaires installed and tested.",
      duplicateCount: 1,
      timeline: [
        { title: "Complaint Registered", desc: "Reported by citizen watch group", time: "22 Sep, 08:30 PM", status: "completed" },
        { title: "AI Triage & Classification", desc: "BESCOM public lighting failure", time: "22 Sep, 08:31 PM", status: "completed" },
        { title: "Assigned to BESCOM Division", desc: "Sub-station team notified", time: "23 Sep, 09:00 AM", status: "completed" },
        { title: "Field Repair Completed", desc: "Underground fuse restored", time: "23 Sep, 04:15 PM", status: "completed" },
        { title: "Repair Evidence Uploaded", desc: "Photo proof verified", time: "23 Sep, 04:30 PM", status: "completed" },
        { title: "Citizen Verified", desc: "Confirmed fixed by citizen (+50 Saathi points)", time: "23 Sep, 07:00 PM", status: "completed" }
      ]
    },
    {
      id: "CS-2026-00105",
      title: "BWSSB potable water pipeline burst flooding 27th Main",
      category: "Water / Drainage",
      priority: "Critical",
      ward: "HSR Layout (Ward 174)",
      location: "27th Main Road, Sector 1, HSR Layout",
      lat: 12.9121,
      lng: 77.6446,
      description: "High-pressure clean water pipe ruptured beneath road surface. Thousands of liters of drinking water wasting and undermining the road pavement.",
      createdAt: "2026-09-25, 07:10 AM",
      status: "In Progress",
      assignedDept: "BWSSB Water & Drainage",
      assignedStaff: "AE V. Murthy (BWSSB South)",
      photo: EvidenceAssets.waterBefore,
      afterPhoto: null,
      duplicateCount: 3,
      timeline: [
        { title: "Complaint Registered", desc: "Logged via GPS locator", time: "25 Sep, 07:10 AM", status: "completed" },
        { title: "AI Triage & Classification", desc: "Critical Water Loss Hazard detected", time: "25 Sep, 07:11 AM", status: "completed" },
        { title: "Assigned to BWSSB Rapid Response", desc: "Main valve shutoff team alerted", time: "25 Sep, 07:45 AM", status: "completed" },
        { title: "Excavation & Pipe Replacement", desc: "Crews currently welding reinforced sleeve", time: "25 Sep, 09:30 AM", status: "current" },
        { title: "Repair Completed & Evidence", desc: "Pressure test & road resurfacing", time: "Pending", status: "pending" },
        { title: "Citizen Verification", desc: "Citizen verification sign-off", time: "Pending", status: "pending" }
      ]
    },
    {
      id: "CS-2026-00055",
      title: "Broken pedestrian foot-overbridge step near Trinity Metro",
      category: "Public Amenities",
      priority: "Medium",
      ward: "MG Road / CBD (Ward 111)",
      location: "MG Road, Near Trinity Metro Station Exit B",
      lat: 12.9734,
      lng: 77.6186,
      description: "Concrete step cracked and loose steel rebar sticking out on pedestrian stairway. Elder citizens risking severe fall.",
      createdAt: "2026-09-21, 02:20 PM",
      status: "Assigned",
      assignedDept: "BBMP Road Infrastructure",
      assignedStaff: "AE Ramesh Kumar",
      photo: EvidenceAssets.potholeBefore,
      afterPhoto: null,
      duplicateCount: 0,
      timeline: [
        { title: "Complaint Registered", desc: "Civic report submitted", time: "21 Sep, 02:20 PM", status: "completed" },
        { title: "AI Triage & Classification", desc: "Pedestrian Infrastructure issue", time: "21 Sep, 02:21 PM", status: "completed" },
        { title: "Assigned to BBMP East", desc: "Work order created", time: "22 Sep, 10:00 AM", status: "completed" },
        { title: "Material Dispatch Scheduled", desc: "Pre-cast tread replacement scheduled", time: "26 Sep", status: "current" },
        { title: "Evidence Upload", desc: "Pending", time: "Pending", status: "pending" },
        { title: "Citizen Verification", desc: "Pending", time: "Pending", status: "pending" }
      ]
    },
    {
      id: "CS-2026-00112",
      title: "Overflowing stormwater drain near 4th Block Complex",
      category: "Water / Drainage",
      priority: "High",
      ward: "Jayanagar (Ward 153)",
      location: "11th Main Road, 4th Block, Jayanagar",
      lat: 12.9298,
      lng: 77.5833,
      description: "Heavy blockage in underground culvert causing blackwater overflow onto market road during evening rush.",
      createdAt: "2026-09-24, 04:30 PM",
      status: "In Progress",
      assignedDept: "BWSSB Water & Drainage",
      assignedStaff: "AE V. Murthy (BWSSB South)",
      photo: EvidenceAssets.waterBefore,
      afterPhoto: null,
      duplicateCount: 1,
      timeline: [
        { title: "Complaint Registered", desc: "Reported with photos", time: "24 Sep, 04:30 PM", status: "completed" },
        { title: "Culvert Jetting Dispatched", desc: "Jetting machine assigned to site", time: "24 Sep, 06:00 PM", status: "current" },
        { title: "Verification", desc: "Pending", time: "Pending", status: "pending" }
      ]
    },
    {
      id: "CS-2026-00118",
      title: "Missing footpath storm drain slab on 8th Cross",
      category: "Road / Pothole",
      priority: "High",
      ward: "Malleshwaram (Ward 65)",
      location: "8th Cross Road, Near Margosa Road, Malleshwaram",
      lat: 13.0034,
      lng: 77.5684,
      description: "Open trench where concrete slab broke away. Pedestrians forced into vehicular traffic lane.",
      createdAt: "2026-09-24, 05:00 PM",
      status: "Assigned",
      assignedDept: "BBMP Road Infrastructure",
      assignedStaff: "JE Sneha Patil",
      photo: EvidenceAssets.potholeBefore,
      afterPhoto: null,
      duplicateCount: 0,
      timeline: [
        { title: "Complaint Registered", desc: "Logged by citizen", time: "24 Sep, 05:00 PM", status: "completed" },
        { title: "Work Order Issued", desc: "Slab cast scheduled", time: "25 Sep, 09:00 AM", status: "current" }
      ]
    },
    {
      id: "CS-2026-00124",
      title: "Severe rainwater logging on ORR service lane",
      category: "Water / Drainage",
      priority: "Critical",
      ward: "Bellandur (Ward 150)",
      location: "Outer Ring Road, Opp Ecospace, Bellandur",
      lat: 12.9260,
      lng: 77.6762,
      description: "Clogged shoulder drains leaving 2 feet standing water on Bellandur service road toward tech parks.",
      createdAt: "2026-09-25, 08:00 AM",
      status: "Submitted",
      assignedDept: "BWSSB Water & Drainage",
      assignedStaff: null,
      photo: EvidenceAssets.waterBefore,
      afterPhoto: null,
      duplicateCount: 5,
      timeline: [
        { title: "Complaint Registered", desc: "High waterlogging trigger", time: "25 Sep, 08:00 AM", status: "completed" },
        { title: "AI Triage", desc: "Critical priority auto-assigned", time: "25 Sep, 08:01 AM", status: "completed" }
      ]
    },
    {
      id: "CS-2026-00130",
      title: "Uncollected vegetable market waste creating foul stench",
      category: "Garbage / Waste",
      priority: "High",
      ward: "BTM Layout (Ward 176)",
      location: "7th Main Road, 2nd Stage, BTM Layout",
      lat: 12.9166,
      lng: 77.6101,
      description: "Over 500kg vegetable crate debris and rotting wet waste left uncollected beside bus shelter.",
      createdAt: "2026-09-25, 06:45 AM",
      status: "In Progress",
      assignedDept: "Solid Waste Management (SWM)",
      assignedStaff: "Insp. C. Manjunath",
      photo: EvidenceAssets.garbageBefore,
      afterPhoto: null,
      duplicateCount: 2,
      timeline: [
        { title: "Complaint Registered", desc: "SWM dispatch triggered", time: "25 Sep, 06:45 AM", status: "completed" },
        { title: "Compactor Truck Dispatched", desc: "En route to BTM 2nd stage", time: "25 Sep, 08:30 AM", status: "current" }
      ]
    },
    {
      id: "CS-2026-00136",
      title: "Non-functional streetlights along railway bridge",
      category: "Streetlight",
      priority: "Medium",
      ward: "Marathahalli (Ward 85)",
      location: "Old Airport Road, Near Marathahalli Bridge",
      lat: 12.9562,
      lng: 77.7011,
      description: "Six pole fixtures completely dark along Marathahalli flyover approach road.",
      createdAt: "2026-09-24, 08:15 PM",
      status: "Assigned",
      assignedDept: "BESCOM Electrical Cell",
      assignedStaff: "Eng. Girish Rao",
      photo: EvidenceAssets.streetlightBefore,
      afterPhoto: null,
      duplicateCount: 1,
      timeline: [
        { title: "Complaint Registered", desc: "Logged via citizen app", time: "24 Sep, 08:15 PM", status: "completed" },
        { title: "BESCOM Inspection", desc: "Cable test scheduled", time: "25 Sep, 10:00 AM", status: "current" }
      ]
    },
    {
      id: "CS-2026-00142",
      title: "Damaged pedestrian pavers outside Gandhi Bazaar",
      category: "Public Amenities",
      priority: "Low",
      ward: "Basavanagudi (Ward 154)",
      location: "Gandhi Bazaar Main Road, Basavanagudi",
      lat: 12.9421,
      lng: 77.5755,
      description: "Sunk paver stones repaired and leveled with new concrete bedding and cement interlocking.",
      createdAt: "2026-09-23, 03:00 PM",
      status: "Resolved",
      assignedDept: "BBMP Road Infrastructure",
      assignedStaff: "AE Ramesh Kumar",
      photo: EvidenceAssets.potholeBefore,
      afterPhoto: EvidenceAssets.potholeAfter,
      resolutionNotes: "Paver blocks re-leveled with compacted M20 sand base and mortar jointing.",
      duplicateCount: 0,
      timeline: [
        { title: "Complaint Registered", desc: "Reported by resident", time: "23 Sep, 03:00 PM", status: "completed" },
        { title: "Masonry Team Re-leveled", desc: "Completed with photographic evidence", time: "24 Sep, 05:00 PM", status: "completed" },
        { title: "Citizen Verification", desc: "Pending verification", time: "Active", status: "current" }
      ]
    }
  ];

  /* --------------------------------------------------------------------------
     4. CIVIC STORE (Persistence & Backward-Compatibility Layer)
     Uses 'civicComplaints' in localStorage — NEVER loses prior user data!
     -------------------------------------------------------------------------- */
  const CivicStore = {
    STORAGE_KEY: "civicComplaints",
    NOTIF_KEY: "citysaathi_notifs",
    THEME_KEY: "citysaathi_theme",
    AUTH_TOKEN_KEY: "citysaathi_token",
    AUTH_USER_KEY: "citysaathi_user",
    API_BASE: (window.location.port === "5000" || window.location.host.includes("5000")) ? "" : "http://localhost:5000",

    currentUser: null,
    authToken: null,
    serverConnected: false,
    departments: [],
    staffDirectory: [],
    cachedStats: null,

    async init() {
      // 1. Restore auth session
      this.authToken = SafeStorage.getItem(this.AUTH_TOKEN_KEY);
      const storedUser = SafeStorage.getItem(this.AUTH_USER_KEY);
      if (storedUser) {
        try { this.currentUser = JSON.parse(storedUser); } catch (e) {}
      }

      // If no session exists, start in guest mode matching Screen 1 reference design
      if (!this.authToken) {
        this.currentUser = null;
      }

      // 2. Fetch server health and sync
      try {
        const health = await this.apiCall('/api/health');
        if (health && health.status === 'healthy') {
          this.serverConnected = true;
          await this.syncFromServer();
          await this.fetchStaff();
          await this.fetchStats();
        }
      } catch (err) {
        console.warn("Backend API offline; operating in resilient local mode:", err.message);
        const raw = SafeStorage.getItem(this.STORAGE_KEY);
        if (!raw) this.seedDemoData();
      }

      this.updateNavProfile();
    },

    async apiCall(endpoint, options = {}) {
      const url = `${this.API_BASE}${endpoint}`;
      const headers = options.headers || {};

      if (this.authToken && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      if (!options.isFormData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const fetchOpts = {
        method: options.method || 'GET',
        headers
      };

      if (options.body) {
        fetchOpts.body = options.isFormData ? options.body : JSON.stringify(options.body);
      }

      const res = await fetch(url, fetchOpts);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data;
    },

    async syncFromServer() {
      try {
        const data = await this.apiCall('/api/complaints');
        if (data && data.success && Array.isArray(data.complaints)) {
          const mapped = data.complaints.map((c, idx) => this.normalizeComplaint(c, idx));
          SafeStorage.setItem(this.STORAGE_KEY, JSON.stringify(mapped));
          this.serverConnected = true;
          return mapped;
        }
      } catch (e) {
        console.warn("syncFromServer error:", e);
      }
      return this.getAll();
    },

    async fetchStaff() {
      try {
        const data = await this.apiCall('/api/staff');
        if (data && data.success) {
          this.departments = data.departments || [];
          this.staffDirectory = data.staff || [];
        }
      } catch (e) {}
    },

    normalizeComplaint(c, idx) {
      const code = c.complaintCode || c.id || `CS-2026-00${100 + idx}`;
      const status = c.status || "Submitted";
      const createdAt = c.createdAt ? new Date(c.createdAt).toLocaleString() : new Date().toLocaleString();

      return {
        id: code,
        dbId: c.id,
        title: c.title || "Civic Complaint",
        category: c.category || "Road / Pothole",
        priority: c.priority || "High",
        priorityReason: c.priorityReason || "",
        ward: c.ward || "Indiranagar (Ward 112)",
        location: c.locationAddress || c.location || "Bengaluru, Karnataka",
        lat: (c.latitude !== null && c.latitude !== undefined) ? c.latitude : (12.9716 + (Math.random() - 0.5) * 0.05),
        lng: (c.longitude !== null && c.longitude !== undefined) ? c.longitude : (77.5946 + (Math.random() - 0.5) * 0.05),
        description: c.description || "Reported via CitySaathi.",
        createdAt,
        status,
        assignedDept: (c.department && c.department.name) || c.assignedDept || this.resolveAgency(c.category),
        assignedStaff: (c.assignedStaff && c.assignedStaff.name) || c.assignedStaff || "Municipal Engineering Desk",
        assignedStaffId: c.assignedStaffId || null,
        photo: c.beforePhotoUrl
          ? (c.beforePhotoUrl.startsWith('data:') || c.beforePhotoUrl.startsWith('http') ? c.beforePhotoUrl : (this.API_BASE + (c.beforePhotoUrl.startsWith('/') ? c.beforePhotoUrl : '/' + c.beforePhotoUrl)))
          : (c.photo || EvidenceAssets.potholeBefore),
        afterPhoto: c.afterPhotoUrl
          ? (c.afterPhotoUrl.startsWith('data:') || c.afterPhotoUrl.startsWith('http') ? c.afterPhotoUrl : (this.API_BASE + (c.afterPhotoUrl.startsWith('/') ? c.afterPhotoUrl : '/' + c.afterPhotoUrl)))
          : c.afterPhoto,
        resolutionNotes: c.resolutionNotes || "",
        duplicateCount: c.duplicateCount || (c.duplicateLinks ? c.duplicateLinks.length : 0),
        isDuplicate: Boolean(c.isDuplicate),
        masterIssue: c.masterIssue || null,
        verifications: c.verifications || [],
        timeline: (c.statusHistory && c.statusHistory.length > 0)
          ? this.generateTimelineFromDbHistory(c.statusHistory, createdAt, status)
          : (c.timeline || this.generateDefaultTimeline(createdAt, status))
      };
    },

    generateTimelineFromDbHistory(history, createdDate, currentStatus) {
      const isResolved = currentStatus === "Resolved" || currentStatus === "Verified";
      const isInProg = currentStatus === "In Progress" || isResolved;
      const isAssigned = currentStatus === "Assigned" || isInProg;

      const registered = history.find(h => h.toStatus === "Submitted") || history[0];
      const assigned = history.find(h => h.toStatus === "Assigned");
      const inProg = history.find(h => h.toStatus === "In Progress");
      const resolved = history.find(h => h.toStatus === "Resolved");
      const verified = history.find(h => h.toStatus === "Verified");

      return [
        {
          title: "Complaint Registered",
          desc: "Submitted through CitySaathi",
          time: registered ? new Date(registered.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : createdDate,
          status: "completed"
        },
        {
          title: "AI Triage & Classification",
          desc: "Automated routing and priority analysis",
          time: registered ? new Date(registered.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : createdDate,
          status: "completed"
        },
        {
          title: "Assigned to Department",
          desc: assigned ? (assigned.notes || "Field unit assigned") : "Awaiting assignment",
          time: assigned ? new Date(assigned.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (isAssigned ? createdDate : "Pending"),
          status: isAssigned ? "completed" : "current"
        },
        {
          title: "Repair in Progress",
          desc: inProg ? (inProg.notes || "Field maintenance underway") : "Pending dispatch",
          time: inProg ? new Date(inProg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (isInProg ? createdDate : "Pending"),
          status: isInProg ? "completed" : (isAssigned ? "current" : "pending")
        },
        {
          title: "Repair Evidence Uploaded",
          desc: resolved ? (resolved.notes || "Resolution photo uploaded") : "Awaiting field completion",
          time: resolved ? new Date(resolved.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (isResolved ? createdDate : "Pending"),
          status: isResolved ? "completed" : "pending"
        },
        {
          title: "Citizen Verification",
          desc: verified ? "Confirmed fixed by citizen (+50 Karma)" : (isResolved ? "Pending your confirmation" : "Pending completion"),
          time: verified ? new Date(verified.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (currentStatus === "Verified" ? "Verified" : "Pending"),
          status: currentStatus === "Verified" ? "completed" : (isResolved ? "current" : "pending")
        }
      ];
    },

    resolveAgency(category) {
      switch (category) {
        case "Road / Pothole": return "BBMP Road Infrastructure";
        case "Garbage / Waste": return "Solid Waste Management (SWM)";
        case "Streetlight": return "BESCOM Electrical Cell";
        case "Water / Drainage": return "BWSSB Water & Drainage";
        default: return "BBMP City Operations";
      }
    },

    generateDefaultTimeline(dateStr, status) {
      const isResolved = status === "Resolved" || status === "Verified";
      const isInProg = status === "In Progress" || isResolved;
      const isAssigned = status === "Assigned" || isInProg;

      return [
        { title: "Complaint Registered", desc: "Submitted through CitySaathi", time: dateStr, status: "completed" },
        { title: "AI Triage & Classification", desc: "Auto-routed to municipal desk", time: dateStr, status: "completed" },
        { title: "Assigned to Department", desc: "Work order created", time: isAssigned ? dateStr : "Pending", status: isAssigned ? "completed" : "current" },
        { title: "Repair in Progress", desc: "Field maintenance crew dispatched", time: isInProg ? dateStr : "Pending", status: isInProg ? "completed" : (isAssigned ? "current" : "pending") },
        { title: "Repair Evidence Uploaded", desc: "Municipal photo proof uploaded", time: isResolved ? dateStr : "Pending", status: isResolved ? "completed" : "pending" },
        { title: "Citizen Verification", desc: "Citizen confirmation loop", time: status === "Verified" ? "Verified" : "Pending", status: status === "Verified" ? "completed" : (isResolved ? "current" : "pending") }
      ];
    },

    getAll() {
      try {
        const raw = SafeStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    getById(id) {
      const list = this.getAll();
      return list.find(c => c.id === id || c.dbId === Number(id));
    },

    async createComplaint(payload, photoFile) {
      if (this.serverConnected) {
        let resData;
        if (photoFile instanceof File || photoFile instanceof Blob) {
          const formData = new FormData();
          formData.append('title', payload.title || '');
          formData.append('description', payload.description || '');
          formData.append('category', payload.category || 'Road / Pothole');
          formData.append('ward', payload.ward || 'Bengaluru');
          formData.append('locationAddress', payload.location || 'Bengaluru');
          if (payload.lat) formData.append('latitude', payload.lat);
          if (payload.lng) formData.append('longitude', payload.lng);
          formData.append('severity', payload.severity || 'Normal');
          formData.append('photo', photoFile, photoFile.name || 'evidence.jpg');

          resData = await this.apiCall('/api/complaints', {
            method: 'POST',
            body: formData,
            isFormData: true
          });
        } else {
          resData = await this.apiCall('/api/complaints', {
            method: 'POST',
            body: {
              title: payload.title,
              description: payload.description,
              category: payload.category,
              ward: payload.ward,
              locationAddress: payload.location,
              latitude: payload.lat,
              longitude: payload.lng,
              severity: payload.severity || 'Normal',
              photo: payload.photo || null
            }
          });
        }

        if (resData && resData.success && resData.complaint) {
          const normalized = this.normalizeComplaint(resData.complaint, 0);
          const list = this.getAll();
          list.unshift(normalized);
          SafeStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
          return normalized;
        }
        throw new Error(resData?.error || "Failed to register complaint with server.");
      }

      // Offline mode only: create clearly labeled local draft
      showToast("Server offline; saved locally as offline draft.", "warning");
      const localDraft = {
        ...payload,
        id: `DRAFT-${Date.now().toString().slice(-5)}`,
        status: "Draft (Offline)",
        createdAt: new Date().toLocaleString(),
        assignedDept: this.resolveAgency(payload.category),
        assignedStaff: "Pending Server Sync"
      };
      return this.add(localDraft);
    },

    add(complaint) {
      const list = this.getAll();
      list.unshift(complaint);
      SafeStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      this.addNotification({
        id: "NTF-" + Date.now().toString().slice(-4),
        title: `Ticket ${complaint.id} Registered`,
        desc: `Routed to ${complaint.assignedDept} with ${complaint.priority} priority SLA.`,
        time: "Just now",
        unread: true
      });
      return complaint;
    },

    async updateStatus(id, newStatus, notes = "") {
      const target = this.getById(id);
      const dbId = target?.dbId || id;
      if (this.serverConnected) {
        try {
          const res = await this.apiCall(`/api/complaints/${dbId}/status`, {
            method: 'PATCH',
            body: { status: newStatus, notes }
          });
          if (res && res.success && res.complaint) {
            const normalized = this.normalizeComplaint(res.complaint, 0);
            this.updateLocalComplaint(id, normalized);
            return normalized;
          }
          throw new Error(res?.error || "Status update failed on server.");
        } catch (e) {
          console.error("Backend updateStatus failed:", e.message);
          throw e;
        }
      }
      return this.update(id, { status: newStatus, resolutionNotes: notes });
    },

    async assignStaff(id, staffId, notes = "") {
      const target = this.getById(id);
      const dbId = target?.dbId || id;
      if (this.serverConnected) {
        try {
          const res = await this.apiCall(`/api/complaints/${dbId}/assign`, {
            method: 'PATCH',
            body: { staffId: Number(staffId), notes }
          });
          if (res && res.success && res.complaint) {
            const normalized = this.normalizeComplaint(res.complaint, 0);
            this.updateLocalComplaint(id, normalized);
            return normalized;
          }
          throw new Error(res?.error || "Failed to assign staff.");
        } catch (e) {
          console.error("Backend assignStaff failed:", e.message);
          throw e;
        }
      }
      return null;
    },

    async uploadRepairEvidence(id, afterPhotoFile, notes = "", samplePhotoUrl = null) {
      const target = this.getById(id);
      const dbId = target?.dbId || id;

      if (afterPhotoFile instanceof File || afterPhotoFile instanceof Blob) {
        const formData = new FormData();
        formData.append('afterPhoto', afterPhotoFile, afterPhotoFile.name || 'repair.jpg');
        formData.append('resolutionNotes', notes);

        const res = await this.apiCall(`/api/complaints/${dbId}/evidence`, {
          method: 'POST',
          body: formData,
          isFormData: true
        });
        if (res && res.success && res.complaint) {
          const normalized = this.normalizeComplaint(res.complaint, 0);
          this.updateLocalComplaint(id, normalized);
          return normalized;
        }
        throw new Error(res?.error || "Failed to upload repair evidence.");
      } else if (samplePhotoUrl) {
        const res = await this.apiCall(`/api/complaints/${dbId}/evidence`, {
          method: 'POST',
          body: {
            afterPhotoUrl: samplePhotoUrl,
            resolutionNotes: notes
          }
        });
        if (res && res.success && res.complaint) {
          const normalized = this.normalizeComplaint(res.complaint, 0);
          this.updateLocalComplaint(id, normalized);
          return normalized;
        }
        throw new Error(res?.error || "Failed to record repair evidence.");
      }
      throw new Error("Photographic proof is required to resolve this ticket.");
    },

    async fetchStats() {
      try {
        const res = await this.apiCall('/api/stats/overview');
        if (res && res.success && res.stats) {
          this.cachedStats = res.stats;
          return res.stats;
        }
      } catch (e) {
        console.warn("fetchStats notice:", e.message);
      }
      return null;
    },

    async verifyRepair(id, isFixed, feedback = "") {
      const target = this.getById(id);
      const dbId = target?.dbId || id;
      if (this.serverConnected) {
        try {
          const res = await this.apiCall(`/api/complaints/${dbId}/verify`, {
            method: 'POST',
            body: { isFixed: Boolean(isFixed), feedback }
          });
          if (res && res.success && res.complaint) {
            const normalized = this.normalizeComplaint(res.complaint, 0);
            this.updateLocalComplaint(id, normalized);
            if (this.currentUser && res.karmaEarned) {
              this.currentUser.karmaPoints = (this.currentUser.karmaPoints || 0) + res.karmaEarned;
              SafeStorage.setItem(this.AUTH_USER_KEY, JSON.stringify(this.currentUser));
            }
            return res;
          }
          throw new Error(res?.error || "Repair verification failed on server.");
        } catch (e) {
          console.error("verifyRepair API failed:", e.message);
          throw e;
        }
      }
      const newStatus = isFixed ? "Verified" : "Reopened";
      this.update(id, { status: newStatus, resolutionNotes: feedback });
      return { success: true, karmaEarned: isFixed ? 50 : 0 };
    },

    async checkDuplicates(payload) {
      try {
        const res = await this.apiCall('/api/duplicates/check', {
          method: 'POST',
          body: payload
        });
        if (res && res.success) return res;
      } catch (e) {}
      return null;
    },

    async classifyText(payload) {
      try {
        const res = await this.apiCall('/api/ai/classify', {
          method: 'POST',
          body: payload
        });
        if (res && res.success) return res.data;
      } catch (e) {}
      return null;
    },

    async mergeIntoMaster(payload) {
      try {
        const res = await this.apiCall('/api/duplicates/merge', {
          method: 'POST',
          body: payload
        });
        if (res && res.success) {
          await this.syncFromServer();
          return res;
        }
      } catch (e) {
        console.warn("mergeIntoMaster failed:", e.message);
      }
      return null;
    },

    async login(email, password) {
      const res = await this.apiCall('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      if (res && res.success) {
        this.setSession(res.token, res.user);
        await this.syncFromServer();
        return res;
      }
      throw new Error(res.error || 'Login failed');
    },

    async register(userData) {
      const res = await this.apiCall('/api/auth/register', {
        method: 'POST',
        body: userData
      });
      if (res && res.success) {
        this.setSession(res.token, res.user);
        await this.syncFromServer();
        return res;
      }
      throw new Error(res.error || 'Registration failed');
    },

    async demoLogin(role = 'citizen') {
      const res = await this.apiCall('/api/auth/demo-login', {
        method: 'POST',
        body: { role }
      });
      if (res && res.success) {
        this.setSession(res.token, res.user);
        await this.syncFromServer();
        return res;
      }
      throw new Error(res.error || 'Demo login failed');
    },

    setSession(token, user) {
      this.authToken = token;
      this.currentUser = user;
      SafeStorage.setItem(this.AUTH_TOKEN_KEY, token);
      SafeStorage.setItem(this.AUTH_USER_KEY, JSON.stringify(user));
      this.updateNavProfile();
    },

    logout() {
      this.authToken = null;
      this.currentUser = null;
      SafeStorage.removeItem(this.AUTH_TOKEN_KEY);
      SafeStorage.removeItem(this.AUTH_USER_KEY);
      this.demoLogin('citizen').catch(() => {});
      this.updateNavProfile();
    },

    updateNavProfile() {
      const isLoggedIn = !!this.authToken && !!this.currentUser;
      const navLoginBtn = document.getElementById("navLoginBtn");
      const navGetStartedBtn = document.getElementById("navGetStartedBtn");
      const profileBtn = document.getElementById("profileBtn");
      const navNotifWrap = document.getElementById("navNotifWrap");

      if (isLoggedIn) {
        if (navLoginBtn) navLoginBtn.classList.add("hidden");
        if (navGetStartedBtn) navGetStartedBtn.classList.add("hidden");
        if (profileBtn) profileBtn.classList.remove("hidden");
        if (navNotifWrap) navNotifWrap.classList.remove("hidden");
      } else {
        if (navLoginBtn) navLoginBtn.classList.remove("hidden");
        if (navGetStartedBtn) navGetStartedBtn.classList.remove("hidden");
        if (profileBtn) profileBtn.classList.add("hidden");
        if (navNotifWrap) navNotifWrap.classList.add("hidden");
      }

      const user = this.currentUser || { name: "Citizen", role: "CITIZEN" };
      const navName = document.getElementById("navProfileName");
      const navAvatar = document.getElementById("navAvatarRing");
      const profileDisplayName = document.getElementById("profileDisplayName");
      const profileRoleBadge = document.getElementById("profileRoleBadge");
      const profileEmail = document.getElementById("profileEmailDisplay");
      const profileWard = document.getElementById("profileWardDisplay");
      const profileAvatarText = document.getElementById("profileAvatarText");
      const profileKarma = document.getElementById("profileKarmaScore");

      const isAuthority = user.role === "AUTHORITY";
      const initials = user.name ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "CS";

      if (navName) navName.textContent = isAuthority ? "BBMP Officer (Admin)" : `${user.name || 'Citizen'} (${(user.ward || 'Bengaluru').split(' ')[0]})`;
      if (navAvatar) {
        navAvatar.textContent = initials;
        navAvatar.style.background = isAuthority ? "linear-gradient(135deg, #D97706, #B45309)" : "linear-gradient(135deg, #1D4ED8, #0284C7)";
      }

      if (profileDisplayName) profileDisplayName.textContent = user.name || "Citizen Saathi";
      if (profileRoleBadge) {
        profileRoleBadge.textContent = isAuthority ? "BBMP Authority" : "Citizen";
        profileRoleBadge.className = isAuthority ? "role-badge-pill role-badge-authority" : "role-badge-pill role-badge-citizen";
      }
      if (profileEmail) profileEmail.textContent = user.email || "citizen@citysaathi.in";
      if (profileWard) profileWard.textContent = `📍 ${user.ward || 'Indiranagar (Ward 112)'}`;
      if (profileAvatarText) {
        profileAvatarText.textContent = initials;
        profileAvatarText.style.background = isAuthority ? "linear-gradient(135deg, #D97706, #B45309)" : "linear-gradient(135deg, #1D4ED8, #0284C7)";
      }
      if (profileKarma) profileKarma.textContent = user.karmaPoints || 240;

      // Update role buttons in modal
      const citBtn = document.getElementById("demoCitizenBtn");
      const authBtn = document.getElementById("demoAuthorityBtn");
      if (citBtn) citBtn.classList.toggle("active", !isAuthority);
      if (authBtn) authBtn.classList.toggle("active", isAuthority);
    },

    updateLocalComplaint(id, updated) {
      const list = this.getAll();
      const index = list.findIndex(c => c.id === id || c.dbId === Number(id));
      if (index !== -1) {
        list[index] = { ...list[index], ...updated };
        SafeStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      }
    },

    update(id, updates) {
      const list = this.getAll();
      const index = list.findIndex(c => c.id === id || c.dbId === Number(id));
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        SafeStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
        return list[index];
      }
      return null;
    },

    async seedDemoData() {
      if (this.serverConnected) {
        await this.syncFromServer();
      } else {
        SafeStorage.setItem(this.STORAGE_KEY, JSON.stringify(InitialDemoComplaints));
      }
    },

    async resetToClean() {
      SafeStorage.removeItem(this.STORAGE_KEY);
      if (this.serverConnected) {
        await this.syncFromServer();
      } else {
        await this.init();
      }
    },

    getNotifications() {
      const defaultNotifs = [
        { id: "n1", title: "Repair Evidence Uploaded", desc: "BBMP uploaded after photo for CS-2026-00091. Please verify.", time: "10 mins ago", unread: true },
        { id: "n2", title: "Crew Dispatched (CS-2026-00084)", desc: "Cold mix asphalt crew working on 100ft road Indiranagar.", time: "2 hours ago", unread: true },
        { id: "n3", title: "Ward Health Weekly Report", desc: "Indiranagar Ward 112 improved cleanliness score to 84/100.", time: "Yesterday", unread: false }
      ];
      try {
        const stored = SafeStorage.getItem(this.NOTIF_KEY);
        return stored ? JSON.parse(stored) : defaultNotifs;
      } catch (e) {
        return defaultNotifs;
      }
    },

    addNotification(notif) {
      const list = this.getNotifications();
      list.unshift(notif);
      SafeStorage.setItem(this.NOTIF_KEY, JSON.stringify(list.slice(0, 10)));
    },

    markAllNotificationsRead() {
      const list = this.getNotifications().map(n => ({ ...n, unread: false }));
      SafeStorage.setItem(this.NOTIF_KEY, JSON.stringify(list));
      if (this.authToken) {
        this.apiCall('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
      }
    }
  };

  /* --------------------------------------------------------------------------
     5. CIVIC AI ENGINE
     Keyword classification, transparent priority calculation, and duplicate radar
     -------------------------------------------------------------------------- */
  const CivicAI = {
    keywordMap: {
      "Road / Pothole": ["pothole", "crater", "asphalt", "tar", "footpath", "sidewalk", "divider", "manhole", "road", "speedbreaker", "curb"],
      "Garbage / Waste": ["garbage", "trash", "waste", "dump", "blackspot", "debris", "plastic", "smell", "rotting", "bin", "litter"],
      "Streetlight": ["streetlight", "light", "lamp", "dark", "wiring", "pole", "bulb", "illumination", "bescom", "power", "blackout"],
      "Water / Drainage": ["water", "drain", "drainage", "sewage", "gutter", "pipe", "pipeline", "leak", "flood", "burst", "overflow", "bwssb"],
      "Public Amenities": ["park", "bench", "tree", "signboard", "signal", "toilet", "bus stop", "zebra", "railing"]
    },

    criticalKeywords: ["danger", "accident", "slip", "death", "severe", "spark", "fire", "live wire", "open manhole", "deep crater", "burst", "submerged"],
    urgentKeywords: ["overflow", "blocked", "heavy", "traffic", "dark", "school", "hospital", "elderly"],

    analyze({ title, description, category, ward, location }) {
      const text = `${title} ${description}`.toLowerCase();

      // 1. Category check
      let suggestedCategory = category;
      let highestMatches = 0;

      for (const [cat, words] of Object.entries(this.keywordMap)) {
        let count = 0;
        words.forEach(w => {
          if (text.includes(w)) count++;
        });
        if (count > highestMatches) {
          highestMatches = count;
          suggestedCategory = cat;
        }
      }

      // Confidence score (88% to 97%)
      const confidence = Math.min(97, Math.max(88, 88 + highestMatches * 2));

      // 2. Transparent Priority Assessment
      let priority = "Normal";
      const factors = [];

      const hasCritical = this.criticalKeywords.some(w => text.includes(w));
      const hasUrgent = this.urgentKeywords.some(w => text.includes(w));

      if (hasCritical) {
        priority = "Critical";
        factors.push("Safety Hazard: High risk of vehicle skidding or physical pedestrian injury.");
      } else if (hasUrgent) {
        priority = "High";
        factors.push("Urgent Impact: Major disturbance to public sanitation or transit flow.");
      } else {
        priority = "Medium";
        factors.push("Routine Municipal Maintenance: Standard category SLA applies.");
      }

      // Density Multiplier
      if (text.includes("100ft") || text.includes("mg road") || text.includes("ring road") || text.includes("metro")) {
        factors.push("High Density Corridor: Located on a primary Bengaluru transit artery.");
        if (priority === "Medium") priority = "High";
      }

      // 3. Duplicate Detection Radar
      const existing = CivicStore.getAll();
      let matchedDuplicate = null;

      for (const item of existing) {
        if (item.category === (suggestedCategory || category)) {
          const itemText = (item.title + " " + item.description).toLowerCase();
          const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const commonWords = words.filter(w => itemText.includes(w));

          if (commonWords.length >= 2 || (item.ward && ward && item.ward === ward)) {
            matchedDuplicate = {
              id: item.id,
              title: item.title,
              distance: Math.floor(80 + Math.random() * 200) + "m away",
              status: item.status,
              similarity: Math.floor(85 + Math.random() * 10) + "%"
            };
            factors.push(`Corroborated by ${item.id}: Multiple citizen reports in proximity.`);
            break;
          }
        }
      }

      const assignedAgency = CivicStore.resolveAgency(suggestedCategory);

      return {
        suggestedCategory,
        confidence: `${confidence}% Confidence`,
        priority,
        assignedAgency,
        factors,
        duplicate: matchedDuplicate
      };
    }
  };

  /* --------------------------------------------------------------------------
     5.1 CIVIC GEOCODING SERVICE (Free-First OpenStreetMap Nominatim)
     User-triggered searches only (Search button / Enter / pin dragend). Zero API keys required.
     -------------------------------------------------------------------------- */
  const CivicGeocoding = {
    _lastReqTime: 0,
    async searchPlace(query) {
      if (!query || query.trim().length < 3) return null;
      const now = Date.now();
      if (now - this._lastReqTime < 1000) {
        await new Promise(r => setTimeout(r, 1000 - (now - this._lastReqTime)));
      }
      this._lastReqTime = Date.now();
      try {
        const fullQuery = query.toLowerCase().includes("bengaluru") || query.toLowerCase().includes("bangalore")
          ? query
          : `${query}, Bengaluru, Karnataka, India`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name
          };
        }
      } catch (e) {
        console.warn("Nominatim search error:", e);
      }
      return null;
    },

    async reverseGeocode(lat, lng) {
      const now = Date.now();
      if (now - this._lastReqTime < 1000) {
        await new Promise(r => setTimeout(r, 1000 - (now - this._lastReqTime)));
      }
      this._lastReqTime = Date.now();
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.display_name ? data.display_name : null;
      } catch (e) {
        console.warn("Nominatim reverse geocode error:", e);
      }
      return null;
    }
  };

  /* --------------------------------------------------------------------------
     6. LEAFLET MAP CONTROLLER (Free-First with Dark Mode & Draggable Pins)
     -------------------------------------------------------------------------- */
  const CivicMap = {
    map: null,
    pickerMap: null,
    pickerTileLayer: null,
    markersLayer: null,
    pickerMarker: null,
    activeCategory: "all",

    initMainMap() {
      const container = document.getElementById("citySaathiMap");
      if (!container) return;

      if (typeof L === "undefined") {
        this.renderFallbackMap(container);
        return;
      }

      try {
        const bglCenter = [12.9716, 77.5946];
        this.map = L.map("citySaathiMap", {
          zoomControl: false,
          attributionControl: false
        }).setView(bglCenter, 12);

        L.control.zoom({ position: "bottomright" }).addTo(this.map);

        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const darkBase = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
        const darkRef = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
        const lightUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        if (isDark) {
          this.baseTileLayer = L.tileLayer(darkBase, { maxZoom: 19, maxNativeZoom: 16, attribution: '&copy; Esri, OpenStreetMap' }).addTo(this.map);
          this.refTileLayer = L.tileLayer(darkRef, { maxZoom: 19, maxNativeZoom: 16 }).addTo(this.map);
        } else {
          this.baseTileLayer = L.tileLayer(lightUrl, { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(this.map);
        }

        this.markersLayer = L.layerGroup().addTo(this.map);

        this.bindLayersPanel();
        this.renderMarkers();
      } catch (e) {
        console.warn("Leaflet map init warning:", e);
        this.renderFallbackMap(container);
      }
    },

    bindLayersPanel() {
      const panel = document.getElementById("mapLayersPanel");
      if (!panel) return;
      panel.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", () => {
          this.renderMarkers();
        });
      });
    },

    renderFallbackMap(container) {
      const complaints = CivicStore.getAll();
      container.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at center, var(--bg-surface) 0%, var(--bg-app) 100%);padding:24px;text-align:center;">
          <div style="max-width:540px;background:var(--bg-surface-elevated);border:1px solid var(--border-medium);border-radius:var(--radius-xl);padding:24px;box-shadow:var(--shadow-lg);">
            <div style="font-size:2.4rem;margin-bottom:12px;">🗺️</div>
            <h3 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:6px;">Bengaluru Civic Grid Active</h3>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:18px;">
              Live GPS coordinate engine tracking ${complaints.length} municipal reports across Indiranagar, Koramangala, Whitefield, HSR Layout, and CBD.
            </p>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;text-align:left;font-size:0.8rem;margin-bottom:16px;">
              <div style="background:var(--bg-subtle);padding:10px;border-radius:var(--radius-md);">
                <strong>Indiranagar (Ward 112)</strong><br><span class="text-danger">● Deep crater pothole (In Progress)</span>
              </div>
              <div style="background:var(--bg-subtle);padding:10px;border-radius:var(--radius-md);">
                <strong>Koramangala (Ward 151)</strong><br><span class="text-green">● Footpath waste (Resolved)</span>
              </div>
              <div style="background:var(--bg-subtle);padding:10px;border-radius:var(--radius-md);">
                <strong>Whitefield (Ward 84)</strong><br><span class="text-green">● Streetlights (Verified)</span>
              </div>
              <div style="background:var(--bg-subtle);padding:10px;border-radius:var(--radius-md);">
                <strong>HSR Layout (Ward 174)</strong><br><span class="text-blue">● Pipe burst (Work Started)</span>
              </div>
            </div>
            <button class="btn btn-primary btn-sm full-width" onclick="window.CitySaathiApp.switchTab('tracking')">
              Open Live Issue Tracker &rarr;
            </button>
          </div>
        </div>
      `;
    },

    updateTheme() {
      if (typeof L === "undefined") return;
      try {
        const isDark = document.documentElement.getAttribute("data-theme") !== "light";
        if (this.map) {
          if (this.baseTileLayer) this.map.removeLayer(this.baseTileLayer);
          if (this.refTileLayer) this.map.removeLayer(this.refTileLayer);

          if (isDark) {
            this.baseTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16, attribution: '&copy; Esri, OpenStreetMap' }).addTo(this.map);
            this.refTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16 }).addTo(this.map);
          } else {
            this.baseTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(this.map);
          }
        }

        if (this.pickerMap) {
          if (this.pickerTileLayer) this.pickerMap.removeLayer(this.pickerTileLayer);
          this.pickerTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
          }).addTo(this.pickerMap);
        }
      } catch (e) {
        console.warn("Theme tile update warning:", e);
      }
    },

    renderMarkers() {
      if (!this.markersLayer || typeof L === "undefined") return;
      this.markersLayer.clearLayers();

      const complaints = CivicStore.getAll();
      
      // Determine active filters from the layers panel checkboxes
      const panel = document.getElementById("mapLayersPanel");
      let activeCategories = [];
      let allChecked = true;
      if (panel) {
        const allCb = panel.querySelector("#layerFilterAll");
        allChecked = allCb ? allCb.checked : true;
        if (!allChecked) {
          panel.querySelectorAll("input[type='checkbox']:checked").forEach(cb => {
            const cat = cb.getAttribute("data-filter");
            if (cat && cat !== "all") activeCategories.push(cat);
          });
        }
      }

      const filtered = complaints.filter(c => {
        if (allChecked) return true;
        return activeCategories.includes(c.category);
      });

      filtered.forEach(c => {
        if (!c.lat || !c.lng) return;

        let pinClass = "pin-normal";
        if (c.status === "Resolved" || c.status === "Verified") pinClass = "pin-resolved";
        else if (c.priority === "Critical") pinClass = "pin-critical";
        else if (c.priority === "High") pinClass = "pin-warning";

        const iconHtml = `
          <div class="custom-map-pin ${pinClass}" style="width: 32px; height: 32px; font-size: 14px;">
            ${this.getCategoryIcon(c.category)}
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([c.lat, c.lng], { icon: customIcon });
        marker.on("click", () => this.showQuickCard(c));
        this.markersLayer.addLayer(marker);
      });

      // Render the bottom Nearby Issues Carousel (Screen 3)
      this.renderNearbyCarousel(filtered);
    },

    renderNearbyCarousel(complaints) {
      const carousel = document.getElementById("nearbyIssuesCarousel");
      const badge = document.getElementById("carouselCountBadge");
      if (!carousel) return;

      if (badge) badge.textContent = `(${complaints.length} active)`;

      if (complaints.length === 0) {
        carousel.innerHTML = `<div style="padding: 12px; color: #94A3B8; font-size: 0.8rem;">No civic reports matching current layer filters.</div>`;
        return;
      }

      carousel.innerHTML = complaints.map(c => {
        const thumb = c.evidencePhotoBefore || EvidenceAssets.potholeBefore;
        const statusSlug = (c.status || "Submitted").toLowerCase().replace(/\s+/g, "");
        return `
          <div class="nearby-carousel-card" data-id="${c.id}" data-lat="${c.lat}" data-lng="${c.lng}">
            <img src="${thumb}" class="ncc-thumb" alt="thumbnail">
            <div class="ncc-content">
              <div class="ncc-title">${escapeHtml(c.title)}</div>
              <div class="ncc-loc">📍 ${escapeHtml(c.location || c.ward || 'Bengaluru')}</div>
              <div class="ncc-meta">
                <span class="ncc-status-pill ncc-status-${statusSlug}">${escapeHtml(c.status)}</span>
                <span style="font-size:0.68rem;color:var(--text-muted);">${escapeHtml(c.category.split('/')[0])}</span>
              </div>
            </div>
          </div>
        `;
      }).join("");

      // Bind click on carousel card to fly map and open quick card
      carousel.querySelectorAll(".nearby-carousel-card").forEach(card => {
        card.addEventListener("click", () => {
          const id = card.getAttribute("data-id");
          const c = CivicStore.getById(id);
          if (c && this.map && c.lat && c.lng) {
            this.map.flyTo([c.lat, c.lng], 15, { duration: 1.2 });
            this.showQuickCard(c);
          }
        });
      });
    },

    getCategoryIcon(cat) {
      switch (cat) {
        case "Road / Pothole": return "🕳️";
        case "Garbage / Waste": return "🗑️";
        case "Streetlight": return "💡";
        case "Water / Drainage": return "💧";
        default: return "📍";
      }
    },

    showQuickCard(c) {
      const card = document.getElementById("mapQuickCard");
      const content = document.getElementById("quickCardContent");
      if (!card || !content) return;

      const thumb = c.evidencePhotoBefore ? `<img src="${c.evidencePhotoBefore}" style="width: 100%; height: 110px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: 8px;">` : '';

      content.innerHTML = `
        ${thumb}
        <span class="cc-id">${escapeHtml(c.id)}</span>
        <h4 style="font-size: 0.95rem; font-weight: 700; margin: 4px 0 2px;">${escapeHtml(c.title)}</h4>
        <p style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 8px;">📍 ${escapeHtml(c.location)}</p>
        <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
          <span class="status-badge ${getStatusClass(c.status)}">${escapeHtml(c.status)}</span>
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--brand-electric);">${escapeHtml(c.assignedDept)}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary btn-sm full-width" onclick="window.CitySaathiApp.trackComplaint('${c.id}')">
            Track Progress &rarr;
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.CitySaathiApp.confirmExisting('${c.id}')" title="Indicate this issue still exists">
            +1 Still Exists
          </button>
        </div>
      `;
      card.classList.remove("hidden");
    },

    initPickerMap() {
      const container = document.getElementById("locationPickerMap");
      if (!container) return;

      if (this.pickerMap) {
        try {
          this.pickerMap.invalidateSize();
        } catch (e) {}
        return;
      }

      if (typeof L === "undefined") {
        container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:var(--bg-subtle);color:var(--text-muted);text-align:center;padding:20px;">
            <span style="font-size:1.8rem;margin-bottom:6px;">📍</span>
            <strong>Bengaluru GPS Ready</strong>
            <p style="font-size:0.75rem;">12.9784° N, 77.6408° E</p>
          </div>
        `;
        return;
      }

      try {
        const defaultCenter = [12.9784, 77.6408];
        this.pickerMap = L.map("locationPickerMap", {
          zoomControl: false,
          attributionControl: true
        }).setView(defaultCenter, 14);

        L.control.zoom({ position: "bottomright" }).addTo(this.pickerMap);

        this.pickerTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
        }).addTo(this.pickerMap);

        // Add Draggable Red Teardrop Pin Marker
        const pinIcon = L.divIcon({
          html: '<div style="width: 32px; height: 32px; background: #EF4444; border: 2.5px solid #FFFFFF; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(239,68,68,0.6);"><span style="transform: rotate(45deg); font-size: 14px; color: white; display: block; line-height: 1;">📍</span></div>',
          className: "custom-leaflet-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });

        this.pickerMarker = L.marker(defaultCenter, { draggable: true, icon: pinIcon }).addTo(this.pickerMap);

        // Auto-update coords & reverse geocode address on drag end
        this.pickerMarker.on("dragend", async () => {
          const pos = this.pickerMarker.getLatLng();
          const display = document.getElementById("displayCoords");
          if (display) display.textContent = `${pos.lat.toFixed(4)}° N, ${pos.lng.toFixed(4)}° E`;

          const address = await CivicGeocoding.reverseGeocode(pos.lat, pos.lng);
          if (address) {
            const locInput = document.getElementById("formLocation");
            if (locInput) locInput.value = address;
            showToast("📍 Address updated from pin placement", "info");
          }
        });

        // Click anywhere on map moves the pin and updates location
        this.pickerMap.on("click", async (e) => {
          this.pickerMarker.setLatLng(e.latlng);
          const display = document.getElementById("displayCoords");
          if (display) display.textContent = `${e.latlng.lat.toFixed(4)}° N, ${e.latlng.lng.toFixed(4)}° E`;

          const address = await CivicGeocoding.reverseGeocode(e.latlng.lat, e.latlng.lng);
          if (address) {
            const locInput = document.getElementById("formLocation");
            if (locInput) locInput.value = address;
            showToast("📍 Address updated from map click", "info");
          }
        });

        this.pickerMap.on("move", () => {
          const center = this.pickerMap.getCenter();
          const display = document.getElementById("displayCoords");
          if (display && !this.pickerMarker) {
            display.textContent = `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° E`;
          }
        });

        // ResizeObserver to automatically adjust to container sizing
        if (typeof ResizeObserver !== "undefined" && container) {
          const ro = new ResizeObserver(() => {
            if (this.pickerMap) this.pickerMap.invalidateSize();
          });
          ro.observe(container);
        }

        // Delay invalidation to ensure rendering after wizard step transition
        setTimeout(() => {
          if (this.pickerMap) this.pickerMap.invalidateSize();
        }, 100);

        // Wire user-triggered location search
        this.bindLocationSearch();

      } catch (err) {
        console.warn("Picker map init warning:", err);
      }
    },

    bindLocationSearch() {
      const searchBtn = document.getElementById("searchAddressBtn");
      const searchInput = document.getElementById("mapSearchAddressInput");

      const executeSearch = async () => {
        const query = searchInput ? searchInput.value.trim() : "";
        if (!query) {
          showToast("Please enter a Bengaluru location or landmark to search.", "info");
          return;
        }

        if (searchBtn) searchBtn.textContent = "Searching...";
        const result = await CivicGeocoding.searchPlace(query);
        if (searchBtn) searchBtn.textContent = "Search";

        if (result) {
          this.panPickerTo(result.lat, result.lng);

          const locInput = document.getElementById("formLocation");
          if (locInput) locInput.value = result.displayName;

          showToast("📍 Located area on map!", "success");
        } else {
          showToast("Could not locate area via Nominatim. You can drag the pin directly on the map.", "info");
        }
      };

      searchBtn?.addEventListener("click", executeSearch);
      searchInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          executeSearch();
        }
      });
    },

    panPickerTo(lat, lng) {
      if (this.pickerMap) {
        try {
          const numLat = Number(lat);
          const numLng = Number(lng);
          this.pickerMap.setView([numLat, numLng], 15);
          if (this.pickerMarker) {
            this.pickerMarker.setLatLng([numLat, numLng]);
          }
          const display = document.getElementById("displayCoords");
          if (display) display.textContent = `${numLat.toFixed(4)}° N, ${numLng.toFixed(4)}° E`;
        } catch (e) {
          console.warn("panPickerTo error:", e);
        }
      }
    }
  };

  /* --------------------------------------------------------------------------
     7. CANVAS CHARTS CONTROLLER (Pure Vanilla JS Canvas, Zero External Dependencies)
     -------------------------------------------------------------------------- */
  const CivicCharts = {
    categorySlices: [],
    hoveredCategorySlice: null,
    trendPoints: [],
    hoveredTrendIndex: -1,

    renderCategoryChart() {
      const canvas = document.getElementById("categoryChart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const complaints = CivicStore.getAll();

      // Primary civic categories configuration
      const categoryConfig = [
        { name: "Road / Pothole", label: "Roads & Potholes", color: "#2563EB" },
        { name: "Garbage / Waste", label: "Garbage & Waste", color: "#10B981" },
        { name: "Streetlight", label: "Streetlights", color: "#F59E0B" },
        { name: "Water / Drainage", label: "Water & Drainage", color: "#06B6D4" },
        { name: "Public Amenities", label: "Public Amenities", color: "#8B5CF6" }
      ];

      // High-DPI Canvas scaling
      const dpr = window.devicePixelRatio || 1;
      const width = 340;
      const height = 195;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.scale(dpr, dpr);

      const total = complaints.length || 1;
      let accumulatedAngle = -Math.PI / 2; // start from top (12 o'clock)

      this.categorySlices = [];

      categoryConfig.forEach(cat => {
        const count = complaints.filter(c => c.category === cat.name).length;
        const pct = Math.round((count / total) * 100);
        const sliceAngle = (count / total) * 2 * Math.PI;
        const startAngle = accumulatedAngle;
        const endAngle = accumulatedAngle + sliceAngle;
        accumulatedAngle = endAngle;

        this.categorySlices.push({
          ...cat,
          count,
          pct,
          startAngle,
          endAngle
        });
      });

      const cx = width / 2;
      const cy = height / 2 - 4;
      const baseRadius = 66;
      const innerRadius = 40;

      ctx.clearRect(0, 0, width, height);

      // Draw donut slices
      this.categorySlices.forEach((slice, idx) => {
        if (slice.count === 0) return;
        const isHovered = this.hoveredCategorySlice === idx;
        const r = isHovered ? baseRadius + 6 : baseRadius;
        const ir = isHovered ? innerRadius - 2 : innerRadius;

        ctx.beginPath();
        ctx.arc(cx, cy, r, slice.startAngle, slice.endAngle);
        ctx.arc(cx, cy, ir, slice.endAngle, slice.startAngle, true);
        ctx.closePath();
        ctx.fillStyle = slice.color;
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      });

      // Center donut hole text
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      ctx.fillStyle = isDark ? "#F8FAFC" : "#0F172A";
      ctx.font = "bold 20px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(complaints.length, cx, cy - 5);

      ctx.fillStyle = isDark ? "#94A3B8" : "#64748B";
      ctx.font = "600 10px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("ISSUES", cx, cy + 13);

      // Render interactive legend grid
      const legendGrid = document.getElementById("categoryLegendGrid");
      if (legendGrid) {
        legendGrid.innerHTML = this.categorySlices.map((slice, i) => `
          <div class="legend-item ${(typeof AuthorityController !== 'undefined' && AuthorityController.categoryFilter === slice.name) ? 'active' : ''}" 
               data-category="${escapeHtml(slice.name)}" 
               data-slice-index="${i}" 
               title="Click to filter queue by ${escapeHtml(slice.label)}">
            <span style="display:flex; align-items:center; gap:6px;">
              <span class="legend-dot" style="background-color: ${slice.color};"></span>
              <span class="legend-label">${escapeHtml(slice.label)}</span>
            </span>
            <span class="legend-count">${slice.count}</span>
          </div>
        `).join("");

        legendGrid.querySelectorAll(".legend-item").forEach(item => {
          item.addEventListener("click", () => {
            const cat = item.dataset.category;
            if (typeof AuthorityController !== 'undefined') {
              AuthorityController.setCategoryFilter(cat);
            }
          });
        });
      }

      // Bind canvas hover & click listeners once
      if (!canvas.dataset.bound) {
        canvas.dataset.bound = "true";
        const tooltip = document.getElementById("categoryChartTooltip");

        canvas.addEventListener("mousemove", (e) => {
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const dx = mouseX - cx;
          const dy = mouseY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let hoveredIdx = -1;
          if (dist >= innerRadius - 4 && dist <= baseRadius + 10) {
            let angle = Math.atan2(dy, dx);
            if (angle < -Math.PI / 2) angle += 2 * Math.PI;

            hoveredIdx = this.categorySlices.findIndex(s => s.count > 0 && angle >= s.startAngle && angle < s.endAngle);
          }

          if (hoveredIdx !== this.hoveredCategorySlice) {
            this.hoveredCategorySlice = hoveredIdx;
            this.renderCategoryChart();
          }

          if (hoveredIdx >= 0 && tooltip) {
            const slice = this.categorySlices[hoveredIdx];
            tooltip.innerHTML = `<strong>${escapeHtml(slice.label)}</strong>: ${slice.count} complaints (${slice.pct}%)<br><span style="font-size:10px; color:#38BDF8;">Click slice to filter queue &rarr;</span>`;
            tooltip.style.left = `${mouseX}px`;
            tooltip.style.top = `${mouseY}px`;
            tooltip.classList.add("visible");
            canvas.style.cursor = "pointer";
          } else if (tooltip) {
            tooltip.classList.remove("visible");
            canvas.style.cursor = "default";
          }
        });

        canvas.addEventListener("mouseleave", () => {
          if (this.hoveredCategorySlice !== null) {
            this.hoveredCategorySlice = null;
            this.renderCategoryChart();
          }
          const tooltip = document.getElementById("categoryChartTooltip");
          if (tooltip) tooltip.classList.remove("visible");
          canvas.style.cursor = "default";
        });

        canvas.addEventListener("click", () => {
          if (this.hoveredCategorySlice !== null && this.hoveredCategorySlice >= 0) {
            const slice = this.categorySlices[this.hoveredCategorySlice];
            if (typeof AuthorityController !== 'undefined') {
              AuthorityController.setCategoryFilter(slice.name);
            }
          }
        });
      }
    },

    renderPriorityChart() {
      const container = document.getElementById("severityBarsContainer");
      if (!container) return;
      const complaints = CivicStore.getAll();
      const total = complaints.length || 1;

      const priorities = [
        { name: "Critical", color: "#EF4444", sla: "< 24h", desc: "Hazardous / High impact" },
        { name: "High", color: "#F59E0B", sla: "< 48h", desc: "Major disruption" },
        { name: "Medium", color: "#3B82F6", sla: "< 5 days", desc: "Standard repair" },
        { name: "Low", color: "#10B981", sla: "< 7 days", desc: "Minor amenity" }
      ];

      container.innerHTML = priorities.map(p => {
        const count = complaints.filter(c => c.priority === p.name).length;
        const pct = Math.round((count / total) * 100);
        const isActive = typeof AuthorityController !== 'undefined' && AuthorityController.priorityFilter === p.name;

        return `
          <div class="severity-bar-row ${isActive ? 'active' : ''}" data-priority="${p.name}" title="Click to filter by ${p.name} severity (${p.sla})">
            <div class="sbr-header">
              <span class="sbr-name" style="color: ${p.color}; font-weight: 700;">
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${p.color}; margin-right:6px;"></span>
                ${p.name}
                <span style="font-size:0.68rem; font-weight:500; color:var(--text-muted); margin-left:6px;">(${p.sla})</span>
              </span>
              <div class="sbr-stats">
                <span class="sbr-count" style="font-weight: 700;">${count}</span>
                <span class="sbr-pct" style="color: var(--text-muted); margin-left: 6px;">(${pct}%)</span>
              </div>
            </div>
            <div class="sbr-track">
              <div class="sbr-fill" style="width: ${Math.max(pct, count > 0 ? 5 : 0)}%; background: linear-gradient(90deg, ${p.color}, ${p.color}aa);"></div>
            </div>
          </div>
        `;
      }).join("");

      container.querySelectorAll(".severity-bar-row").forEach(row => {
        row.addEventListener("click", () => {
          const priority = row.dataset.priority;
          if (typeof AuthorityController !== 'undefined') {
            AuthorityController.setPriorityFilter(priority);
          }
        });
      });
    },

    renderTrendChart() {
      const canvas = document.getElementById("trendChart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const complaints = CivicStore.getAll();

      // High-DPI support
      const dpr = window.devicePixelRatio || 1;
      const width = 340;
      const height = 150;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.scale(dpr, dpr);

      // Real date-based 7-day resolution velocity from database/stats
      let days = [];
      let resolvedPoints = [];
      const stats = CivicStore.cachedStats;

      if (stats && Array.isArray(stats.velocityTrend) && stats.velocityTrend.length > 0) {
        days = stats.velocityTrend.map(v => v.day);
        resolvedPoints = stats.velocityTrend.map(v => v.resolved);
      } else {
        const today = new Date();
        const complaints = CivicStore.getAll();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
          days.push(dayName);
          const dateStr = d.toISOString().slice(0, 10);
          const count = complaints.filter(c => {
            if (c.status !== "Resolved" && c.status !== "Verified") return false;
            const cDate = c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : "";
            return cDate === dateStr;
          }).length;
          resolvedPoints.push(count);
        }
      }

      const totalResolved7d = resolvedPoints.reduce((a, b) => a + b, 0);
      const maxVal = Math.max(...resolvedPoints, 8);

      const paddingLeft = 32;
      const paddingRight = 16;
      const paddingTop = 20;
      const paddingBottom = 26;
      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;

      this.trendPoints = resolvedPoints.map((val, i) => {
        const x = paddingLeft + (i / (days.length - 1)) * chartWidth;
        const y = paddingTop + (1 - val / maxVal) * chartHeight;
        return { x, y, val, day: days[i] };
      });

      ctx.clearRect(0, 0, width, height);

      // Draw smooth Bezier curve area
      ctx.beginPath();
      this.trendPoints.forEach((pt, i) => {
        if (i === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          const prev = this.trendPoints[i - 1];
          const cpX = (prev.x + pt.x) / 2;
          ctx.bezierCurveTo(cpX, prev.y, cpX, pt.y, pt.x, pt.y);
        }
      });

      const lastPt = this.trendPoints[this.trendPoints.length - 1];
      ctx.lineTo(lastPt.x, height - paddingBottom);
      ctx.lineTo(paddingLeft, height - paddingBottom);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
      grad.addColorStop(0, "rgba(16, 185, 129, 0.38)");
      grad.addColorStop(0.7, "rgba(16, 185, 129, 0.12)");
      grad.addColorStop(1, "rgba(16, 185, 129, 0.0)");
      ctx.fillStyle = grad;
      ctx.fill();

      // Stroke curve line
      ctx.beginPath();
      this.trendPoints.forEach((pt, i) => {
        if (i === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          const prev = this.trendPoints[i - 1];
          const cpX = (prev.x + pt.x) / 2;
          ctx.bezierCurveTo(cpX, prev.y, cpX, pt.y, pt.x, pt.y);
        }
      });
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Horizontal subtle grid lines
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75].forEach(frac => {
        const gridY = paddingTop + frac * chartHeight;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, gridY);
        ctx.lineTo(width - paddingRight, gridY);
        ctx.stroke();
      });

      // Draw point markers and x-axis day labels
      this.trendPoints.forEach((pt, i) => {
        const isHovered = this.hoveredTrendIndex === i;

        if (isHovered) {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
          ctx.beginPath();
          ctx.moveTo(pt.x, paddingTop);
          ctx.lineTo(pt.x, height - paddingBottom);
          ctx.stroke();
          ctx.restore();

          // Outer glowing pulse ring
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isHovered ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#10B981";
        ctx.fill();
        ctx.strokeStyle = isDark ? "#0B0F19" : "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isHovered ? "#10B981" : (isDark ? "#64748B" : "#94A3B8");
        ctx.font = isHovered ? "bold 10px 'Plus Jakarta Sans', sans-serif" : "500 10px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(pt.day, pt.x, height - 8);
      });

      // Update bottom metric chips with actual database stats
      const avgSla = (stats && stats.avgResolutionHours) ? `${stats.avgResolutionHours}h` : "24.8h";
      const slaEl = document.getElementById("avgSlaDisplay");
      const totalEl = document.getElementById("sevenDayTotalDisplay");
      if (slaEl) slaEl.textContent = avgSla;
      if (totalEl) totalEl.textContent = `${totalResolved7d} issues`;

      // Bind hover interaction once
      if (!canvas.dataset.bound) {
        canvas.dataset.bound = "true";
        const tooltip = document.getElementById("trendChartTooltip");

        canvas.addEventListener("mousemove", (e) => {
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;

          let closestIdx = -1;
          let minDist = Infinity;
          this.trendPoints.forEach((pt, i) => {
            const d = Math.abs(pt.x - mouseX);
            if (d < minDist && d < 28) {
              minDist = d;
              closestIdx = i;
            }
          });

          if (closestIdx !== this.hoveredTrendIndex) {
            this.hoveredTrendIndex = closestIdx;
            this.renderTrendChart();
          }

          if (closestIdx >= 0 && tooltip) {
            const pt = this.trendPoints[closestIdx];
            tooltip.innerHTML = `
              <strong>${pt.day}</strong><br>
              Resolved: <strong class="text-green">${pt.val} tickets</strong><br>
              <span style="font-size:10px; color:#94A3B8;">Turnaround SLA: ${avgSla}</span>
            `;
            tooltip.style.left = `${pt.x}px`;
            tooltip.style.top = `${pt.y}px`;
            tooltip.classList.add("visible");
            canvas.style.cursor = "crosshair";
          } else if (tooltip) {
            tooltip.classList.remove("visible");
            canvas.style.cursor = "default";
          }
        });

        canvas.addEventListener("mouseleave", () => {
          if (this.hoveredTrendIndex !== -1) {
            this.hoveredTrendIndex = -1;
            this.renderTrendChart();
          }
          const tooltip = document.getElementById("trendChartTooltip");
          if (tooltip) tooltip.classList.remove("visible");
          canvas.style.cursor = "default";
        });
      }
    },

    renderAll() {
      this.renderCategoryChart();
      this.renderPriorityChart();
      this.renderTrendChart();
    }
  };

  /* --------------------------------------------------------------------------
     8. MULTI-STEP WIZARD CONTROLLER (Location-First Sequence with Gemini AI)
     Step 1: Location First (Nominatim search, Ward selector, GPS detect, Leaflet Pin & Coords)
     Step 2: Issue Details & Photo (Category cards, Citizen observation, When noticed, Severity, Photo)
     Step 3: AI-Generated Complaint (Google Gemini structured draft, Editable Title & Actionable Message)
     Step 4: Review & Submit (Comprehensive 4-section review with edit buttons, Real DB persistence)
     -------------------------------------------------------------------------- */
  const WizardController = {
    currentStep: 1,
    attachedPhoto: null,
    attachedPhotoFile: null,
    isRecordingVoice: false,
    mediaRecorder: null,
    audioChunks: [],

    init() {
      this.bindCategoryPicker();
      this.bindAiDraftActions();
      this.bindStepButtons();
      this.bindDropzone();
      this.bindDemoSamples();
      this.bindVoiceRecording();
      this.bindLocationControls();
      this.bindFormSubmission();

      // Ensure picker map is initialized for Step 1
      CivicMap.initPickerMap();
    },

    bindAiDraftActions() {
      // Regenerate / Retry draft buttons
      document.getElementById("regenerateAiDraftBtn")?.addEventListener("click", () => this.generateAiDraft());
      document.getElementById("retryAiDraftBtn")?.addEventListener("click", () => this.generateAiDraft());

      // Quick jump to edit location from Step 2
      document.getElementById("changeLocationLink")?.addEventListener("click", () => this.goToStep(1));

      // Dismiss duplicate notice
      document.getElementById("dismissDuplicateBtn")?.addEventListener("click", () => {
        document.getElementById("aiDuplicateAlert")?.classList.add("hidden");
        showToast("Continuing as separate unique complaint.", "info");
      });
    },

    bindCategoryPicker() {
      const picker = document.getElementById("categoryPicker");
      if (!picker) return;

      const cards = picker.querySelectorAll(".category-card");
      cards.forEach(card => {
        card.addEventListener("click", () => {
          cards.forEach(c => c.classList.remove("selected"));
          card.classList.add("selected");
          const cat = card.getAttribute("data-category");
          const input = document.getElementById("formCategory");
          if (input) input.value = cat;
        });
      });

      if (cards.length > 0 && !picker.querySelector(".category-card.selected")) {
        cards[0].classList.add("selected");
      }
    },

    bindStepButtons() {
      // Step 1 -> Step 2
      document.getElementById("step1NextBtn")?.addEventListener("click", () => {
        const loc = document.getElementById("formLocation")?.value.trim();
        if (!loc) {
          showToast("Please enter a street address or click/drag the pin on the map.", "info");
          document.getElementById("formLocation")?.focus();
          return;
        }
        const ward = document.getElementById("formWard")?.value || "Bengaluru";
        const pillText = document.getElementById("step2LocationPillText");
        if (pillText) pillText.textContent = loc + ' (' + ward + ')';
        this.goToStep(2);
      });

      // Step 2 -> Step 1
      document.getElementById("step2BackBtn")?.addEventListener("click", () => this.goToStep(1));

      // Step 2 -> Step 3
      document.getElementById("step2NextBtn")?.addEventListener("click", () => {
        const desc = document.getElementById("formDescription")?.value.trim();
        if (!desc || desc.length < 3) {
          showToast("Please describe what you observed (minimum 3 characters).", "error");
          document.getElementById("formDescription")?.focus();
          return;
        }
        this.goToStep(3);
        this.generateAiDraft();
      });

      // Step 3 -> Step 2
      document.getElementById("step3BackBtn")?.addEventListener("click", () => this.goToStep(2));

      // Step 3 -> Step 4
      document.getElementById("step3NextBtn")?.addEventListener("click", () => {
        const title = document.getElementById("formTitle")?.value.trim();
        const message = document.getElementById("formComplaintMessage")?.value.trim();
        if (!title) {
          showToast("Please enter or review the complaint title.", "error");
          document.getElementById("formTitle")?.focus();
          return;
        }
        if (!message) {
          showToast("Please enter or review the official complaint message.", "error");
          document.getElementById("formComplaintMessage")?.focus();
          return;
        }
        this.populateReviewSummary();
        this.goToStep(4);
      });

      // Step 4 -> Step 3
      document.getElementById("step4BackBtn")?.addEventListener("click", () => this.goToStep(3));

      // Clickable Step Nodes in Header
      document.querySelectorAll(".step-node").forEach(node => {
        node.addEventListener("click", () => {
          const step = parseInt(node.getAttribute("data-step"), 10);
          if (step < this.currentStep) this.goToStep(step);
        });
      });

      // Character counter for observation
      const descInput = document.getElementById("formDescription");
      const charCounter = document.getElementById("charCount");
      descInput?.addEventListener("input", () => {
        if (charCounter) charCounter.textContent = descInput.value.length;
      });
    },

    goToStep(step) {
      this.currentStep = step;

      document.querySelectorAll(".step-node").forEach(node => {
        const s = parseInt(node.getAttribute("data-step"), 10);
        node.classList.remove("active", "completed");
        if (s === step) node.classList.add("active");
        else if (s < step) node.classList.add("completed");
      });

      document.querySelectorAll(".wizard-step-pane").forEach(pane => pane.classList.remove("active"));
      document.getElementById("stepPane" + step)?.classList.add("active");

      // When entering Step 1, trigger Leaflet resize
      if (step === 1) {
        CivicMap.initPickerMap();
        setTimeout(() => {
          if (CivicMap.pickerMap) CivicMap.pickerMap.invalidateSize();
        }, 60);
        setTimeout(() => {
          if (CivicMap.pickerMap) CivicMap.pickerMap.invalidateSize();
        }, 200);
      }
    },

    async generateAiDraft() {
      const category = document.getElementById("formCategory")?.value || "Road / Pothole";
      const location = document.getElementById("formLocation")?.value.trim() || "Bengaluru";
      const ward = document.getElementById("formWard")?.value || "Indiranagar (Ward 112)";
      const description = document.getElementById("formDescription")?.value.trim() || "";
      const whenNoticed = document.getElementById("formWhenNoticed")?.value || "";
      const severity = document.querySelector('input[name="severity"]:checked')?.value || "Normal";

      const pinPos = (CivicMap.pickerMarker && CivicMap.pickerMarker.getLatLng)
        ? CivicMap.pickerMarker.getLatLng()
        : ((CivicMap.pickerMap && CivicMap.pickerMap.getCenter) ? CivicMap.pickerMap.getCenter() : { lat: 12.9784, lng: 77.6408 });

      const loadingEl = document.getElementById("aiDraftLoading");
      const resultEl = document.getElementById("aiDraftResult");
      const engineBadge = document.getElementById("aiDraftEngineBadge");
      const bannerBadge = document.getElementById("aiEngineBannerBadge");
      const fallbackAlert = document.getElementById("aiDraftFallbackAlert");
      const fallbackText = document.getElementById("aiDraftFallbackText");
      const loadingLoc = document.getElementById("loadingLocationText");

      if (loadingLoc) loadingLoc.textContent = location + ' (' + ward + ')';
      loadingEl?.classList.remove("hidden");
      resultEl?.classList.add("hidden");

      try {
        const res = await fetch("/api/ai/generate-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            locationAddress: location,
            ward,
            latitude: pinPos.lat,
            longitude: pinPos.lng,
            citizenObservation: description,
            additionalDetails: whenNoticed,
            severity
          })
        });

        if (!res.ok) throw new Error("Draft generation failed (HTTP " + res.status + ")");
        const data = await res.json();
        const draft = data.draft || {};

        // Populate Editable Title & Message
        const titleInput = document.getElementById("formTitle");
        const msgInput = document.getElementById("formComplaintMessage");
        if (titleInput) titleInput.value = draft.title || (category + " reported at " + ward);
        if (msgInput) msgInput.value = draft.complaintMessage || description;

        // Populate Triage Badges
        const catEl = document.getElementById("aiDetectedCat");
        const priEl = document.getElementById("aiDetectedPriority");
        const agencyEl = document.getElementById("aiDetectedAgency");
        const slaEl = document.getElementById("aiDetectedSLA");
        const reasonEl = document.getElementById("aiDraftReasonText");

        if (catEl) catEl.textContent = draft.category || category;
        if (priEl) {
          const pri = draft.suggestedPriority || "Medium";
          priEl.textContent = pri + " Priority";
          priEl.className = "ai-factor-value " + (pri === "Critical" ? "priority-badge-high" : (pri === "High" ? "priority-badge-urgent" : "priority-badge-normal"));
        }
        if (agencyEl) agencyEl.textContent = draft.suggestedDepartment?.name || CivicStore.resolveAgency(draft.category || category);
        if (slaEl) slaEl.textContent = draft.suggestedPriority === "Critical" ? "12-24 Hours" : (draft.suggestedPriority === "High" ? "48 Hours" : "72 Hours");
        if (reasonEl) reasonEl.textContent = draft.reason || "Assessed based on municipal safety guidelines and citizen observation.";

        // Engine Status Badges
        if (data.isGemini) {
          if (engineBadge) {
            engineBadge.textContent = "✨ Google Gemini AI (" + (data.model || 'gemini-flash-lite') + ")";
            engineBadge.className = "badge-gemini";
          }
          if (bannerBadge) bannerBadge.textContent = "✨ Powered by Google Gemini";
          fallbackAlert?.classList.add("hidden");
        } else {
          if (engineBadge) {
            engineBadge.textContent = "⚙️ Local Civic Engine (Offline Safe)";
            engineBadge.className = "badge-outline";
          }
          if (bannerBadge) bannerBadge.textContent = "⚙️ Local Civic Engine Active";
          if (fallbackAlert) {
            fallbackAlert.classList.remove("hidden");
            if (fallbackText) fallbackText.textContent = data.fallbackNotice || "Gemini API unavailable; local template draft generated. You can freely edit or retry.";
          }
        }

        // Duplicate Radar Check
        try {
          const dupRes = await CivicStore.checkDuplicates({
            title: draft.title || description.slice(0, 50),
            description,
            category: draft.category || category,
            ward,
            latitude: pinPos.lat,
            longitude: pinPos.lng
          });
          const dupAlert = document.getElementById("aiDuplicateAlert");
          if (dupRes && dupRes.hasDuplicates && dupRes.candidates && dupRes.candidates.length > 0) {
            const topDup = dupRes.candidates[0];
            dupAlert?.classList.remove("hidden");
            const dupDesc = document.getElementById("duplicateDescText");
            const dupPreview = document.getElementById("duplicatePreviewBox");
            if (dupDesc) dupDesc.textContent = topDup.matchReason || ("A similar issue was logged " + topDup.distanceText + ".");
            if (dupPreview) {
              dupPreview.innerHTML = `
                <span class="dup-id">${topDup.complaintCode}</span>
                <span class="dup-title">${escapeHtml(topDup.title)}</span>
                <span class="dup-meta">${topDup.distanceText} • ${topDup.similarityPercent} match • ${topDup.status}</span>
                <button type="button" class="btn btn-outline btn-xs" onclick="window.CitySaathiApp.trackComplaint('${topDup.complaintCode}')">View Similar</button>
              `;
            }
          } else {
            dupAlert?.classList.add("hidden");
          }
        } catch (e) {}

      } catch (err) {
        console.warn("AI draft generation error:", err);
        showToast("AI draft service issue; fallback template applied. You can edit the text manually.", "info");

        // Emergency local template fallback
        const titleInput = document.getElementById("formTitle");
        const msgInput = document.getElementById("formComplaintMessage");
        if (titleInput) titleInput.value = category + " issue near " + location;
        if (msgInput) msgInput.value = 'A civic issue regarding ' + category.toLowerCase() + ' was observed: "' + description + '". Location: ' + location + ', ' + ward + '. Please inspect and resolve.';

        if (fallbackAlert) {
          fallbackAlert.classList.remove("hidden");
          if (fallbackText) fallbackText.textContent = "Network or API issue. A local template draft is provided below for you to review and edit.";
        }
      } finally {
        loadingEl?.classList.add("hidden");
        resultEl?.classList.remove("hidden");
      }
    },

    populateReviewSummary() {
      const location = document.getElementById("formLocation")?.value.trim() || "Bengaluru";
      const ward = document.getElementById("formWard")?.value || "Indiranagar (Ward 112)";
      const category = document.getElementById("formCategory")?.value || "Road / Pothole";
      const priority = document.getElementById("aiDetectedPriority")?.textContent || "High Priority";
      const observation = document.getElementById("formDescription")?.value.trim() || "";
      const title = document.getElementById("formTitle")?.value.trim() || "";
      const message = document.getElementById("formComplaintMessage")?.value.trim() || "";
      const dept = document.getElementById("aiDetectedAgency")?.textContent || CivicStore.resolveAgency(category);

      const pinPos = (CivicMap.pickerMarker && CivicMap.pickerMarker.getLatLng)
        ? CivicMap.pickerMarker.getLatLng()
        : ((CivicMap.pickerMap && CivicMap.pickerMap.getCenter) ? CivicMap.pickerMap.getCenter() : { lat: 12.9784, lng: 77.6408 });

      // Step 4 fields
      const sumLoc = document.getElementById("sumLocation");
      const sumWard = document.getElementById("sumWard");
      const sumCoords = document.getElementById("sumCoords");
      const sumCat = document.getElementById("sumCategory");
      const sumPri = document.getElementById("sumPriority");
      const sumObs = document.getElementById("sumObservation");
      const sumTitle = document.getElementById("sumTitle");
      const sumDesc = document.getElementById("sumDescription");
      const sumDept = document.getElementById("sumDept");
      const sumEvText = document.getElementById("sumEvidenceText");
      const sumEvImg = document.getElementById("sumEvidenceImg");

      if (sumLoc) sumLoc.textContent = location;
      if (sumWard) sumWard.textContent = ward;
      if (sumCoords) sumCoords.textContent = pinPos.lat.toFixed(4) + "° N, " + pinPos.lng.toFixed(4) + "° E";
      if (sumCat) sumCat.textContent = category;
      if (sumPri) {
        sumPri.textContent = priority;
        sumPri.className = priority.includes("Critical") ? "priority-badge-high" : (priority.includes("High") ? "priority-badge-urgent" : "priority-badge-normal");
      }
      if (sumObs) sumObs.textContent = observation;
      if (sumTitle) sumTitle.textContent = title;
      if (sumDesc) sumDesc.textContent = message;
      if (sumDept) sumDept.textContent = dept;

      if (this.attachedPhoto) {
        if (sumEvText) sumEvText.classList.add("hidden");
        if (sumEvImg) {
          sumEvImg.src = this.attachedPhoto;
          sumEvImg.classList.remove("hidden");
        }
      } else {
        if (sumEvText) {
          sumEvText.textContent = "No photo attached (optional)";
          sumEvText.classList.remove("hidden");
        }
        if (sumEvImg) sumEvImg.classList.add("hidden");
      }
    },

    bindDropzone() {
      const dropzone = document.getElementById("uploadDropzone");
      const fileInput = document.getElementById("formPhotoFile");
      const removeBtn = document.getElementById("removePhotoBtn");

      dropzone?.addEventListener("click", (e) => {
        if (e.target.id !== "removePhotoBtn") fileInput?.click();
      });

      fileInput?.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            showToast("Photo exceeds maximum 5MB size limit. Please choose a smaller image.", "error");
            fileInput.value = "";
            return;
          }
          this.attachedPhotoFile = file;
          const reader = new FileReader();
          reader.onload = (e) => this.setPhotoPreview(e.target.result);
          reader.readAsDataURL(file);
        }
      });

      // Drag and drop photo support
      dropzone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("drag-over");
      });
      dropzone?.addEventListener("dragleave", () => {
        dropzone.classList.remove("drag-over");
      });
      dropzone?.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.size > 5 * 1024 * 1024) {
            showToast("Photo exceeds maximum 5MB size limit.", "error");
            return;
          }
          this.attachedPhotoFile = file;
          const reader = new FileReader();
          reader.onload = (ev) => this.setPhotoPreview(ev.target.result);
          reader.readAsDataURL(file);
        }
      });

      removeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearPhotoPreview();
      });
    },

    setPhotoPreview(dataUrl) {
      this.attachedPhoto = dataUrl;
      const previewImg = document.getElementById("photoPreviewImg");
      const previewBox = document.getElementById("photoPreviewContainer");
      const dropContent = document.getElementById("dropzoneContent");
      if (previewImg) previewImg.src = dataUrl;
      previewBox?.classList.remove("hidden");
      dropContent?.classList.add("hidden");
    },

    clearPhotoPreview() {
      this.attachedPhoto = null;
      this.attachedPhotoFile = null;
      const fileInput = document.getElementById("formPhotoFile");
      if (fileInput) fileInput.value = "";
      document.getElementById("photoPreviewContainer")?.classList.add("hidden");
      document.getElementById("dropzoneContent")?.classList.remove("hidden");
    },

    bindDemoSamples() {
      document.querySelectorAll(".btn-demo-sample").forEach(btn => {
        btn.addEventListener("click", () => {
          const type = btn.getAttribute("data-sample");
          let asset = EvidenceAssets.potholeBefore;
          if (type === "garbage") asset = EvidenceAssets.garbageBefore;
          if (type === "streetlight") asset = EvidenceAssets.streetlightBefore;
          if (type === "water") asset = EvidenceAssets.waterBefore;
          this.attachedPhotoFile = null;
          this.setPhotoPreview(asset);
          showToast("Attached sample " + type + " photo for demo", "info");
        });
      });
    },

    bindVoiceRecording() {
      const recordBtn = document.getElementById("voiceRecordBtn");
      const label = document.getElementById("voiceRecordBtnLabel");
      const feedback = document.getElementById("voiceFeedback");
      const transcriptEl = document.getElementById("voiceTranscriptText");
      const descInput = document.getElementById("formDescription");

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        recordBtn?.addEventListener("click", () => {
          showToast("Speech recognition is not supported in this browser. Please type your description.", "info");
          if (feedback) feedback.classList.remove("hidden");
          if (transcriptEl) transcriptEl.textContent = "Speech recognition unavailable in this browser. Please type description above.";
          descInput?.focus();
        });
        return;
      }

      let recognition = null;
      let isListening = false;
      let recognizedText = "";

      recordBtn?.addEventListener("click", () => {
        if (!isListening) {
          try {
            recognition = new SpeechRecognition();
            recognition.lang = "en-IN";
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
              isListening = true;
              recordBtn.classList.add("voice-recording");
              if (label) label.textContent = "Listening... (Click to Finish)";
              if (feedback) feedback.classList.remove("hidden");
              if (transcriptEl) transcriptEl.textContent = "Listening... Speak clearly into microphone.";
            };

            recognition.onresult = (event) => {
              let interimTranscript = "";
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                  recognizedText += (recognizedText ? " " : "") + transcript.trim();
                } else {
                  interimTranscript += transcript;
                }
              }
              const currentDisplay = recognizedText + (interimTranscript ? (" (" + interimTranscript + ")") : "");
              if (transcriptEl) transcriptEl.textContent = currentDisplay ? ('"' + currentDisplay + '"') : "Listening...";
              if (descInput) {
                descInput.value = recognizedText || interimTranscript;
              }
            };

            recognition.onerror = (e) => {
              console.warn("Speech recognition error:", e);
              showToast("Microphone error. Please type your observation.", "error");
              isListening = false;
              recordBtn.classList.remove("voice-recording");
              if (label) label.textContent = "Record Audio";
            };

            recognition.onend = () => {
              isListening = false;
              recordBtn.classList.remove("voice-recording");
              if (label) label.textContent = "Record Audio";
            };

            recognition.start();
          } catch (err) {
            console.warn("Speech start error:", err);
            isListening = false;
          }
        } else {
          try {
            recognition?.stop();
          } catch (e) {}
          isListening = false;
          recordBtn.classList.remove("voice-recording");
          if (label) label.textContent = "Record Audio";
          showToast("Captured voice observation!", "success");
        }
      });
    },

    bindLocationControls() {
      const wardSelect = document.getElementById("formWard");
      const locInput = document.getElementById("formLocation");
      const gpsBtn = document.getElementById("gpsAutoBtn");
      const gpsFeedback = document.getElementById("gpsFeedback");

      wardSelect?.addEventListener("change", () => {
        const val = wardSelect.value;
        if (val.includes("Indiranagar")) CivicMap.panPickerTo(12.9784, 77.6408);
        else if (val.includes("Koramangala")) CivicMap.panPickerTo(12.9352, 77.6245);
        else if (val.includes("Whitefield")) CivicMap.panPickerTo(12.9850, 77.7440);
        else if (val.includes("HSR")) CivicMap.panPickerTo(12.9121, 77.6446);
        else if (val.includes("MG Road")) CivicMap.panPickerTo(12.9734, 77.6186);
      });

      gpsBtn?.addEventListener("click", () => {
        if (!navigator.geolocation) {
          if (gpsFeedback) gpsFeedback.textContent = "Geolocation not supported. Enter landmark manually.";
          return;
        }
        if (gpsFeedback) gpsFeedback.textContent = "Acquiring GPS fix...";

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            if (locInput) locInput.value = "Near Current Location (" + latitude.toFixed(4) + ", " + longitude.toFixed(4) + ")";
            if (gpsFeedback) gpsFeedback.textContent = "GPS Captured (Accuracy ~" + Math.round(pos.coords.accuracy) + "m)";
            CivicMap.panPickerTo(latitude, longitude);
            showToast("GPS coordinates updated!", "success");
          },
          (err) => {
            if (gpsFeedback) gpsFeedback.textContent = "Location permission denied. Enter location manually.";
            showToast("Location access denied. Please type landmark.", "error");
          }
        );
      });
    },

    bindFormSubmission() {
      const form = document.getElementById("multiStepComplaintForm");
      form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById("submitComplaintBtn");
        const origText = submitBtn ? submitBtn.innerHTML : "";
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = "<span>Submitting to Municipal Desk...</span>";
        }

        const title = document.getElementById("formTitle")?.value.trim();
        const description = document.getElementById("formComplaintMessage")?.value.trim() || document.getElementById("formDescription")?.value.trim();
        const category = document.getElementById("formCategory")?.value || "Road / Pothole";
        const ward = document.getElementById("formWard")?.value || "Indiranagar (Ward 112)";
        const location = document.getElementById("formLocation")?.value.trim() || "Bengaluru";
        const severity = document.querySelector('input[name="severity"]:checked')?.value || "Normal";

        const pinPos = (CivicMap.pickerMarker && CivicMap.pickerMarker.getLatLng)
          ? CivicMap.pickerMarker.getLatLng()
          : ((CivicMap.pickerMap && CivicMap.pickerMap.getCenter) ? CivicMap.pickerMap.getCenter() : { lat: 12.9784, lng: 77.6408 });

        try {
          const payload = {
            title,
            description,
            category,
            ward,
            location: location + ", " + ward,
            lat: pinPos.lat,
            lng: pinPos.lng,
            severity,
            photo: this.attachedPhoto || EvidenceAssets.potholeBefore
          };

          const complaint = await CivicStore.createComplaint(payload, this.attachedPhotoFile);
          if (!complaint || !complaint.id) {
            throw new Error("Municipal desk did not return a valid registered ticket reference.");
          }

          document.getElementById("successTicketId").textContent = complaint.id;
          document.getElementById("successCategory").textContent = complaint.category;
          document.getElementById("successDept").textContent = complaint.assignedDept;

          const modal = document.getElementById("successModal");
          modal?.classList.add("open");

          document.getElementById("successTrackBtn").onclick = () => {
            modal?.classList.remove("open");
            form.reset();
            this.clearPhotoPreview();
            this.goToStep(1);
            window.CitySaathiApp.trackComplaint(complaint.id);
          };

          document.getElementById("successNewReportBtn").onclick = () => {
            modal?.classList.remove("open");
            form.reset();
            this.clearPhotoPreview();
            this.goToStep(1);
            window.CitySaathiApp.switchTab("report");
          };

          await window.CitySaathiApp.refreshAll();
        } catch (err) {
          showToast("Submission error: " + err.message, "error");
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      });
    }
  };
  /* --------------------------------------------------------------------------
     9. COMPLAINT TRACKING & CITIZEN VERIFICATION CONTROLLER
     -------------------------------------------------------------------------- */
  const TrackingController = {
    activeFilter: "all",
    selectedTicketId: null,

    init() {
      this.bindFilters();
      this.bindSearch();
    },

    bindFilters() {
      const container = document.getElementById("trackingStatusFilters");
      if (!container) return;

      container.querySelectorAll(".filter-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          container.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          this.activeFilter = chip.getAttribute("data-filter");
          this.renderList();
        });
      });
    },

    bindSearch() {
      const input = document.getElementById("trackingSearchInput");
      const btn = document.getElementById("trackingSearchBtn");

      const doSearch = () => {
        const query = input?.value.trim().toUpperCase();
        if (!query) return;
        const complaint = CivicStore.getById(query);
        if (complaint) {
          this.selectTicket(complaint.id);
          showToast(`Found complaint ${complaint.id}`, "success");
        } else {
          showToast(`No complaint found with ID "${query}"`, "error");
        }
      };

      btn?.addEventListener("click", doSearch);
      input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") doSearch();
      });
    },

    renderList() {
      const feed = document.getElementById("trackingItemsFeed");
      if (!feed) return;

      const complaints = CivicStore.getAll();
      const allCount = complaints.length;
      const activeCount = complaints.filter(c => c.status !== "Resolved" && c.status !== "Verified").length;
      const resolvedCount = complaints.filter(c => c.status === "Resolved" || c.status === "Verified").length;

      document.getElementById("countAll").textContent = allCount;
      document.getElementById("countActive").textContent = activeCount;
      document.getElementById("countResolved").textContent = resolvedCount;

      let filtered = complaints;
      if (this.activeFilter === "active") {
        filtered = complaints.filter(c => c.status !== "Resolved" && c.status !== "Verified");
      } else if (this.activeFilter === "resolved") {
        filtered = complaints.filter(c => c.status === "Resolved" || c.status === "Verified");
      }

      if (filtered.length === 0) {
        feed.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h4>No complaints found</h4>
            <p>No complaints match this filter state.</p>
          </div>
        `;
        return;
      }

      feed.innerHTML = filtered.map(c => `
        <div class="tracking-item-card ${c.id === this.selectedTicketId ? 'selected' : ''}" data-id="${c.id}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span class="cc-id">${escapeHtml(c.id)}</span>
            <span class="status-badge ${getStatusClass(c.status)}">${escapeHtml(c.status)}</span>
          </div>
          <h4 style="font-size: 0.92rem; font-weight: 700; margin: 4px 0;">${escapeHtml(c.title)}</h4>
          <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: var(--text-muted);">
            <span>📍 ${escapeHtml(c.ward || c.location)}</span>
            <span>${escapeHtml(c.createdAt)}</span>
          </div>
        </div>
      `).join("");

      feed.querySelectorAll(".tracking-item-card").forEach(card => {
        card.addEventListener("click", () => {
          const id = card.getAttribute("data-id");
          this.selectTicket(id);
        });
      });

      if (!this.selectedTicketId && filtered.length > 0) {
        this.selectTicket(filtered[0].id);
      }
    },

    selectTicket(id) {
      this.selectedTicketId = id;
      const complaint = CivicStore.getById(id);
      if (!complaint) return;

      document.querySelectorAll(".tracking-item-card").forEach(c => {
        c.classList.toggle("selected", c.getAttribute("data-id") === id);
      });

      this.renderDetail(complaint);
    },

    renderDetail(c) {
      const container = document.getElementById("trackingDetailCard");
      if (!container) return;

      const isResolved = c.status === "Resolved";
      const isVerified = c.status === "Verified";

      let timelineHtml = "";
      if (c.timeline && c.timeline.length > 0) {
        timelineHtml = c.timeline.map((step, idx) => `
          <div class="timeline-step ${step.status}">
            <div class="ts-icon-node">${step.status === 'completed' ? '✓' : (idx + 1)}</div>
            <div class="ts-content">
              <div class="ts-head">
                <strong>${escapeHtml(step.title)}</strong>
                <span class="ts-time">${escapeHtml(step.time)}</span>
              </div>
              <p class="ts-desc">${escapeHtml(step.desc)}</p>
            </div>
          </div>
        `).join("");
      }

      let verificationHtml = "";
      if (isResolved || isVerified) {
        verificationHtml = `
          <div class="citizen-verification-box">
            <div class="cv-header">
              <span class="badge-icon">🔍</span>
              <h4>Citizen Repair Verification</h4>
              <p>Municipal department has uploaded photographic resolution evidence. Review and confirm whether the issue has been completely fixed.</p>
            </div>

            <div class="comparison-photos-grid">
              <div class="photo-compare-col">
                <span class="photo-tag tag-before">BEFORE WORK</span>
                <img src="${c.photo || EvidenceAssets.potholeBefore}" alt="Before evidence">
              </div>
              <div class="photo-compare-col">
                <span class="photo-tag tag-after">AFTER REPAIR (EVIDENCE)</span>
                <img src="${c.afterPhoto || EvidenceAssets.potholeAfter}" alt="After repair evidence">
              </div>
            </div>

            ${c.resolutionNotes ? `<p style="font-size: 0.82rem; margin-bottom: 14px;"><strong>Department Note:</strong> ${escapeHtml(c.resolutionNotes)}</p>` : ''}

            ${!isVerified ? `
              <div class="cv-prompt-bar">
                <strong>Is this civic issue actually fixed?</strong>
                <div class="cv-action-btns">
                  <button class="btn btn-primary btn-sm" onclick="window.CitySaathiApp.verifyRepair('${c.id}', true)">
                    ✓ Yes, it's fixed! (+50 pts)
                  </button>
                  <button class="btn btn-danger-outline btn-sm" onclick="window.CitySaathiApp.verifyRepair('${c.id}', false)">
                    ✗ No, still needs attention
                  </button>
                </div>
              </div>
            ` : `
              <div class="cv-prompt-bar" style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: var(--radius-md);">
                <strong style="color: var(--success-dark);">✅ Citizen Verified & Closed</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">Confirmed by citizen on-site. +50 Saathi Karma awarded.</span>
              </div>
            `}
          </div>
        `;
      }

      container.innerHTML = `
        <div class="td-header">
          <div>
            <span class="td-ticket-id">${escapeHtml(c.id)}</span>
            <h3 class="td-title">${escapeHtml(c.title)}</h3>
          </div>
          <span class="status-badge ${getStatusClass(c.status)}" style="font-size: 0.85rem; padding: 6px 14px;">
            ${escapeHtml(c.status)}
          </span>
        </div>

        <div class="td-meta-bar">
          <div><strong>Category:</strong> ${escapeHtml(c.category)}</div>
          <div><strong>Priority:</strong> <span class="${c.priority === 'Critical' ? 'text-danger' : 'text-blue'}">${escapeHtml(c.priority)}</span></div>
          <div><strong>Assigned Agency:</strong> ${escapeHtml(c.assignedDept)}</div>
          <div><strong>Location:</strong> ${escapeHtml(c.location)}</div>
        </div>

        ${c.priorityReason ? `
          <div class="priority-rationale-pill" style="margin-bottom: 16px; padding: 10px 14px; background: rgba(59, 130, 246, 0.08); border-left: 3px solid var(--primary-accent, #2563EB); border-radius: 4px; font-size: 0.82rem; color: var(--text-dark, #0F172A);">
            <strong style="color: var(--primary-accent, #2563EB);">AI Priority Rationale:</strong> ${escapeHtml(c.priorityReason)}
          </div>
        ` : ''}

        <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 16px;">Resolution Progress Timeline</h4>
        <div class="timeline-stepper">
          ${timelineHtml}
        </div>

        ${verificationHtml}
      `;
    }
  };

  /* --------------------------------------------------------------------------
     10. AUTHORITY DASHBOARD CONTROLLER ("CITY OPERATIONS")
     -------------------------------------------------------------------------- */
  const AuthorityController = {
    kpiFilter: "all",
    searchQuery: "",
    wardFilter: "all",
    categoryFilter: "all",
    priorityFilter: "all",
    statusFilter: "all",
    activeDuplicateCluster: null,

    init() {
      this.bindFilters();
      this.bindKpiCards();
      this.bindSearchAndExport();
      this.bindRefresh();
      this.bindDuplicateHub();
    },

    bindFilters() {
      const ward = document.getElementById("opsWardFilter");
      const cat = document.getElementById("opsCategoryFilter");
      const pri = document.getElementById("opsPriorityFilter");
      const stat = document.getElementById("opsStatusFilter");

      ward?.addEventListener("change", (e) => {
        this.wardFilter = e.target.value;
        this.renderTable();
      });

      cat?.addEventListener("change", (e) => {
        this.categoryFilter = e.target.value;
        this.updateActiveFilterBanner();
        CivicCharts.renderCategoryChart();
        this.renderTable();
      });

      pri?.addEventListener("change", (e) => {
        this.priorityFilter = e.target.value;
        this.updateActiveFilterBanner();
        CivicCharts.renderPriorityChart();
        this.renderTable();
      });

      stat?.addEventListener("change", (e) => {
        this.statusFilter = e.target.value;
        this.renderTable();
      });
    },

    bindKpiCards() {
      const cards = document.querySelectorAll(".auth-kpi-card[data-kpi-filter]");
      cards.forEach(card => {
        card.addEventListener("click", () => {
          const filter = card.getAttribute("data-kpi-filter");
          this.setKpiFilter(filter);
        });
      });

      document.getElementById("clearKpiFilterBtn")?.addEventListener("click", () => {
        this.clearAllFilters();
      });
    },

    setKpiFilter(filter) {
      if (this.kpiFilter === filter && filter !== "all") {
        this.kpiFilter = "all";
      } else {
        this.kpiFilter = filter;
      }

      document.querySelectorAll(".auth-kpi-card[data-kpi-filter]").forEach(c => {
        c.classList.toggle("active-kpi-filter", c.getAttribute("data-kpi-filter") === this.kpiFilter && this.kpiFilter !== "all");
      });

      this.updateActiveFilterBanner();
      this.renderTable();
    },

    setCategoryFilter(category) {
      if (this.categoryFilter === category) {
        this.categoryFilter = "all";
      } else {
        this.categoryFilter = category;
      }
      const catSelect = document.getElementById("opsCategoryFilter");
      if (catSelect) catSelect.value = this.categoryFilter;

      this.updateActiveFilterBanner();
      CivicCharts.renderCategoryChart();
      this.renderTable();
    },

    setPriorityFilter(priority) {
      if (this.priorityFilter === priority) {
        this.priorityFilter = "all";
      } else {
        this.priorityFilter = priority;
      }
      const priSelect = document.getElementById("opsPriorityFilter");
      if (priSelect) priSelect.value = this.priorityFilter;

      this.updateActiveFilterBanner();
      CivicCharts.renderPriorityChart();
      this.renderTable();
    },

    clearAllFilters() {
      this.kpiFilter = "all";
      this.searchQuery = "";
      this.wardFilter = "all";
      this.categoryFilter = "all";
      this.priorityFilter = "all";
      this.statusFilter = "all";

      const searchInput = document.getElementById("opsSearchInput");
      if (searchInput) searchInput.value = "";
      const wardSelect = document.getElementById("opsWardFilter");
      if (wardSelect) wardSelect.value = "all";
      const catSelect = document.getElementById("opsCategoryFilter");
      if (catSelect) catSelect.value = "all";
      const priSelect = document.getElementById("opsPriorityFilter");
      if (priSelect) priSelect.value = "all";
      const statSelect = document.getElementById("opsStatusFilter");
      if (statSelect) statSelect.value = "all";

      document.querySelectorAll(".auth-kpi-card[data-kpi-filter]").forEach(c => {
        c.classList.remove("active-kpi-filter");
      });

      this.updateActiveFilterBanner();
      CivicCharts.renderAll();
      this.renderTable();
      showToast("All filters reset to full city operations queue.", "info");
    },

    updateActiveFilterBanner() {
      const banner = document.getElementById("activeFilterIndicator");
      const textEl = document.getElementById("activeFilterText");
      if (!banner || !textEl) return;

      const parts = [];
      if (this.kpiFilter !== "all") {
        const labels = {
          active: "Active Field Issues (Assigned / In Progress)",
          critical: "Critical Severity (< 24h Response Required)",
          resolved: "Resolved This Month",
          "pending-verif": "Awaiting Citizen Verification"
        };
        parts.push(labels[this.kpiFilter] || this.kpiFilter);
      }
      if (this.categoryFilter !== "all") parts.push(`Category: ${this.categoryFilter}`);
      if (this.priorityFilter !== "all") parts.push(`Priority: ${this.priorityFilter}`);
      if (this.searchQuery) parts.push(`Search: "${this.searchQuery}"`);

      if (parts.length > 0) {
        textEl.textContent = `Active Filters: ${parts.join(" • ")}`;
        banner.classList.remove("hidden");
      } else {
        banner.classList.add("hidden");
      }
    },

    bindSearchAndExport() {
      let debounceTimer = null;
      const searchInput = document.getElementById("opsSearchInput");
      searchInput?.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = (e.target.value || "").trim().toLowerCase();
          this.updateActiveFilterBanner();
          this.renderTable();
        }, 150);
      });

      document.getElementById("exportQueueBtn")?.addEventListener("click", () => {
        this.exportFilteredCsv();
      });
    },

    exportFilteredCsv() {
      const list = this.getFilteredComplaints();
      if (list.length === 0) {
        showToast("No complaints matching active filters to export.", "warning");
        return;
      }

      const headers = ["Ticket ID", "Title", "Category", "Priority", "Ward", "Location", "Status", "Department", "Staff", "Created At"];
      const rows = list.map(c => [
        c.id,
        `"${(c.title || "").replace(/"/g, '""')}"`,
        c.category,
        c.priority,
        `"${(c.ward || "").replace(/"/g, '""')}"`,
        `"${(c.location || "").replace(/"/g, '""')}"`,
        c.status,
        `"${(c.assignedDept || "").replace(/"/g, '""')}"`,
        `"${(c.assignedStaff || "").replace(/"/g, '""')}"`,
        `"${(c.createdAt || "").replace(/"/g, '""')}"`
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `CitySaathi_Operations_Queue_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${list.length} tickets to CSV format.`, "success");
    },

    bindRefresh() {
      document.getElementById("authRefreshBtn")?.addEventListener("click", async () => {
        await CivicStore.syncFromServer();
        this.renderAll();
        showToast("City Operations queue and metrics refreshed from database.", "info");
      });
    },

    bindDuplicateHub() {
      const mergeBtn = document.getElementById("mergeDuplicatesBtn");
      const keepSeparateBtn = document.getElementById("keepSeparateBtn");
      const hub = document.getElementById("duplicateHubSection");

      mergeBtn?.addEventListener("click", async () => {
        if (!this.activeDuplicateCluster || !this.activeDuplicateCluster.complaints || this.activeDuplicateCluster.complaints.length < 2) {
          showToast("No active duplicate cluster selected for consolidation.", "info");
          return;
        }

        if (!CivicStore.currentUser || CivicStore.currentUser.role !== "AUTHORITY") {
          try {
            await CivicStore.demoLogin('authority');
            showToast("Switched session to BBMP Authority Admin.", "info");
          } catch (e) {
            showToast("Authority authorization required to merge tickets.", "error");
            return;
          }
        }

        const complaintIds = this.activeDuplicateCluster.complaints.map(c => c.dbId || c.id);
        const masterCode = `MI-2026-00${Math.floor(10 + Math.random() * 90)}`;
        const title = `Master ${this.activeDuplicateCluster.category}: ${this.activeDuplicateCluster.ward} Corridor`;

        try {
          const res = await CivicStore.apiCall('/api/complaints/merge', {
            method: 'POST',
            body: {
              masterCode,
              title,
              complaintIds,
              notes: "Consolidated by BBMP Authority via Operations Dashboard"
            }
          });

          if (res && res.success) {
            showToast(`Consolidated ${res.mergedCount} reports into Master Ticket ${masterCode}. Citizens alerted.`, "success");
            hub?.classList.add("hidden");
            await CivicStore.syncFromServer();
            this.renderAll();
          } else {
            throw new Error(res?.error || "Merge failed");
          }
        } catch (err) {
          showToast(`Merge error: ${err.message}`, "error");
        }
      });

      keepSeparateBtn?.addEventListener("click", async () => {
        if (!this.activeDuplicateCluster || !this.activeDuplicateCluster.complaints) {
          hub?.classList.add("hidden");
          return;
        }

        if (!CivicStore.currentUser || CivicStore.currentUser.role !== "AUTHORITY") {
          try {
            await CivicStore.demoLogin('authority');
          } catch (e) {}
        }

        const complaintIds = this.activeDuplicateCluster.complaints.map(c => c.dbId || c.id);

        try {
          await CivicStore.apiCall('/api/complaints/dismiss-duplicate', {
            method: 'POST',
            body: {
              complaintIds,
              notes: "Authority determined complaints are distinct physical occurrences."
            }
          });
          showToast("Duplicate group dismissed. Reports maintained as independent.", "info");
          hub?.classList.add("hidden");
          await CivicStore.syncFromServer();
          this.renderAll();
        } catch (err) {
          hub?.classList.add("hidden");
          showToast("Duplicate cluster dismissed.", "info");
        }
      });

      this.loadDuplicateClusters();
    },

    async loadDuplicateClusters() {
      const hub = document.getElementById("duplicateHubSection");
      const previewList = document.getElementById("dupPreviewList");
      const titleEl = document.getElementById("dupGroupTitle");
      const subtitleEl = document.getElementById("dupGroupSubtitle");
      const badgeEl = document.getElementById("dupConfidenceBadge");

      if (!hub || !previewList) return;

      try {
        const data = await CivicStore.apiCall('/api/complaints/duplicate-groups');
        if (data && data.success && data.potentialGroups && data.potentialGroups.length > 0) {
          const group = data.potentialGroups[0];
          this.activeDuplicateCluster = group;

          if (titleEl) titleEl.textContent = `Potential Duplicate Group (#${group.suggestedCode})`;
          if (subtitleEl) subtitleEl.textContent = `${group.complaints.length} citizen reports refer to ${group.sharedTitle} in ${group.ward}.`;
          if (badgeEl) badgeEl.textContent = `94% Geo-Proximity (<350m)`;

          previewList.innerHTML = group.complaints.map(c => `
            <div class="dh-item">
              <span class="dh-id">${escapeHtml(c.complaintCode || ('#' + c.id))}</span>
              <span class="dh-text">${escapeHtml(c.title)}</span>
              <span class="dh-cit">${new Date(c.createdAt).toLocaleDateString()} &bull; ${escapeHtml(c.ward || '')}</span>
            </div>
          `).join("");

          hub.classList.remove("hidden");
          return;
        }
      } catch (e) {
        console.warn("loadDuplicateClusters fallback:", e.message);
      }

      const complaints = CivicStore.getAll();
      const dupCandidates = complaints.filter(c => (c.duplicateCount && c.duplicateCount > 0) || c.isDuplicate);
      if (dupCandidates.length >= 2) {
        this.activeDuplicateCluster = {
          suggestedCode: "GRP-LOCAL-01",
          category: dupCandidates[0].category,
          ward: dupCandidates[0].ward,
          sharedTitle: dupCandidates[0].title,
          complaints: dupCandidates.slice(0, 3)
        };

        if (titleEl) titleEl.textContent = "Potential Duplicate Group (#MI-2026-001)";
        if (subtitleEl) subtitleEl.textContent = "Multiple citizen reports refer to the same road crater along 100ft Road corridor in Indiranagar.";
        if (badgeEl) badgeEl.textContent = "94% Geo-Similarity";

        previewList.innerHTML = dupCandidates.slice(0, 3).map(c => `
          <div class="dh-item">
            <span class="dh-id">${escapeHtml(c.id)}</span>
            <span class="dh-text">${escapeHtml(c.title)}</span>
            <span class="dh-cit">${escapeHtml(c.createdAt)} &bull; ${escapeHtml(c.ward || c.location)}</span>
          </div>
        `).join("");

        hub.classList.remove("hidden");
      } else {
        hub.classList.add("hidden");
      }
    },

    renderAll() {
      this.renderKPIs();
      this.renderTable();
      CivicCharts.renderAll();
      this.loadDuplicateClusters();
    },

    renderKPIs() {
      const complaints = CivicStore.getAll();
      const total = complaints.length;
      const active = complaints.filter(c => c.status === "In Progress" || c.status === "Assigned").length;
      const critical = complaints.filter(c => c.priority === "Critical" && c.status !== "Verified").length;
      const resolved = complaints.filter(c => c.status === "Resolved" || c.status === "Verified").length;
      const pendingVerif = complaints.filter(c => c.status === "Resolved").length;

      document.getElementById("authKpiTotal").textContent = total;
      document.getElementById("authKpiActive").textContent = active;
      document.getElementById("authKpiCritical").textContent = critical;
      document.getElementById("authKpiResolved").textContent = resolved;
      document.getElementById("authKpiPendingVerif").textContent = pendingVerif;
    },

    getFilteredComplaints() {
      let list = CivicStore.getAll();

      // 1. KPI Filter
      if (this.kpiFilter === "active") {
        list = list.filter(c => c.status === "Assigned" || c.status === "In Progress");
      } else if (this.kpiFilter === "critical") {
        list = list.filter(c => c.priority === "Critical" && c.status !== "Verified");
      } else if (this.kpiFilter === "resolved") {
        list = list.filter(c => c.status === "Resolved" || c.status === "Verified");
      } else if (this.kpiFilter === "pending-verif") {
        list = list.filter(c => c.status === "Resolved");
      }

      // 2. Dropdown / Selection Filters
      if (this.wardFilter !== "all") {
        list = list.filter(c => (c.ward || "").includes(this.wardFilter));
      }
      if (this.categoryFilter !== "all") {
        list = list.filter(c => c.category === this.categoryFilter);
      }
      if (this.priorityFilter !== "all") {
        list = list.filter(c => c.priority === this.priorityFilter);
      }
      if (this.statusFilter !== "all") {
        list = list.filter(c => c.status === this.statusFilter);
      }

      // 3. Search Query Filter
      if (this.searchQuery) {
        const q = this.searchQuery;
        list = list.filter(c =>
          (c.id && c.id.toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.category && c.category.toLowerCase().includes(q)) ||
          (c.ward && c.ward.toLowerCase().includes(q)) ||
          (c.location && c.location.toLowerCase().includes(q)) ||
          (c.assignedDept && c.assignedDept.toLowerCase().includes(q))
        );
      }

      return list;
    },

    renderTable() {
      const tbody = document.getElementById("opsTableBody");
      if (!tbody) return;

      const list = this.getFilteredComplaints();

      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 42px 20px; color: var(--text-muted);">
              <div style="font-size: 1.5rem; margin-bottom: 8px;">🔍</div>
              <strong>No complaints match the current operations filters.</strong>
              <p style="font-size: 0.82rem; margin-top: 4px;">Try clearing search keywords or resetting KPI filters.</p>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = list.map(c => `
        <tr>
          <td><span class="cc-id">${escapeHtml(c.id)}</span></td>
          <td class="ops-title-cell">
            <strong>${escapeHtml(c.title)}</strong>
            <span>${escapeHtml(c.description.slice(0, 60))}...</span>
          </td>
          <td>${escapeHtml(c.category)}</td>
          <td>${escapeHtml(c.ward || c.location)}</td>
          <td>
            <span style="font-weight: 700; color: ${c.priority === 'Critical' ? 'var(--danger-main)' : (c.priority === 'High' ? 'var(--warning-main)' : 'var(--brand-electric)')};">
              ${escapeHtml(c.priority)}
            </span>
          </td>
          <td><span style="font-size: 0.78rem; font-weight: 600;">${escapeHtml(c.assignedDept)}</span></td>
          <td><span class="status-badge ${getStatusClass(c.status)}">${escapeHtml(c.status)}</span></td>
          <td>
            <button class="btn btn-outline btn-xs" onclick="window.CitySaathiApp.openAuthorityModal('${c.id}')">
              Manage &rarr;
            </button>
          </td>
        </tr>
      `).join("");
    }
  };

  /* --------------------------------------------------------------------------
     11. AUTHORITY TICKET MANAGEMENT MODAL
     -------------------------------------------------------------------------- */
  const AuthorityModalController = {
    currentId: null,
    attachedAfterPhoto: null,
    attachedAfterPhotoFile: null,

    init() {
      document.getElementById("closeAuthorityModalBtn")?.addEventListener("click", () => this.close());

      // Real on-site repair photo input
      const repairFileInput = document.getElementById("repairPhotoInput");
      repairFileInput?.addEventListener("change", () => {
        const file = repairFileInput.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            showToast("Photo exceeds maximum 5MB size limit.", "error");
            repairFileInput.value = "";
            return;
          }
          this.attachedAfterPhotoFile = file;
          const reader = new FileReader();
          reader.onload = (e) => {
            this.attachedAfterPhoto = e.target.result;
            const img = document.getElementById("modalAfterEvidenceImg");
            if (img) {
              img.src = this.attachedAfterPhoto;
              img.classList.remove("hidden");
            }
          };
          reader.readAsDataURL(file);
          showToast("Attached on-site repair photograph.", "info");
        }
      });

      // Sample after photo button (demo mode)
      document.getElementById("sampleAfterPhotoBtn")?.addEventListener("click", () => {
        this.attachedAfterPhoto = EvidenceAssets.potholeAfter;
        this.attachedAfterPhotoFile = null;
        if (repairFileInput) repairFileInput.value = "";
        const img = document.getElementById("modalAfterEvidenceImg");
        if (img) {
          img.src = this.attachedAfterPhoto;
          img.classList.remove("hidden");
        }
        showToast("Attached sample municipal after photo (Demo).", "info");
      });

      document.getElementById("btnActionAssign")?.addEventListener("click", () => this.updateStatus("Assigned"));
      document.getElementById("btnActionStartWork")?.addEventListener("click", () => this.updateStatus("In Progress"));
      document.getElementById("btnActionResolve")?.addEventListener("click", () => this.resolveWithEvidence());
      document.getElementById("btnActionReopen")?.addEventListener("click", () => this.updateStatus("In Progress", "Reopened for rework"));
    },

    open(id) {
      this.currentId = id;
      const c = CivicStore.getById(id);
      if (!c) return;

      document.getElementById("modalTicketId").textContent = c.id;
      document.getElementById("modalTicketTitle").textContent = c.title;
      document.getElementById("modalTicketDesc").textContent = c.description;
      document.getElementById("modalTicketLocation").textContent = `${c.location} (${c.ward || ''})`;

      const beforeImg = document.getElementById("modalBeforeEvidenceImg");
      if (beforeImg) beforeImg.src = c.photo || EvidenceAssets.potholeBefore;

      const afterImg = document.getElementById("modalAfterEvidenceImg");
      if (c.afterPhoto) {
        if (afterImg) {
          afterImg.src = c.afterPhoto;
          afterImg.classList.remove("hidden");
        }
      } else {
        if (afterImg) afterImg.classList.add("hidden");
      }

      const dept = document.getElementById("modalAssignDept");
      const pri = document.getElementById("modalChangePriority");
      if (dept) dept.value = c.assignedDept;
      if (pri) pri.value = c.priority;

      const reasonEl = document.getElementById("modalPriorityReasonText");
      const reasonBlock = document.getElementById("modalPriorityReasonBlock");
      if (reasonEl && reasonBlock) {
        if (c.priorityReason) {
          reasonEl.textContent = c.priorityReason;
          reasonBlock.classList.remove("hidden");
        } else {
          reasonBlock.classList.add("hidden");
        }
      }

      document.getElementById("authorityModal")?.classList.add("open");
    },

    close() {
      document.getElementById("authorityModal")?.classList.remove("open");
      this.currentId = null;
      this.attachedAfterPhoto = null;
      this.attachedAfterPhotoFile = null;
      const fileInput = document.getElementById("repairPhotoInput");
      if (fileInput) fileInput.value = "";
      const notesInput = document.getElementById("repairNotesInput");
      if (notesInput) notesInput.value = "";
    },

    async updateStatus(newStatus, note) {
      if (!this.currentId) return;
      const dept = document.getElementById("modalAssignDept")?.value;
      const staff = document.getElementById("modalAssignStaff")?.value;
      const pri = document.getElementById("modalChangePriority")?.value;

      try {
        await CivicStore.updateStatus(this.currentId, newStatus, note || `Status updated to ${newStatus} by municipal desk.`);
        showToast(`Ticket ${this.currentId} updated to ${newStatus}`, "success");
      } catch (e) {
        showToast(`Failed to update ticket status: ${e.message}`, "error");
        return;
      }

      this.close();
      await window.CitySaathiApp.refreshAll();
    },

    async resolveWithEvidence() {
      if (!this.currentId) return;
      const notes = document.getElementById("repairNotesInput")?.value.trim() || "Field repair completed as per BBMP standards.";

      if (!this.attachedAfterPhotoFile && !this.attachedAfterPhoto) {
        showToast("Please attach photographic proof of completed repair before resolving.", "error");
        return;
      }

      try {
        await CivicStore.uploadRepairEvidence(
          this.currentId,
          this.attachedAfterPhotoFile || null,
          notes,
          this.attachedAfterPhotoFile ? null : this.attachedAfterPhoto
        );
        showToast(`Ticket ${this.currentId} marked Resolved. Sent to citizen for verification!`, "success");
        this.close();
        await window.CitySaathiApp.refreshAll();
      } catch (e) {
        showToast(`Failed to upload repair evidence: ${e.message}`, "error");
      }
    }
  };

  /* --------------------------------------------------------------------------
     12. GLOBAL SEARCH CONTROLLER (Ctrl+K)
     -------------------------------------------------------------------------- */
  const SearchController = {
    init() {
      const openBtn = document.getElementById("openSearchBtn");
      const closeBtn = document.getElementById("closeSearchModalBtn");
      const modal = document.getElementById("searchModal");
      const input = document.getElementById("globalSearchInput");

      openBtn?.addEventListener("click", () => {
        modal?.classList.add("open");
        input?.focus();
      });

      closeBtn?.addEventListener("click", () => modal?.classList.remove("open"));

      window.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          modal?.classList.add("open");
          input?.focus();
        }
        if (e.key === "Escape" && modal?.classList.contains("open")) {
          modal.classList.remove("open");
        }
      });

      input?.addEventListener("input", () => this.handleSearch(input.value.trim()));
    },

    handleSearch(query) {
      const area = document.getElementById("searchResultsArea");
      if (!area) return;

      if (!query) {
        area.innerHTML = `
          <div class="search-empty-state">
            Type to search complaints across Bengaluru (e.g. "pothole", "Indiranagar", "CS-2026")
          </div>
        `;
        return;
      }

      const q = query.toLowerCase();
      const results = CivicStore.getAll().filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );

      if (results.length === 0) {
        area.innerHTML = `
          <div class="search-empty-state">
            No complaints found matching "${escapeHtml(query)}"
          </div>
        `;
        return;
      }

      area.innerHTML = results.map(c => `
        <div class="search-result-row" onclick="window.CitySaathiApp.trackComplaint('${c.id}'); document.getElementById('searchModal').classList.remove('open');">
          <div>
            <span class="cc-id">${escapeHtml(c.id)}</span>
            <strong style="display: block; font-size: 0.9rem; margin-top: 2px;">${escapeHtml(c.title)}</strong>
            <span style="font-size: 0.74rem; color: var(--text-muted);">📍 ${escapeHtml(c.location)}</span>
          </div>
          <span class="status-badge ${getStatusClass(c.status)}">${escapeHtml(c.status)}</span>
        </div>
      `).join("");
    }
  };

  /* --------------------------------------------------------------------------
     13. NOTIFICATION CENTER & PROFILE
     -------------------------------------------------------------------------- */
  const NotificationController = {
    init() {
      const btn = document.getElementById("notificationBtn");
      const dropdown = document.getElementById("notificationDropdown");
      const markAllBtn = document.getElementById("markAllReadBtn");

      btn?.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown?.classList.toggle("open");
      });

      document.addEventListener("click", (e) => {
        if (!dropdown?.contains(e.target) && e.target !== btn) {
          dropdown?.classList.remove("open");
        }
      });

      markAllBtn?.addEventListener("click", () => {
        CivicStore.markAllNotificationsRead();
        this.render();
      });

      this.render();
    },

    render() {
      const list = CivicStore.getNotifications();
      const badge = document.getElementById("notifBadge");
      const notifContainer = document.getElementById("notifList");
      const unreadCount = list.filter(n => n.unread).length;

      if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? "flex" : "none";
      }

      if (notifContainer) {
        notifContainer.innerHTML = list.map(n => `
          <div class="notif-item ${n.unread ? 'unread' : ''}">
            <div class="notif-item-icon">🔔</div>
            <div class="notif-item-content">
              <h5>${escapeHtml(n.title)}</h5>
              <p>${escapeHtml(n.desc)}</p>
              <span class="notif-item-time">${escapeHtml(n.time)}</span>
            </div>
          </div>
        `).join("");
      }
    }
  };

  /* --------------------------------------------------------------------------
     14. THEME TOGGLE & ISOMETRIC MOUSE TILT
     -------------------------------------------------------------------------- */
  const ThemeAnd3DController = {
    init() {
      this.initTheme();
      this.init3DTilt();
    },

    initTheme() {
      const saved = SafeStorage.getItem(CivicStore.THEME_KEY) || "light";
      document.documentElement.setAttribute("data-theme", saved);

      document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        SafeStorage.setItem(CivicStore.THEME_KEY, next);
        CivicMap.updateTheme();
        CivicCharts.renderAll();
      });
    },

    init3DTilt() {
      const scene = document.getElementById("panoramicCityWrapper") || document.getElementById("heroPanoramic") || document.getElementById("isometricScene");
      if (!scene) return;

      scene.addEventListener("mousemove", (e) => {
        const rect = scene.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotX = (y / rect.height) * -8;
        const rotY = (x / rect.width) * 8;
        scene.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      });

      scene.addEventListener("mouseleave", () => {
        scene.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
      });
    }
  };

  /* --------------------------------------------------------------------------
     15. MASTER APPLICATION ORCHESTRATOR
     -------------------------------------------------------------------------- */
  window.CitySaathiApp = {
    init() {
      CivicStore.init();
      ThemeAnd3DController.init();
      CivicMap.initMainMap();
      WizardController.init();
      TrackingController.init();
      AuthorityController.init();
      AuthorityModalController.init();
      SearchController.init();
      NotificationController.init();

      this.bindNavTabs();
      this.bindHeroAndPillars();
      this.bindBannerControls();
      this.bindCommunityScores();
      this.bindProfileModal();

      this.refreshAll();
    },

    bindNavTabs() {
      const links = document.querySelectorAll(".nav-link, .mob-nav-btn");
      links.forEach(link => {
        link.addEventListener("click", () => {
          const tab = link.getAttribute("data-tab");
          this.switchTab(tab);
        });
      });

      document.getElementById("brandHomeBtn")?.addEventListener("click", () => this.switchTab("home"));
    },

    goToWizardStep(step) {
      this.switchTab("report");
      WizardController.goToStep(step);
    },

    switchTab(tabName) {
      document.querySelectorAll(".nav-link, .mob-nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
      });

      document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
      const targetView = document.getElementById(`view-${tabName}`);
      if (targetView) targetView.classList.add("active");

      if (tabName === "map") {
        setTimeout(() => {
          if (CivicMap.map) CivicMap.map.invalidateSize();
        }, 150);
      } else if (tabName === "report") {
        WizardController.goToStep(1);
        CivicMap.initPickerMap();
        setTimeout(() => {
          if (CivicMap.pickerMap) CivicMap.pickerMap.invalidateSize();
        }, 150);
      } else if (tabName === "authority") {
        AuthorityController.renderAll();
      } else if (tabName === "tracking") {
        TrackingController.renderList();
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    bindHeroAndPillars() {
      document.getElementById("heroReportBtn")?.addEventListener("click", () => this.switchTab("report"));
      document.getElementById("heroTrackBtn")?.addEventListener("click", () => this.switchTab("tracking"));
      document.getElementById("dashQuickReportBtn")?.addEventListener("click", () => this.switchTab("report"));
      document.getElementById("viewAllComplaintsBtn")?.addEventListener("click", () => this.switchTab("tracking"));

      document.getElementById("navLoginBtn")?.addEventListener("click", () => {
        document.getElementById("profileModal")?.classList.add("open");
      });
      document.getElementById("navGetStartedBtn")?.addEventListener("click", () => this.switchTab("report"));

      document.getElementById("scrollExploreBtn")?.addEventListener("click", () => {
        const nextSec = document.querySelector(".section-container");
        if (nextSec) nextSec.scrollIntoView({ behavior: "smooth" });
      });

      document.getElementById("pillarReport")?.addEventListener("click", () => this.switchTab("report"));
      document.getElementById("pillarTrack")?.addEventListener("click", () => this.switchTab("tracking"));
      document.getElementById("pillarResolve")?.addEventListener("click", () => this.switchTab("authority"));
      document.getElementById("pillarVerify")?.addEventListener("click", () => this.switchTab("tracking"));
      document.getElementById("exploreWardHealthBtn")?.addEventListener("click", () => this.switchTab("community"));

      document.querySelectorAll(".iso-marker, .iso-pin-badge, .floating-badge").forEach(marker => {
        marker.addEventListener("click", () => {
          const markerType = marker.dataset.marker || "pothole";
          this.switchTab("report");
          // Pre-select category in wizard
          const catMap = { pothole: "Road / Pothole", streetlight: "Streetlight", water: "Water / Drainage", garbage: "Garbage / Waste" };
          const targetCategory = catMap[markerType] || "Road / Pothole";
          const card = document.querySelector(`.category-card[data-category="${targetCategory}"]`);
          if (card) card.click();
          showToast(`Selected ${targetCategory} for reporting`, "info");
        });
      });

      // Smooth scroll for hero scroll indicator
      document.getElementById("heroScrollIndicator")?.addEventListener("click", () => {
        const target = document.querySelector(".section-container");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    },

    bindBannerControls() {
      document.getElementById("loadDemoDataBtn")?.addEventListener("click", async () => {
        if (CivicStore.serverConnected) {
          await CivicStore.syncFromServer();
          this.refreshAll();
          showToast("Synchronized complaints from persistent SQLite database!", "success");
        } else {
          await CivicStore.seedDemoData();
          this.refreshAll();
          showToast("Loaded offline demo complaints.", "info");
        }
      });

      document.getElementById("resetDataBtn")?.addEventListener("click", async () => {
        await CivicStore.resetToClean();
        this.refreshAll();
        showToast("Refreshed data directly from persistent SQLite storage.", "info");
      });

      document.getElementById("closeBannerBtn")?.addEventListener("click", () => {
        document.getElementById("demoBanner")?.classList.add("hidden");
      });
    },

    updateCommunityScoreDisplay() {
      const wardSelect = document.getElementById("communityWardSelect");
      if (!wardSelect) return;
      const val = wardSelect.value || "indiranagar";

      const defaultScores = {
        indiranagar: { score: 84, name: "Indiranagar Ward 112", status: "Grade A • High Civic Health" },
        koramangala: { score: 79, name: "Koramangala Ward 151", status: "Grade B+ • Steady Improvement" },
        whitefield: { score: 72, name: "Whitefield Ward 84", status: "Grade B • High Infrastructure Load" },
        hsr: { score: 86, name: "HSR Layout Ward 174", status: "Grade A • High Citizen Engagement" },
        jayanagar: { score: 91, name: "Jayanagar Ward 153", status: "Grade A+ • Model Clean Ward" }
      };

      let data = defaultScores[val] || defaultScores.indiranagar;

      const scorecards = CivicStore.cachedStats?.wardScorecards;
      if (Array.isArray(scorecards) && scorecards.length > 0) {
        const sc = scorecards.find(s => {
          const sName = (s.shortName || "").toLowerCase();
          if (val === "hsr" && sName.includes("hsr")) return true;
          return sName.includes(val);
        });

        if (sc) {
          data = {
            score: sc.healthScore,
            name: sc.wardName,
            status: `Grade ${sc.grade} • ${sc.activeIssues} active, ${sc.resolvedIssues} resolved`
          };
        }
      }

      const scoreEl = document.getElementById("scoreWardPoints");
      const nameEl = document.getElementById("scoreWardName");
      const statusEl = document.getElementById("scoreWardStatus");

      if (scoreEl) scoreEl.textContent = data.score;
      if (nameEl) nameEl.textContent = data.name;
      if (statusEl) statusEl.textContent = data.status;
    },

    bindCommunityScores() {
      const wardSelect = document.getElementById("communityWardSelect");
      wardSelect?.addEventListener("change", () => {
        this.updateCommunityScoreDisplay();
      });
      this.updateCommunityScoreDisplay();
    },

    bindProfileModal() {
      const btn = document.getElementById("profileBtn");
      const modal = document.getElementById("profileModal");
      const closeBtn = document.getElementById("closeProfileModalBtn");

      btn?.addEventListener("click", () => {
        const complaints = CivicStore.getAll();
        document.getElementById("profileReportCount").textContent = complaints.length;
        document.getElementById("profileResolvedCount").textContent = complaints.filter(c => c.status === "Verified").length;
        CivicStore.updateNavProfile();
        modal?.classList.add("open");
      });

      closeBtn?.addEventListener("click", () => modal?.classList.remove("open"));

      // 1. One-click Demo Role Switcher
      document.getElementById("demoCitizenBtn")?.addEventListener("click", async () => {
        try {
          await CivicStore.demoLogin('citizen');
          showToast("Switched session to Demo Citizen (Asha Raman)", "success");
          await this.refreshAll();
        } catch (e) {
          showToast(`Demo login error: ${e.message}`, "error");
        }
      });

      document.getElementById("demoAuthorityBtn")?.addEventListener("click", async () => {
        try {
          await CivicStore.demoLogin('authority');
          showToast("Switched session to BBMP Municipal Authority (Admin)", "success");
          await this.refreshAll();
        } catch (e) {
          showToast(`Demo login error: ${e.message}`, "error");
        }
      });

      // 2. Auth Tabs (Sign In / Register)
      const tabLogin = document.getElementById("tabAuthLogin");
      const tabReg = document.getElementById("tabAuthRegister");
      const formLogin = document.getElementById("authLoginForm");
      const formReg = document.getElementById("authRegisterForm");

      tabLogin?.addEventListener("click", () => {
        tabLogin.classList.add("active");
        tabReg?.classList.remove("active");
        formLogin?.classList.remove("hidden");
        formReg?.classList.add("hidden");
      });

      tabReg?.addEventListener("click", () => {
        tabReg?.classList.add("active");
        tabLogin?.classList.remove("active");
        formReg?.classList.remove("hidden");
        formLogin?.classList.add("hidden");
      });

      // 3. Sign In Form
      formLogin?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail")?.value.trim();
        const password = document.getElementById("loginPassword")?.value;
        try {
          await CivicStore.login(email, password);
          showToast("Signed in successfully to CitySaathi!", "success");
          modal?.classList.remove("open");
          await this.refreshAll();
        } catch (err) {
          showToast(`Sign in error: ${err.message}`, "error");
        }
      });

      // 4. Register Form
      formReg?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regName")?.value.trim();
        const email = document.getElementById("regEmail")?.value.trim();
        const password = document.getElementById("regPassword")?.value;
        const ward = document.getElementById("regWard")?.value.trim();
        try {
          await CivicStore.register({ name, email, password, ward });
          showToast("Account created successfully! Welcome to CitySaathi.", "success");
          modal?.classList.remove("open");
          await this.refreshAll();
        } catch (err) {
          showToast(`Registration error: ${err.message}`, "error");
        }
      });

      // 5. Logout
      document.getElementById("authLogoutBtn")?.addEventListener("click", async () => {
        CivicStore.logout();
        showToast("Signed out. Switched to guest mode.", "info");
        modal?.classList.remove("open");
        await this.refreshAll();
      });
    },

    trackComplaint(id) {
      this.switchTab("tracking");
      TrackingController.selectTicket(id);
    },

    openAuthorityModal(id) {
      AuthorityModalController.open(id);
    },

    async verifyRepair(id, isFixed) {
      try {
        const res = await CivicStore.verifyRepair(id, isFixed);
        if (isFixed) {
          showToast(`✓ Verified as fixed! +${res.karmaEarned || 50} Saathi Karma Points added.`, "success");
        } else {
          showToast("Ticket reopened for municipal rework.", "info");
        }
      } catch (e) {
        showToast(`Verification failed: ${e.message}`, "error");
        return;
      }
      await this.refreshAll();
      TrackingController.selectTicket(id);
    },

    confirmExisting(id) {
      const c = CivicStore.getById(id);
      if (c) {
        CivicStore.update(id, { duplicateCount: (c.duplicateCount || 0) + 1 });
        showToast(`+1 Confirmation recorded for ${id}! Department priority strengthened.`, "success");
        this.refreshAll();
      }
    },

    refreshAll() {
      const complaints = CivicStore.getAll();
      const total = complaints.length;
      const active = complaints.filter(c => c.status !== "Resolved" && c.status !== "Verified").length;
      const resolved = complaints.filter(c => c.status === "Resolved" || c.status === "Verified").length;

      const navCounter = document.getElementById("navComplaintCounter");
      if (navCounter) navCounter.textContent = total;

      document.getElementById("dashTotalCount").textContent = total;
      document.getElementById("dashActiveCount").textContent = active;
      document.getElementById("dashResolvedCount").textContent = resolved;

      // Update Hero live counters
      const heroRep = document.getElementById("heroStatReported");
      if (heroRep) heroRep.textContent = total;
      const heroRes = document.getElementById("heroStatResolved");
      if (heroRes) heroRes.textContent = resolved;
      const heroRate = document.getElementById("heroStatResolutionRate");
      if (heroRate) heroRate.textContent = total > 0 ? `${Math.round((resolved / total) * 100)}%` : "0%";
      const heroWards = document.getElementById("heroStatWards");
      if (heroWards) heroWards.textContent = "6+ Wards";

      const recentFeed = document.getElementById("homeRecentFeed");
      if (recentFeed) {
        if (complaints.length === 0) {
          recentFeed.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">🎉</div>
              <h4>No complaints recorded</h4>
              <p>Your neighbourhood is looking good! Submit an issue if you see anything.</p>
            </div>
          `;
        } else {
          recentFeed.innerHTML = complaints.slice(0, 3).map(c => `
            <div class="complaint-card" onclick="window.CitySaathiApp.trackComplaint('${c.id}')">
              <div class="cc-header">
                <span class="cc-id">${escapeHtml(c.id)}</span>
                <span class="status-badge ${getStatusClass(c.status)}">${escapeHtml(c.status)}</span>
              </div>
              <h4 class="cc-title">${escapeHtml(c.title)}</h4>
              <div class="cc-meta-row">
                <span>📍 ${escapeHtml(c.ward || c.location)}</span>
                <span>${escapeHtml(c.createdAt)}</span>
              </div>
              <div class="cc-progress-bar">
                <div class="cc-progress-fill" style="width: ${getProgressPercentage(c.status)}%;"></div>
              </div>
            </div>
          `).join("");
        }
      }

      CivicMap.renderMarkers();
      TrackingController.renderList();
      AuthorityController.renderAll();
      CivicStore.fetchStats().then(stats => {
        if (stats) {
          const heroRep = document.getElementById("heroStatReported");
          if (heroRep) heroRep.textContent = stats.totalComplaints;
          const heroRes = document.getElementById("heroStatResolved");
          if (heroRes) heroRes.textContent = stats.resolvedComplaints;
          const heroRate = document.getElementById("heroStatResolutionRate");
          if (heroRate) heroRate.textContent = `${stats.resolutionRate}%`;
          const heroWards = document.getElementById("heroStatWards");
          if (heroWards) heroWards.textContent = `${stats.wardScorecards?.length || 6}+ Wards`;

          // Dynamically populate trending issues list
          const trendingEl = document.getElementById("trendingList");
          if (trendingEl && stats.categoryDistribution) {
            const catEntries = Object.entries(stats.categoryDistribution)
              .sort((a, b) => b[1] - a[1]);
            if (catEntries.length > 0) {
              const badges = ["trend-badge-red", "trend-badge-amber", "trend-badge-blue", "trend-badge-green"];
              trendingEl.innerHTML = catEntries.slice(0, 4).map(([cat, count], idx) => `
                <div class="trending-item">
                  <span class="trend-rank">${idx + 1}</span>
                  <div class="trend-info">
                    <strong>${escapeHtml(cat)}</strong>
                    <span>${count} active reports &bull; Bengaluru Wards</span>
                  </div>
                  <span class="${badges[idx] || 'trend-badge-blue'}">${count > 1 ? '+' + count : 'Active'}</span>
                </div>
              `).join("");
            }
          }
        }
        this.updateCommunityScoreDisplay();
        CivicCharts.renderTrendChart();
      }).catch(err => {
        console.warn("[App] Could not refresh live stats in refreshAll:", err);
      });
    }
  };

  /* --------------------------------------------------------------------------
     16. HELPER UTILITIES
     -------------------------------------------------------------------------- */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[ch]));
  }

  function getStatusClass(status) {
    switch (status) {
      case "Submitted": return "status-submitted";
      case "Assigned": return "status-assigned";
      case "In Progress": return "status-inprogress";
      case "Resolved": return "status-resolved";
      case "Verified": return "status-verified";
      default: return "status-submitted";
    }
  }

  function getProgressPercentage(status) {
    switch (status) {
      case "Submitted": return 20;
      case "Assigned": return 40;
      case "In Progress": return 65;
      case "Resolved": return 85;
      case "Verified": return 100;
      default: return 15;
    }
  }

  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✅" : (type === "error" ? "⚠️" : "ℹ️");
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // Robust Initialization: fire immediately if DOM is already ready, else wait
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.CitySaathiApp.init();
    });
  } else {
    window.CitySaathiApp.init();
  }

})();
