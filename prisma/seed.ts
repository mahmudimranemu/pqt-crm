import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Clear existing data (new models first, then original)
  await prisma.activity.deleteMany();
  await prisma.campaignStep.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.websiteAnalytics.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.loginLog.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.citizenshipMilestone.deleteMany();
  await prisma.citizenshipApplication.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.property.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing data");

  // Hash password for all users
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create Users (6 users - 1 per office with different roles)
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@pqt.com",
        password: hashedPassword,
        firstName: "Ahmed",
        lastName: "Al-Rashid",
        role: "SUPER_ADMIN",
        office: "HEAD_OFFICE",
        phone: "+90 532 123 4567",
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "sarah.dubai@pqt.com",
        password: hashedPassword,
        firstName: "Sarah",
        lastName: "Khan",
        role: "ADMIN",
        office: "UAE",
        phone: "+971 50 123 4567",
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "mehmet.istanbul@pqt.com",
        password: hashedPassword,
        firstName: "Mehmet",
        lastName: "Yilmaz",
        role: "SALES_MANAGER",
        office: "TURKEY",
        phone: "+90 533 234 5678",
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "james.london@pqt.com",
        password: hashedPassword,
        firstName: "James",
        lastName: "Wilson",
        role: "SALES_AGENT",
        office: "UK",
        phone: "+44 7700 900123",
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "wei.kl@pqt.com",
        password: hashedPassword,
        firstName: "Wei",
        lastName: "Chen",
        role: "SALES_AGENT",
        office: "MALAYSIA",
        phone: "+60 12 345 6789",
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "rashid.dhaka@pqt.com",
        password: hashedPassword,
        firstName: "Rashid",
        lastName: "Hossain",
        role: "SALES_AGENT",
        office: "BANGLADESH",
        phone: "+880 1712 345678",
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "viewer@pqt.com",
        password: hashedPassword,
        firstName: "Emily",
        lastName: "Roberts",
        role: "VIEWER",
        office: "HEAD_OFFICE",
        phone: "+90 532 987 6543",
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Create Properties (15 properties across different districts)
  const properties = await Promise.all([
    // Beylikduzu properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-BEY-001",
        name: "Marina Residence",
        developer: "Emaar Turkey",
        district: "BEYLIKDUZU",
        address: "Beylikduzu Sahil Yolu",
        propertyType: "APARTMENT",
        totalUnits: 200,
        availableUnits: 45,
        priceFrom: 350000,
        priceTo: 850000,
        sizeFrom: 85,
        sizeTo: 220,
        bedrooms: "1+1, 2+1, 3+1, 4+1",
        amenities: ["Pool", "Gym", "Sauna", "Parking", "Security", "Sea View"],
        status: "ACTIVE",
        citizenshipEligible: true,
        description:
          "Luxury waterfront residences with stunning sea views and world-class amenities.",
        images: [],
        floorPlans: [],
      },
    }),
    prisma.property.create({
      data: {
        pqtNumber: "PQT-BEY-002",
        name: "Green Valley Homes",
        developer: "Kalyon Group",
        district: "BEYLIKDUZU",
        address: "Beylikduzu Central",
        propertyType: "VILLA",
        totalUnits: 50,
        availableUnits: 12,
        priceFrom: 550000,
        priceTo: 1200000,
        sizeFrom: 180,
        sizeTo: 350,
        bedrooms: "3+1, 4+1, 5+2",
        amenities: ["Private Garden", "Pool", "Garage", "Smart Home"],
        status: "ACTIVE",
        citizenshipEligible: true,
        description:
          "Exclusive villa community with private gardens and premium finishes.",
        images: [],
        floorPlans: [],
      },
    }),
    // Basaksehir properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-BAS-001",
        name: "Central Park Towers",
        developer: "Emlak Konut",
        district: "BASAKSEHIR",
        address: "Near Istanbul Airport",
        propertyType: "APARTMENT",
        totalUnits: 500,
        availableUnits: 120,
        priceFrom: 280000,
        priceTo: 650000,
        sizeFrom: 75,
        sizeTo: 180,
        bedrooms: "1+1, 2+1, 3+1",
        amenities: ["Mall Access", "Metro Station", "Gym", "Kids Club"],
        status: "ACTIVE",
        citizenshipEligible: true,
        description:
          "Modern living near Istanbul's new airport with excellent transport links.",
        images: [],
        floorPlans: [],
      },
    }),
    prisma.property.create({
      data: {
        pqtNumber: "PQT-BAS-002",
        name: "Healthcare City Residence",
        developer: "Agaoglu",
        district: "BASAKSEHIR",
        address: "Basaksehir Medical District",
        propertyType: "APARTMENT",
        totalUnits: 300,
        availableUnits: 85,
        priceFrom: 320000,
        priceTo: 580000,
        sizeFrom: 90,
        sizeTo: 160,
        bedrooms: "2+1, 3+1",
        amenities: ["Hospital Proximity", "Pharmacy", "Gym", "Concierge"],
        status: "ACTIVE",
        citizenshipEligible: true,
        description: "Premium residences in Istanbul's growing healthcare hub.",
        images: [],
        floorPlans: [],
      },
    }),
    // Sisli properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-SIS-001",
        name: "Nisantasi Elite",
        developer: "Sur Yapi",
        district: "SISLI",
        address: "Nisantasi, Sisli",
        propertyType: "PENTHOUSE",
        totalUnits: 30,
        availableUnits: 5,
        priceFrom: 1200000,
        priceTo: 3500000,
        sizeFrom: 200,
        sizeTo: 450,
        bedrooms: "3+1, 4+1, 5+2",
        amenities: [
          "Terrace",
          "Bosphorus View",
          "Private Elevator",
          "Wine Cellar",
        ],
        status: "ACTIVE",
        citizenshipEligible: true,
        description:
          "Ultra-luxury penthouses in Istanbul's most prestigious neighborhood.",
        images: [],
        floorPlans: [],
      },
    }),
    // Kadikoy properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-KAD-001",
        name: "Moda Lifestyle",
        developer: "Kiler GYO",
        district: "KADIKOY",
        address: "Moda, Kadikoy",
        propertyType: "APARTMENT",
        totalUnits: 80,
        availableUnits: 22,
        priceFrom: 450000,
        priceTo: 950000,
        sizeFrom: 95,
        sizeTo: 200,
        bedrooms: "2+1, 3+1, 4+1",
        amenities: ["Sea View", "Rooftop Bar", "Gym", "Valet Parking"],
        status: "ACTIVE",
        citizenshipEligible: true,
        description: "Boutique living in vibrant Moda with stunning sea views.",
        images: [],
        floorPlans: [],
      },
    }),
    // Esenyurt properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-ESE-001",
        name: "Esenyurt Gardens",
        developer: "Sinpas",
        district: "ESENYURT",
        address: "Esenyurt Center",
        propertyType: "APARTMENT",
        totalUnits: 800,
        availableUnits: 250,
        priceFrom: 150000,
        priceTo: 350000,
        sizeFrom: 65,
        sizeTo: 140,
        bedrooms: "1+1, 2+1, 3+1",
        amenities: ["Pool", "Playground", "Gym", "Market"],
        status: "ACTIVE",
        citizenshipEligible: false,
        description: "Affordable family living with comprehensive amenities.",
        images: [],
        floorPlans: [],
      },
    }),
    prisma.property.create({
      data: {
        pqtNumber: "PQT-ESE-002",
        name: "Metro Plaza",
        developer: "Nef",
        district: "ESENYURT",
        address: "Near Metro Station",
        propertyType: "COMMERCIAL",
        totalUnits: 150,
        availableUnits: 60,
        priceFrom: 200000,
        priceTo: 800000,
        sizeFrom: 50,
        sizeTo: 300,
        bedrooms: "N/A",
        amenities: [
          "Metro Access",
          "Parking",
          "24/7 Security",
          "Conference Rooms",
        ],
        status: "ACTIVE",
        citizenshipEligible: true,
        description: "Prime commercial spaces with excellent connectivity.",
        images: [],
        floorPlans: [],
      },
    }),
    // Uskudar properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-USK-001",
        name: "Bosphorus View Residence",
        developer: "Dumankaya",
        district: "USKUDAR",
        address: "Uskudar Waterfront",
        propertyType: "APARTMENT",
        totalUnits: 120,
        availableUnits: 30,
        priceFrom: 600000,
        priceTo: 1500000,
        sizeFrom: 110,
        sizeTo: 280,
        bedrooms: "2+1, 3+1, 4+1",
        amenities: ["Bosphorus View", "Private Beach", "Spa", "Concierge"],
        status: "ACTIVE",
        citizenshipEligible: true,
        description: "Prestigious waterfront living on the Asian side.",
        images: [],
        floorPlans: [],
      },
    }),
    // Bahcesehir properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-BAH-001",
        name: "Lake View Residences",
        developer: "Ihlas",
        district: "BAHCESEHIR",
        address: "Bahcesehir Lake District",
        propertyType: "APARTMENT",
        totalUnits: 400,
        availableUnits: 95,
        priceFrom: 280000,
        priceTo: 520000,
        sizeFrom: 80,
        sizeTo: 165,
        bedrooms: "1+1, 2+1, 3+1",
        amenities: ["Lake View", "Walking Trails", "Schools Nearby", "Pool"],
        status: "ACTIVE",
        citizenshipEligible: true,
        description: "Family-friendly community with serene lake views.",
        images: [],
        floorPlans: [],
      },
    }),
    // Sariyer properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-SAR-001",
        name: "Forest Hills Villas",
        developer: "Mesa",
        district: "SARIYER",
        address: "Belgrade Forest Area",
        propertyType: "VILLA",
        totalUnits: 25,
        availableUnits: 8,
        priceFrom: 1500000,
        priceTo: 4000000,
        sizeFrom: 300,
        sizeTo: 600,
        bedrooms: "4+2, 5+2, 6+2",
        amenities: [
          "Forest View",
          "Private Pool",
          "Home Cinema",
          "Staff Quarters",
        ],
        status: "ACTIVE",
        citizenshipEligible: true,
        description: "Ultra-luxury villas nestled in the Belgrade Forest.",
        images: [],
        floorPlans: [],
      },
    }),
    // Besiktas properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-BES-001",
        name: "Levent Business Tower",
        developer: "Torunlar",
        district: "BESIKTAS",
        address: "Levent Business District",
        propertyType: "COMMERCIAL",
        totalUnits: 200,
        availableUnits: 45,
        priceFrom: 500000,
        priceTo: 2000000,
        sizeFrom: 80,
        sizeTo: 500,
        bedrooms: "N/A",
        amenities: [
          "Metro Access",
          "Helipad",
          "Executive Lounge",
          "Multi-level Parking",
        ],
        status: "ACTIVE",
        citizenshipEligible: true,
        description: "Premium commercial spaces in Istanbul's financial heart.",
        images: [],
        floorPlans: [],
      },
    }),
    // Maltepe properties
    prisma.property.create({
      data: {
        pqtNumber: "PQT-MAL-001",
        name: "Coastal Living",
        developer: "Tekfen",
        district: "MALTEPE",
        address: "Maltepe Coastal Road",
        propertyType: "APARTMENT",
        totalUnits: 180,
        availableUnits: 55,
        priceFrom: 380000,
        priceTo: 720000,
        sizeFrom: 90,
        sizeTo: 175,
        bedrooms: "2+1, 3+1, 4+1",
        amenities: ["Sea View", "Promenade Access", "Gym", "Kids Club"],
        status: "ACTIVE",
        citizenshipEligible: true,
        description: "Modern seaside living on Istanbul's Asian coast.",
        images: [],
        floorPlans: [],
      },
    }),
    // Coming soon property
    prisma.property.create({
      data: {
        pqtNumber: "PQT-FAT-001",
        name: "Historic Istanbul Suites",
        developer: "Nurol GYO",
        district: "FATIH",
        address: "Near Sultanahmet",
        propertyType: "APARTMENT",
        totalUnits: 60,
        availableUnits: 60,
        priceFrom: 500000,
        priceTo: 1200000,
        sizeFrom: 100,
        sizeTo: 220,
        bedrooms: "2+1, 3+1",
        amenities: ["Historic Views", "Concierge", "Rooftop Restaurant", "Spa"],
        completionDate: new Date("2025-06-01"),
        status: "COMING_SOON",
        citizenshipEligible: true,
        description:
          "Exclusive residences overlooking Istanbul's historic peninsula.",
        images: [],
        floorPlans: [],
      },
    }),
    // Sold out property for reference
    prisma.property.create({
      data: {
        pqtNumber: "PQT-BEY-003",
        name: "Sunset Towers",
        developer: "Emaar Turkey",
        district: "BEYLIKDUZU",
        address: "Beylikduzu Marina",
        propertyType: "APARTMENT",
        totalUnits: 150,
        availableUnits: 0,
        priceFrom: 400000,
        priceTo: 900000,
        sizeFrom: 100,
        sizeTo: 200,
        bedrooms: "2+1, 3+1, 4+1",
        amenities: ["Pool", "Gym", "Sea View", "Concierge"],
        status: "SOLD_OUT",
        citizenshipEligible: true,
        description:
          "Sold out luxury development - successful project reference.",
        images: [],
        floorPlans: [],
      },
    }),
  ]);

  console.log(`Created ${properties.length} properties`);

  // Create Clients (30 clients with mixed nationalities)
  const nationalities = [
    { nationality: "Bangladeshi", country: "Bangladesh" },
    { nationality: "Emirati", country: "United Arab Emirates" },
    { nationality: "British", country: "United Kingdom" },
    { nationality: "Malaysian", country: "Malaysia" },
    { nationality: "Pakistani", country: "Pakistan" },
    { nationality: "Iranian", country: "Iran" },
    { nationality: "Iraqi", country: "Iraq" },
    { nationality: "Kuwaiti", country: "Kuwait" },
    { nationality: "Saudi", country: "Saudi Arabia" },
    { nationality: "Indian", country: "India" },
  ];

  const clientNames = [
    { firstName: "Mohammad", lastName: "Rahman" },
    { firstName: "Khalid", lastName: "Al-Maktoum" },
    { firstName: "Robert", lastName: "Smith" },
    { firstName: "Siti", lastName: "Aminah" },
    { firstName: "Ali", lastName: "Reza" },
    { firstName: "Fatima", lastName: "Hassan" },
    { firstName: "Ahmed", lastName: "Qasim" },
    { firstName: "Noor", lastName: "Jahan" },
    { firstName: "Omar", lastName: "Al-Sabah" },
    { firstName: "Priya", lastName: "Sharma" },
    { firstName: "Hassan", lastName: "Chowdhury" },
    { firstName: "Mariam", lastName: "Al-Thani" },
    { firstName: "William", lastName: "Johnson" },
    { firstName: "Nurul", lastName: "Huda" },
    { firstName: "Amir", lastName: "Hosseini" },
    { firstName: "Layla", lastName: "Ibrahim" },
    { firstName: "Yusuf", lastName: "Al-Rashid" },
    { firstName: "Zara", lastName: "Khan" },
    { firstName: "Abdullah", lastName: "Al-Saud" },
    { firstName: "Deepa", lastName: "Patel" },
    { firstName: "Karim", lastName: "Uddin" },
    { firstName: "Sheikha", lastName: "Al-Nahyan" },
    { firstName: "George", lastName: "Williams" },
    { firstName: "Aisha", lastName: "Binti Ahmad" },
    { firstName: "Reza", lastName: "Mohammadi" },
    { firstName: "Sara", lastName: "Al-Obaidi" },
    { firstName: "Mustafa", lastName: "Kemal" },
    { firstName: "Hana", lastName: "Begum" },
    { firstName: "Faisal", lastName: "Al-Mutairi" },
    { firstName: "Ananya", lastName: "Reddy" },
  ];

  const statuses = [
    "NEW_LEAD",
    "CONTACTED",
    "QUALIFIED",
    "VIEWING_SCHEDULED",
    "VIEWED",
    "NEGOTIATING",
    "DEAL_CLOSED",
  ] as const;

  const sources = [
    "WEBSITE",
    "REFERRAL",
    "SOCIAL_MEDIA",
    "GOOGLE_ADS",
    "FACEBOOK_ADS",
    "PARTNER",
  ] as const;

  const districts = [
    "BEYLIKDUZU",
    "BASAKSEHIR",
    "SISLI",
    "KADIKOY",
    "USKUDAR",
    "BAHCESEHIR",
    "SARIYER",
    "BESIKTAS",
  ] as const;

  const clients = await Promise.all(
    clientNames.map(async (name, index) => {
      const nat = nationalities[index % nationalities.length];
      const agent = users[index % users.length];
      const budgetMin = 200000 + Math.floor(Math.random() * 300000);
      const budgetMax = budgetMin + 200000 + Math.floor(Math.random() * 500000);

      return prisma.client.create({
        data: {
          firstName: name.firstName,
          lastName: name.lastName,
          email: `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}@email.com`,
          phone: `+${Math.floor(Math.random() * 900000000000) + 100000000000}`,
          nationality: nat.nationality,
          country: nat.country,
          city: [
            "Dubai",
            "London",
            "Dhaka",
            "Kuala Lumpur",
            "Karachi",
            "Tehran",
            "Baghdad",
            "Kuwait City",
            "Riyadh",
            "Mumbai",
          ][index % 10],
          budgetMin,
          budgetMax,
          preferredDistricts: [
            districts[index % districts.length],
            districts[(index + 1) % districts.length],
          ],
          preferredPropertyType: [
            "APARTMENT",
            "VILLA",
            "PENTHOUSE",
            "COMMERCIAL",
          ][index % 4] as "APARTMENT" | "VILLA" | "PENTHOUSE" | "COMMERCIAL",
          investmentPurpose:
            index % 3 === 0
              ? "CITIZENSHIP"
              : index % 3 === 1
                ? "INVESTMENT"
                : "RESIDENTIAL",
          source: sources[index % sources.length],
          status: statuses[index % statuses.length],
          assignedAgentId: agent.id,
          notes: `Client interested in Turkish properties. Initial contact made via ${sources[index % sources.length].toLowerCase().replace("_", " ")}.`,
        },
      });
    }),
  );

  console.log(`Created ${clients.length} clients`);

  // Create Bookings (40 bookings with mix of statuses)
  const bookingData = [];
  const today = new Date();

  for (let i = 0; i < 40; i++) {
    const client = clients[i % clients.length];
    const property = properties[i % properties.length];
    const agent = users[i % users.length];

    // Create dates ranging from 30 days ago to 30 days in future
    const daysOffset = i - 20; // -20 to +20 days
    const bookingDate = new Date(today);
    bookingDate.setDate(bookingDate.getDate() + daysOffset);
    bookingDate.setHours(9 + (i % 8), (i % 4) * 15, 0, 0);

    const status =
      i < 10
        ? "COMPLETED"
        : i < 15
          ? "CONFIRMED"
          : i < 25
            ? "SCHEDULED"
            : i < 30
              ? "NO_SHOW"
              : i < 35
                ? "CANCELLED"
                : "RESCHEDULED";

    let outcome = null;
    let noSaleReason = null;

    if (status === "COMPLETED") {
      if (i < 3) {
        outcome = "SOLD";
      } else if (i < 6) {
        outcome = "OFFER_MADE";
      } else if (i < 8) {
        outcome = "INTERESTED";
      } else {
        outcome = "NOT_INTERESTED";
        noSaleReason = [
          "Price too high",
          "Location not suitable",
          "Size not adequate",
          "Changed mind about Turkey",
        ][i % 4];
      }
    }

    bookingData.push({
      clientId: client.id,
      propertyId: property.id,
      agentId: agent.id,
      bookingDate,
      bookingType:
        i % 4 === 0
          ? "FOLLOW_UP_MEETING"
          : ("PROPERTY_VIEWING" as "FOLLOW_UP_MEETING" | "PROPERTY_VIEWING"),
      status: status as
        | "COMPLETED"
        | "CONFIRMED"
        | "SCHEDULED"
        | "NO_SHOW"
        | "CANCELLED"
        | "RESCHEDULED",
      outcome: outcome as
        | "SOLD"
        | "OFFER_MADE"
        | "INTERESTED"
        | "NOT_INTERESTED"
        | "PENDING"
        | null,
      noSaleReason,
      notes: `Booking #${i + 1} - ${status.toLowerCase()} viewing at ${property.name}`,
    });
  }

  const bookings = await Promise.all(
    bookingData.map((data) => prisma.booking.create({ data })),
  );

  console.log(`Created ${bookings.length} bookings`);

  // Create Sales (10 sales from sold bookings)
  const soldBookings = bookings.filter((b) => b.outcome === "SOLD");
  const sales = await Promise.all(
    soldBookings.map(async (booking, index) => {
      const property = properties.find((p) => p.id === booking.propertyId)!;
      const salePrice =
        Number(property.priceFrom) +
        Math.floor(
          Math.random() *
            (Number(property.priceTo) - Number(property.priceFrom)),
        );

      return prisma.sale.create({
        data: {
          bookingId: booking.id,
          clientId: booking.clientId,
          propertyId: booking.propertyId,
          agentId: booking.agentId,
          unitNumber: `${["A", "B", "C", "D"][index % 4]}${100 + index}`,
          salePrice,
          currency: "USD",
          depositAmount: salePrice * 0.3,
          depositDate: new Date(),
          commissionAmount: salePrice * 0.03,
          status: index < 5 ? "COMPLETED" : "DEPOSIT_RECEIVED",
          citizenshipEligible: salePrice >= 400000,
          notes: `Sale completed for ${property.name}`,
        },
      });
    }),
  );

  console.log(`Created ${sales.length} sales`);

  // Create Citizenship Applications (3 applications from citizenship-eligible sales)
  const eligibleSales = sales.filter((s) => s.citizenshipEligible).slice(0, 3);
  const citizenshipApplications = await Promise.all(
    eligibleSales.map(async (sale, index) => {
      const stages = [
        "DOCUMENT_COLLECTION",
        "PROPERTY_VALUATION",
        "UNDER_REVIEW",
      ] as const;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - (index + 1));

      return prisma.citizenshipApplication.create({
        data: {
          saleId: sale.id,
          clientId: sale.clientId,
          applicationNumber: `CIT-2024-${String(index + 1).padStart(4, "0")}`,
          stage: stages[index],
          applicantType: "MAIN_APPLICANT",
          startDate,
          estimatedCompletionDate: new Date(
            startDate.getTime() + 180 * 24 * 60 * 60 * 1000,
          ), // +6 months
          notes: `Citizenship application in progress - Stage: ${stages[index]}`,
        },
      });
    }),
  );

  console.log(
    `Created ${citizenshipApplications.length} citizenship applications`,
  );

  // Create Citizenship Milestones
  const milestones = [
    "Collect passport copies",
    "Collect birth certificates",
    "Property valuation ordered",
    "Property valuation received",
    "Application documents prepared",
    "Application submitted to immigration",
    "Biometrics appointment scheduled",
    "Interview preparation",
  ];

  for (const app of citizenshipApplications) {
    const numMilestones = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numMilestones; i++) {
      const dueDate = new Date(app.startDate);
      dueDate.setDate(dueDate.getDate() + (i + 1) * 15);

      await prisma.citizenshipMilestone.create({
        data: {
          applicationId: app.id,
          milestone: milestones[i],
          dueDate,
          completedDate:
            i < 2
              ? new Date(dueDate.getTime() - 2 * 24 * 60 * 60 * 1000)
              : null,
          status: i < 2 ? "COMPLETED" : i === 2 ? "IN_PROGRESS" : "PENDING",
        },
      });
    }
  }

  console.log("Created citizenship milestones");

  // Create Call Logs (50 call logs)
  const callLogs = [];
  for (let i = 0; i < 50; i++) {
    const agent = users[i % users.length];
    const callDate = new Date();
    callDate.setDate(callDate.getDate() - Math.floor(Math.random() * 30));
    callDate.setHours(
      9 + Math.floor(Math.random() * 8),
      Math.floor(Math.random() * 60),
      0,
      0,
    );

    callLogs.push({
      agentId: agent.id,
      clientId: clients[i % clients.length].id,
      callType:
        i % 3 === 0 ? "INBOUND" : ("OUTBOUND" as "INBOUND" | "OUTBOUND"),
      duration: Math.floor(Math.random() * 600) + 30,
      outcome: ["CONNECTED", "VOICEMAIL", "NO_ANSWER", "BUSY"][i % 4] as
        | "CONNECTED"
        | "VOICEMAIL"
        | "NO_ANSWER"
        | "BUSY",
      notes: `Call regarding property inquiry`,
      callDate,
    });
  }

  await Promise.all(callLogs.map((data) => prisma.callLog.create({ data })));
  console.log(`Created ${callLogs.length} call logs`);

  // Create Time Entries
  for (const user of users) {
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      await prisma.timeEntry.create({
        data: {
          agentId: user.id,
          date,
          hoursWorked: 7 + Math.random() * 2,
          description: `Regular working day`,
        },
      });
    }
  }
  console.log("Created time entries");

  // Create Login Logs
  for (const user of users) {
    for (let i = 0; i < 7; i++) {
      const loginTime = new Date();
      loginTime.setDate(loginTime.getDate() - i);
      loginTime.setHours(
        8 + Math.floor(Math.random() * 2),
        Math.floor(Math.random() * 30),
        0,
        0,
      );

      const logoutTime = new Date(loginTime);
      logoutTime.setHours(
        loginTime.getHours() + 8 + Math.floor(Math.random() * 2),
      );

      await prisma.loginLog.create({
        data: {
          userId: user.id,
          loginTime,
          logoutTime,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        },
      });
    }
  }
  console.log("Created login logs");

  // Create Communications
  for (const client of clients.slice(0, 20)) {
    const agent =
      users.find((u) => u.id === client.assignedAgentId) || users[0];

    await prisma.communication.create({
      data: {
        clientId: client.id,
        agentId: agent.id,
        type: ["EMAIL", "PHONE", "WHATSAPP"][Math.floor(Math.random() * 3)] as
          | "EMAIL"
          | "PHONE"
          | "WHATSAPP",
        direction: "OUTBOUND",
        subject: "Property Inquiry Follow-up",
        content: `Followed up with ${client.firstName} regarding their property search. Discussed budget and preferred locations.`,
      },
    });
  }
  console.log("Created communications");

  // Create Website Analytics
  const pages = [
    { url: "/properties/beylikduzu", title: "Beylikduzu Properties" },
    { url: "/properties/basaksehir", title: "Basaksehir Properties" },
    { url: "/citizenship", title: "Turkish Citizenship" },
    { url: "/", title: "Home" },
    { url: "/contact", title: "Contact Us" },
    { url: "/properties", title: "All Properties" },
    { url: "/about", title: "About PQT" },
    { url: "/blog/citizenship-guide", title: "Citizenship Guide" },
  ];

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    for (const page of pages) {
      await prisma.websiteAnalytics.create({
        data: {
          pageUrl: page.url,
          pageTitle: page.title,
          visits: Math.floor(Math.random() * 500) + 50,
          exits: Math.floor(Math.random() * 100) + 10,
          date,
          source: ["google", "direct", "facebook", "instagram", "referral"][
            Math.floor(Math.random() * 5)
          ],
        },
      });
    }
  }
  console.log("Created website analytics");

  // Create Enquiries
  const enquiries = [
    {
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@email.com",
      phone: "+1 (555) 123-4567",
      message: "Looking for 3BR condo in downtown area with parking",
      source: "WEBSITE_FORM" as const,
      status: "ASSIGNED" as const,
      budget: "$500k - $750k",
      country: "United States",
      tags: ["First-time Buyer", "Pre-approved"],
      called: true,
      spoken: true,
      segment: "Buyer",
      leadStatus: "Hot",
      priority: "High",
      nextCallDate: new Date("2026-02-02"),
      snooze: "Active",
      assignedAgentId: users[1].id,
    },
    {
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.garcia@email.com",
      phone: "+1 (555) 234-5678",
      message: "Interested in luxury properties for investment portfolio",
      source: "PARTNER_REFERRAL" as const,
      status: "ASSIGNED" as const,
      budget: "$1M - $1.5M",
      country: "Canada",
      tags: ["Investor", "Cash Buyer"],
      called: true,
      spoken: false,
      segment: "Investor",
      leadStatus: "Warm",
      priority: "High",
      nextCallDate: new Date("2026-02-01"),
      snooze: "Active",
      assignedAgentId: users[2].id,
    },
    {
      firstName: "David",
      lastName: "Williams",
      email: "david.williams@email.com",
      phone: "+44 20 7946 0958",
      message: "Relocating for work. Needs 2 bedroom minimum",
      source: "LIVE_CHAT" as const,
      status: "NEW" as const,
      budget: "$250k - $500k",
      country: "United Kingdom",
      tags: ["Relocating"],
      called: false,
      spoken: false,
      segment: "Buyer",
      leadStatus: "New",
      priority: "Medium",
      nextCallDate: null,
      snooze: "Active",
      assignedAgentId: null,
    },
    {
      firstName: "Lisa",
      lastName: "Chen",
      email: "lisa.chen@email.com",
      phone: "+1 (555) 345-6789",
      message: "Looking for investment properties in prime locations",
      source: "EMAIL" as const,
      status: "ASSIGNED" as const,
      budget: "$750k - $1M",
      country: "United States",
      tags: ["Investor", "Multiple Properties"],
      called: true,
      spoken: true,
      segment: "Investor",
      leadStatus: "Warm",
      priority: "Medium",
      nextCallDate: new Date("2026-02-03"),
      snooze: "Active",
      assignedAgentId: users[1].id,
    },
    {
      firstName: "Robert",
      lastName: "Taylor",
      email: "robert.taylor@email.com",
      phone: "+61 2 9876 5432",
      message: "First home buyer. Needs guidance on mortgage options",
      source: "PHONE_CALL" as const,
      status: "NEW" as const,
      budget: "$300k - $500k",
      country: "Australia",
      tags: ["First-time Buyer"],
      called: false,
      spoken: false,
      segment: "Buyer",
      leadStatus: "Cold",
      priority: "Low",
      nextCallDate: null,
      snooze: "Active",
      assignedAgentId: null,
    },
    {
      firstName: "Amina",
      lastName: "Hassan",
      email: "amina.hassan@email.com",
      phone: "+971 50 987 6543",
      message: "Interested in citizenship by investment program",
      source: "WEBSITE_FORM" as const,
      status: "CONTACTED" as const,
      budget: "$500k - $750k",
      country: "United Arab Emirates",
      tags: ["Investor", "Pre-approved"],
      called: true,
      spoken: true,
      segment: "Investor",
      leadStatus: "Hot",
      priority: "High",
      nextCallDate: new Date("2026-02-04"),
      snooze: "Active",
      assignedAgentId: users[2].id,
    },
    {
      firstName: "James",
      lastName: "Brown",
      email: "james.brown@email.com",
      phone: "+1 (555) 456-7890",
      message: "Looking for vacation property near beach",
      source: "WHATSAPP" as const,
      status: "ASSIGNED" as const,
      budget: "$1M - $1.5M",
      country: "United States",
      tags: ["Cash Buyer", "Multiple Properties"],
      called: true,
      spoken: false,
      segment: "Buyer",
      leadStatus: "Warm",
      priority: "Medium",
      nextCallDate: new Date("2026-02-05"),
      snooze: "Active",
      assignedAgentId: users[3].id,
    },
    {
      firstName: "Sophie",
      lastName: "Martin",
      email: "sophie.martin@email.com",
      phone: "+33 1 2345 6789",
      message: "Relocating from Paris, needs family home",
      source: "PARTNER_REFERRAL" as const,
      status: "NEW" as const,
      budget: "$750k - $1M",
      country: "France",
      tags: ["Relocating", "First-time Buyer"],
      called: false,
      spoken: false,
      segment: "Buyer",
      leadStatus: "New",
      priority: "Medium",
      nextCallDate: null,
      snooze: "Active",
      assignedAgentId: null,
    },
    {
      firstName: "Ahmed",
      lastName: "Al-Farsi",
      email: "ahmed.alfarsi@email.com",
      phone: "+966 50 123 4567",
      message: "Looking for commercial property investment",
      source: "WEBSITE_FORM" as const,
      status: "ASSIGNED" as const,
      budget: "$1.5M+",
      country: "Saudi Arabia",
      tags: ["Investor", "Cash Buyer"],
      called: true,
      spoken: true,
      segment: "Investor",
      leadStatus: "Hot",
      priority: "High",
      nextCallDate: new Date("2026-02-06"),
      snooze: "Active",
      assignedAgentId: users[1].id,
    },
    {
      firstName: "Emma",
      lastName: "Johnson",
      email: "emma.johnson@email.com",
      phone: "+1 (555) 567-8901",
      message: "Interested in new development projects",
      source: "EMAIL" as const,
      status: "CONTACTED" as const,
      budget: "$500k - $750k",
      country: "United States",
      tags: ["Pre-approved"],
      called: true,
      spoken: true,
      segment: "Buyer",
      leadStatus: "Warm",
      priority: "Medium",
      nextCallDate: new Date("2026-02-07"),
      snooze: "Active",
      assignedAgentId: users[3].id,
    },
  ];

  for (const data of enquiries) {
    await prisma.enquiry.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        message: data.message,
        source: data.source,
        status: data.status,
        budget: data.budget,
        country: data.country,
        tags: data.tags,
        called: data.called,
        spoken: data.spoken,
        segment: data.segment,
        leadStatus: data.leadStatus,
        priority: data.priority,
        nextCallDate: data.nextCallDate,
        snooze: data.snooze,
        assignedAgentId: data.assignedAgentId,
      },
    });
  }
  console.log("Created enquiries");

  // ===== NEW CRM DATA =====

  // Create Leads (15 leads across different stages)
  const leadStages = [
    "NEW_ENQUIRY",
    "CONTACTED",
    "QUALIFIED",
    "VIEWING_ARRANGED",
    "VIEWED",
    "OFFER_MADE",
    "NEGOTIATING",
    "WON",
    "LOST",
  ] as const;

  const budgetRanges = [
    "UNDER_100K",
    "FROM_100K_TO_250K",
    "FROM_250K_TO_500K",
    "FROM_500K_TO_1M",
    "OVER_1M",
  ] as const;

  const sourceChannels = [
    "ORGANIC",
    "PAID_SEARCH",
    "SOCIAL_MEDIA",
    "REFERRAL",
    "DIRECT",
    "EMAIL_CAMPAIGN",
    "PARTNER",
    "EVENT",
  ] as const;

  const leads = await Promise.all(
    Array.from({ length: 15 }, (_, i) => {
      const client = clients[i % clients.length];
      const agent = users[i % 5]; // assign to non-viewer agents
      const stage = leadStages[i % leadStages.length];
      const dateOffset = i * 3;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - dateOffset);

      return prisma.lead.create({
        data: {
          leadNumber: `PQT-L-20260201-${String(i + 1).padStart(4, "0")}`,
          title: [
            "3-bed apartment in Kadikoy",
            "Villa with sea view in Beylikduzu",
            "Investment property near airport",
            "Penthouse in Sisli",
            "Commercial unit in Levent",
            "Family home in Bahcesehir",
            "Studio apartment in Esenyurt",
            "Luxury flat in Uskudar",
            "Land plot in Sariyer",
            "Duplex in Maltepe",
            "Citizenship-eligible property",
            "Retirement home in Kadikoy",
            "Student accommodation",
            "Office space in Besiktas",
            "Waterfront villa in Sariyer",
          ][i],
          description: `Lead generated from ${sourceChannels[i % sourceChannels.length].toLowerCase().replace("_", " ")} channel. Client interested in Turkish property market.`,
          stage,
          estimatedValue: 200000 + i * 75000,
          currency: "USD",
          budgetRange: budgetRanges[i % budgetRanges.length],
          source: sources[i % sources.length],
          sourceChannel: sourceChannels[i % sourceChannels.length],
          propertyType: [
            "APARTMENT",
            "VILLA",
            "COMMERCIAL",
            "LAND",
            "PENTHOUSE",
          ][i % 5] as
            | "APARTMENT"
            | "VILLA"
            | "COMMERCIAL"
            | "LAND"
            | "PENTHOUSE",
          preferredLocation: [
            "Kadikoy",
            "Beylikduzu",
            "Basaksehir",
            "Sisli",
            "Levent",
            "Bahcesehir",
            "Esenyurt",
            "Uskudar",
            "Sariyer",
            "Maltepe",
            "Besiktas",
            "Kadikoy",
            "Esenyurt",
            "Besiktas",
            "Sariyer",
          ][i],
          score: Math.floor(Math.random() * 80) + 20,
          clientId: client.id,
          ownerId: agent.id,
          createdAt,
        },
      });
    }),
  );

  console.log(`Created ${leads.length} leads`);

  // Create Deals (10 deals across different stages)
  const dealStages = [
    "RESERVATION",
    "DEPOSIT",
    "CONTRACT",
    "PAYMENT_PLAN",
    "TITLE_DEED",
    "COMPLETED",
    "CANCELLED",
  ] as const;

  const deals = await Promise.all(
    Array.from({ length: 10 }, (_, i) => {
      const client = clients[i % clients.length];
      const agent = users[i % 5];
      const stage = dealStages[i % dealStages.length];
      const dateOffset = i * 5;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - dateOffset);
      const expectedClose = new Date();
      expectedClose.setDate(expectedClose.getDate() + 30 + i * 10);

      return prisma.deal.create({
        data: {
          dealNumber: `PQT-D-20260201-${String(i + 1).padStart(4, "0")}`,
          title: [
            "Marina Residence 2+1 Purchase",
            "Green Valley Villa Sale",
            "Central Park Tower Unit",
            "Nisantasi Elite Penthouse",
            "Moda Lifestyle 3+1",
            "Lake View Residence",
            "Bosphorus View Flat",
            "Coastal Living Apartment",
            "Forest Hills Villa",
            "Levent Office Space",
          ][i],
          description: `Deal for ${properties[i % properties.length].name}. Client: ${client.firstName} ${client.lastName}.`,
          dealValue: 300000 + i * 120000,
          currency: "USD",
          stage,
          result:
            stage === "COMPLETED"
              ? "WON"
              : stage === "CANCELLED"
                ? "CANCELLED"
                : "PENDING",
          probability:
            stage === "COMPLETED"
              ? 100
              : stage === "CANCELLED"
                ? 0
                : 30 + i * 7,
          propertyType: [
            "APARTMENT",
            "VILLA",
            "APARTMENT",
            "PENTHOUSE",
            "APARTMENT",
            "APARTMENT",
            "APARTMENT",
            "APARTMENT",
            "VILLA",
            "COMMERCIAL",
          ][i] as "APARTMENT" | "VILLA" | "PENTHOUSE" | "COMMERCIAL",
          propertyName: properties[i % properties.length].name,
          unitNumber: `${["A", "B", "C", "D"][i % 4]}${200 + i}`,
          expectedCloseDate: expectedClose,
          clientId: client.id,
          ownerId: agent.id,
          createdAt,
        },
      });
    }),
  );

  console.log(`Created ${deals.length} deals`);

  // Create Tasks (20 tasks)
  const taskStatuses = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
  const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

  const taskTitles = [
    "Follow up with client",
    "Schedule property viewing",
    "Prepare contract documents",
    "Send property brochure",
    "Arrange airport pickup",
    "Process deposit payment",
    "Book notary appointment",
    "Submit citizenship application",
    "Client meeting prep",
    "Property valuation review",
    "Update CRM records",
    "Send weekly report",
    "Call back - missed inquiry",
    "Review offer terms",
    "Coordinate with developer",
    "Title deed transfer follow-up",
    "Commission calculation",
    "Post-sale follow-up",
    "Market analysis report",
    "Prepare investment proposal",
  ];

  const tasks = await Promise.all(
    taskTitles.map((title, i) => {
      const assignee = users[i % 5];
      const creator = users[0]; // super admin creates
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (i - 5)); // some overdue, some upcoming
      const status = taskStatuses[i % taskStatuses.length];

      return prisma.task.create({
        data: {
          title,
          description: `Task: ${title}. Assigned to ${assignee.firstName} ${assignee.lastName}.`,
          status,
          priority: taskPriorities[i % taskPriorities.length],
          dueDate,
          completedAt: status === "DONE" ? new Date() : null,
          assigneeId: assignee.id,
          createdById: creator.id,
          leadId: i < 5 ? leads[i].id : null,
          dealId: i >= 5 && i < 15 ? deals[i - 5].id : null,
        },
      });
    }),
  );

  console.log(`Created ${tasks.length} tasks`);

  // Create Payments (12 payments for deals)
  const paymentStatuses = [
    "PENDING",
    "RECEIVED",
    "OVERDUE",
    "REFUNDED",
    "CANCELLED",
  ] as const;
  const paymentMethods = [
    "BANK_TRANSFER",
    "CASH",
    "CREDIT_CARD",
    "CRYPTO",
    "CHECK",
  ] as const;

  const payments = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const deal = deals[i % deals.length];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (i * 15 - 30));
      const status = paymentStatuses[i % paymentStatuses.length];

      return prisma.payment.create({
        data: {
          dealId: deal.id,
          clientId: deal.clientId,
          amount: 50000 + i * 25000,
          currency: "USD",
          dueDate,
          receivedAt: status === "RECEIVED" ? new Date() : null,
          status,
          method:
            status === "RECEIVED"
              ? paymentMethods[i % paymentMethods.length]
              : null,
          notes: [
            "Reservation deposit",
            "First installment",
            "Second installment",
            "Contract signing payment",
            "Progress payment",
            "Final payment",
            "Reservation deposit",
            "First installment",
            "Second installment",
            "Contract signing payment",
            "Progress payment",
            "Final payment",
          ][i],
          reference:
            status === "RECEIVED"
              ? `REC-2026-${String(i + 1).padStart(4, "0")}`
              : null,
        },
      });
    }),
  );

  console.log(`Created ${payments.length} payments`);

  // Create Commissions (8 commissions for agents)
  const commissionStatuses = [
    "PENDING",
    "APPROVED",
    "PAID",
    "CANCELLED",
  ] as const;

  const commissions = await Promise.all(
    Array.from({ length: 8 }, (_, i) => {
      const deal = deals[i % deals.length];
      const agent = users[i % 5];
      const status = commissionStatuses[i % commissionStatuses.length];

      return prisma.commission.create({
        data: {
          dealId: deal.id,
          agentId: agent.id,
          amount: 5000 + i * 3000,
          percentage: 2.5 + (i % 3) * 0.5,
          currency: "USD",
          status,
          paidAt: status === "PAID" ? new Date() : null,
          notes: `Commission for ${deal.title}`,
        },
      });
    }),
  );

  console.log(`Created ${commissions.length} commissions`);

  // Create Teams (3 teams)
  const teams = await Promise.all([
    prisma.team.create({
      data: {
        name: "Turkey Sales Team",
        description: "Core sales team for Turkey operations",
        managerId: users[2].id, // Mehmet - Sales Manager
      },
    }),
    prisma.team.create({
      data: {
        name: "International Sales",
        description: "Handles overseas client acquisition",
        managerId: users[1].id, // Sarah - Admin UAE
      },
    }),
    prisma.team.create({
      data: {
        name: "VIP Client Services",
        description: "Dedicated team for high-value clients",
        managerId: users[0].id, // Ahmed - Super Admin
      },
    }),
  ]);

  // Add team members
  await prisma.teamMember.createMany({
    data: [
      { teamId: teams[0].id, userId: users[2].id },
      { teamId: teams[0].id, userId: users[3].id },
      { teamId: teams[0].id, userId: users[4].id },
      { teamId: teams[1].id, userId: users[1].id },
      { teamId: teams[1].id, userId: users[3].id },
      { teamId: teams[1].id, userId: users[5].id },
      { teamId: teams[2].id, userId: users[0].id },
      { teamId: teams[2].id, userId: users[2].id },
      { teamId: teams[2].id, userId: users[1].id },
    ],
    skipDuplicates: true,
  });

  console.log(`Created ${teams.length} teams with members`);

  // Create Campaigns (4 campaigns)
  const campaignStatuses = [
    "DRAFT",
    "ACTIVE",
    "PAUSED",
    "COMPLETED",
    "CANCELLED",
  ] as const;

  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        name: "Spring 2026 Property Expo",
        description:
          "Multi-channel campaign for upcoming Istanbul property expo",
        status: "ACTIVE",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-04-30"),
        budget: 50000,
        spent: 12500,
        leadsGenerated: 45,
        conversions: 3,
      },
    }),
    prisma.campaign.create({
      data: {
        name: "Citizenship Investment Drive",
        description:
          "Targeted campaign for citizenship-eligible property buyers",
        status: "ACTIVE",
        startDate: new Date("2026-01-15"),
        endDate: new Date("2026-06-30"),
        budget: 75000,
        spent: 28000,
        leadsGenerated: 82,
        conversions: 7,
      },
    }),
    prisma.campaign.create({
      data: {
        name: "Dubai Roadshow Q1",
        description: "Property showcase events in Dubai targeting Gulf buyers",
        status: "COMPLETED",
        startDate: new Date("2025-10-01"),
        endDate: new Date("2025-12-31"),
        budget: 30000,
        spent: 29500,
        leadsGenerated: 120,
        conversions: 12,
      },
    }),
    prisma.campaign.create({
      data: {
        name: "Social Media Summer Push",
        description: "Instagram and Facebook ad campaign for summer season",
        status: "DRAFT",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-31"),
        budget: 25000,
        spent: 0,
        leadsGenerated: 0,
        conversions: 0,
      },
    }),
  ]);

  // Add campaign steps
  for (const campaign of campaigns.slice(0, 2)) {
    await Promise.all([
      prisma.campaignStep.create({
        data: {
          campaignId: campaign.id,
          stepOrder: 1,
          name: "Initial Outreach",
          type: "EMAIL",
          config: { message: "Welcome email with property highlights" },
          delayDays: 0,
        },
      }),
      prisma.campaignStep.create({
        data: {
          campaignId: campaign.id,
          stepOrder: 2,
          name: "Follow-up Call",
          type: "PHONE",
          config: { message: "Personal call to discuss interests" },
          delayDays: 3,
        },
      }),
      prisma.campaignStep.create({
        data: {
          campaignId: campaign.id,
          stepOrder: 3,
          name: "Property Brochure",
          type: "WHATSAPP",
          config: { message: "Send personalized property brochure" },
          delayDays: 7,
        },
      }),
    ]);
  }

  console.log(`Created ${campaigns.length} campaigns with steps`);

  // Create Notifications (20 notifications for different users)
  const notificationTypes = [
    "TASK_ASSIGNED",
    "TASK_DUE",
    "LEAD_ASSIGNED",
    "DEAL_STAGE_CHANGED",
    "PAYMENT_RECEIVED",
    "COMMISSION_APPROVED",
    "SYSTEM_ALERT",
    "MENTION",
  ] as const;

  await Promise.all(
    Array.from({ length: 20 }, (_, i) => {
      const user = users[i % users.length];
      const type = notificationTypes[i % notificationTypes.length];
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - i * 4);

      return prisma.notification.create({
        data: {
          userId: user.id,
          type,
          title: [
            "New task assigned to you",
            "Task due tomorrow",
            "New lead assigned",
            "Deal moved to next stage",
            "Payment received",
            "Commission approved",
            "System maintenance tonight",
            "You were mentioned in a note",
            "New task: Follow up with client",
            "Overdue task reminder",
            "Hot lead from website",
            "Deal closed successfully",
            "Payment overdue alert",
            "Commission paid",
            "New feature available",
            "Team meeting reminder",
            "Task completed by team member",
            "SLA deadline approaching",
            "New lead from Dubai expo",
            "Deal requires attention",
          ][i],
          message: `Notification #${i + 1} for ${user.firstName}. Action may be required.`,
          isRead: i < 8,
          createdAt,
        },
      });
    }),
  );

  console.log("Created 20 notifications");

  // Create Audit Logs (15 logs)
  const auditActions = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "EXPORT",
    "ASSIGN",
    "STAGE_CHANGE",
  ] as const;

  await Promise.all(
    Array.from({ length: 15 }, (_, i) => {
      const user = users[i % users.length];
      const action = auditActions[i % auditActions.length];
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - i * 6);

      return prisma.auditLog.create({
        data: {
          userId: user.id,
          action,
          entityType: [
            "Lead",
            "Deal",
            "Client",
            "Task",
            "Payment",
            "User",
            "Team",
            "Campaign",
          ][i % 8],
          entityId: `sample-entity-${i}`,
          changes: JSON.stringify({
            field: "status",
            oldValue: "previous",
            newValue: "current",
          }),
          ipAddress: `192.168.1.${100 + i}`,
          createdAt,
        },
      });
    }),
  );

  console.log("Created 15 audit logs");

  // Create Activities (25 activities across leads and deals)
  const activityTypes = [
    "CALL",
    "EMAIL",
    "MEETING",
    "NOTE",
    "FOLLOW_UP",
    "SITE_VISIT",
    "STAGE_CHANGE",
    "DOCUMENT_UPLOAD",
    "PAYMENT_RECEIVED",
    "TASK_COMPLETED",
  ] as const;

  await Promise.all(
    Array.from({ length: 25 }, (_, i) => {
      const user = users[i % users.length];
      const type = activityTypes[i % activityTypes.length];
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - i);

      return prisma.activity.create({
        data: {
          type,
          title: [
            "Called client to discuss requirements",
            "Sent property listing email",
            "Client meeting at office",
            "Added note about budget preferences",
            "Scheduled follow-up for next week",
            "Site visit to Marina Residence",
            "Lead moved to Qualified stage",
            "Uploaded passport copy",
            "Deposit payment received",
            "Task: Send brochure completed",
            "Follow-up call about viewing",
            "Email: Investment opportunities",
            "Virtual meeting with overseas client",
            "Note: Client prefers sea view",
            "Follow-up on offer response",
            "Visited Green Valley Homes",
            "Deal advanced to Contract stage",
            "Uploaded contract draft",
            "Second installment received",
            "Task: Notary booking completed",
            "Initial inquiry call",
            "Sent citizenship info pack",
            "Developer meeting",
            "Updated client preferences",
            "Scheduled property viewing",
          ][i],
          description: `Activity by ${user.firstName} ${user.lastName}: ${type.toLowerCase().replace("_", " ")}`,
          leadId: i < 12 ? leads[i % leads.length].id : null,
          dealId: i >= 12 ? deals[(i - 12) % deals.length].id : null,
          userId: user.id,
          createdAt,
        },
      });
    }),
  );

  console.log("Created 25 activities");

  console.log("\n========================================");
  console.log("Seed completed successfully!");
  console.log("========================================");
  console.log("\nTest Accounts:");
  console.log("----------------------------------------");
  console.log("Super Admin: admin@pqt.com / password123");
  console.log("Admin (UAE): sarah.dubai@pqt.com / password123");
  console.log("Manager (Turkey): mehmet.istanbul@pqt.com / password123");
  console.log("Agent (UK): james.london@pqt.com / password123");
  console.log("Agent (Malaysia): wei.kl@pqt.com / password123");
  console.log("Agent (Bangladesh): rashid.dhaka@pqt.com / password123");
  console.log("----------------------------------------\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
