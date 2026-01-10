const prisma = require("../config/db");
const bcrypt = require("bcryptjs");

async function setupInitialData() {
  try {
    console.log("🚀 Setting up initial data...\n");

    // 1. Create 5 branches
    console.log("1️⃣  Creating branches...");
    const branchesData = [
      {
        name: "Main Branch",
        code: "MAIN",
        address: "123 Main Street, City Center",
        taxNumber: "TAX001001",
      },
      {
        name: "Downtown Branch",
        code: "DT001",
        address: "456 Downtown Avenue, Downtown District",
        taxNumber: "TAX002002",
      },
      {
        name: "North Branch",
        code: "NB002",
        address: "789 North Boulevard, North Area",
        taxNumber: "TAX003003",
      },
      {
        name: "South Branch",
        code: "SB003",
        address: "321 South Road, South District",
        taxNumber: "TAX004004",
      },
      {
        name: "East Branch",
        code: "EB004",
        address: "654 East Street, East Side",
        taxNumber: "TAX005005",
      },
    ];

    const branches = [];
    for (const branchData of branchesData) {
      const branch = await prisma.branch.upsert({
        where: { code: branchData.code },
        update: {},
        create: branchData,
      });
      branches.push(branch);
      console.log(`   ✅ ${branch.name} (${branch.code})`);
    }
    console.log("");

    // 2. Create users for each branch with multiple doctors
    console.log("2️⃣  Creating users for each branch...\n");

    const allUsers = [];
    const credentials = [];

    // Define users per branch (multiple dentists, X-Ray doctors, and reception staff)
    // Using phone numbers instead of email
    const usersPerBranch = [
      {
        branchIndex: 0, // Main Branch
        reception: [
          {
            name: "Reception Staff Main",
            phone: "0924308310",
            password: "reception123",
          },
          {
            name: "Reception Manager Main",
            phone: "0924308311",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Smith",
            phone: "0924308320",
            password: "dentist123",
            specialization: "General Dentistry",
          },
          {
            name: "Dr. Johnson",
            phone: "0924308321",
            password: "dentist123",
            specialization: "Orthodontics",
          },
          {
            name: "Dr. Williams",
            phone: "0924308322",
            password: "dentist123",
            specialization: "Oral Surgery",
          },
        ],
        xray: [
          {
            name: "Dr. XRay Main",
            phone: "0924308330",
            password: "xray123",
          },
          {
            name: "Dr. XRay Main 2",
            phone: "0924308331",
            password: "xray123",
          },
        ],
      },
      {
        branchIndex: 1, // Downtown Branch
        reception: [
          {
            name: "Reception Staff Downtown",
            phone: "0924308340",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Brown",
            phone: "0924308350",
            password: "dentist123",
            specialization: "General Dentistry",
          },
          {
            name: "Dr. Davis",
            phone: "0924308351",
            password: "dentist123",
            specialization: "Periodontics",
          },
          {
            name: "Dr. Miller",
            phone: "0924308352",
            password: "dentist123",
            specialization: "Endodontics",
          },
          {
            name: "Dr. Wilson",
            phone: "0924308353",
            password: "dentist123",
            specialization: "Prosthodontics",
          },
        ],
        xray: [
          {
            name: "Dr. XRay Downtown",
            phone: "0924308360",
            password: "xray123",
          },
        ],
      },
      {
        branchIndex: 2, // North Branch
        reception: [
          {
            name: "Reception Staff North",
            phone: "0924308370",
            password: "reception123",
          },
          {
            name: "Reception Assistant North",
            phone: "0924308371",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Moore",
            phone: "0924308380",
            password: "dentist123",
            specialization: "General Dentistry",
          },
          {
            name: "Dr. Taylor",
            phone: "0924308381",
            password: "dentist123",
            specialization: "Pediatric Dentistry",
          },
          {
            name: "Dr. Anderson",
            phone: "0924308382",
            password: "dentist123",
            specialization: "Oral Surgery",
          },
        ],
        xray: [
          {
            name: "Dr. XRay North",
            phone: "0924308390",
            password: "xray123",
          },
          {
            name: "Dr. XRay North 2",
            phone: "0924308391",
            password: "xray123",
          },
        ],
      },
      {
        branchIndex: 3, // South Branch
        reception: [
          {
            name: "Reception Staff South",
            phone: "0924308400",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Thomas",
            phone: "0924308410",
            password: "dentist123",
            specialization: "General Dentistry",
          },
          {
            name: "Dr. Jackson",
            phone: "0924308411",
            password: "dentist123",
            specialization: "Orthodontics",
          },
          {
            name: "Dr. White",
            phone: "0924308412",
            password: "dentist123",
            specialization: "Periodontics",
          },
          {
            name: "Dr. Harris",
            phone: "0924308413",
            password: "dentist123",
            specialization: "Endodontics",
          },
          {
            name: "Dr. Martin",
            phone: "0924308414",
            password: "dentist123",
            specialization: "Prosthodontics",
          },
        ],
        xray: [
          {
            name: "Dr. XRay South",
            phone: "0924308420",
            password: "xray123",
          },
          {
            name: "Dr. XRay South 2",
            phone: "0924308421",
            password: "xray123",
          },
          {
            name: "Dr. XRay South 3",
            phone: "0924308422",
            password: "xray123",
          },
        ],
      },
      {
        branchIndex: 4, // East Branch
        reception: [
          {
            name: "Reception Staff East",
            phone: "0924308430",
            password: "reception123",
          },
          {
            name: "Reception Manager East",
            phone: "0924308431",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Thompson",
            phone: "0924308440",
            password: "dentist123",
            specialization: "General Dentistry",
          },
          {
            name: "Dr. Garcia",
            phone: "0924308441",
            password: "dentist123",
            specialization: "Orthodontics",
          },
        ],
        xray: [
          {
            name: "Dr. XRay East",
            phone: "0924308450",
            password: "xray123",
          },
        ],
      },
    ];

    // Create users for each branch
    for (const branchUsers of usersPerBranch) {
      const branch = branches[branchUsers.branchIndex];
      console.log(`   📍 ${branch.name}:`);

      // Create reception staff
      for (const userData of branchUsers.reception) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        // Store phone in email field (for backward compatibility)
        const phoneValue = userData.phone.replace(/\s+/g, "");
        const user = await prisma.user.upsert({
          where: { email: phoneValue },
          update: {},
          create: {
            name: userData.name,
            email: phoneValue, // Store phone in email field
            password: hashedPassword,
            role: "RECEPTION",
            branchId: branch.id,
          },
        });
        allUsers.push(user);
        credentials.push({
          ...userData,
          role: "RECEPTION",
          branch: branch.name,
        });
        console.log(`      ✅ Reception: ${userData.phone}`);
      }

      // Create dentists
      for (const userData of branchUsers.dentists) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        // Store phone in email field (for backward compatibility)
        const phoneValue = userData.phone.replace(/\s+/g, "");
        const user = await prisma.user.upsert({
          where: { email: phoneValue },
          update: {},
          create: {
            name: userData.name,
            email: phoneValue, // Store phone in email field
            password: hashedPassword,
            role: "DENTIST",
            branchId: branch.id,
            specialization: userData.specialization || null,
          },
        });
        allUsers.push(user);
        credentials.push({ ...userData, role: "DENTIST", branch: branch.name });
        console.log(`      ✅ Dentist: ${userData.phone}`);
      }

      // Create X-Ray doctors
      for (const userData of branchUsers.xray) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        // Store phone in email field (for backward compatibility)
        const phoneValue = userData.phone.replace(/\s+/g, "");
        const user = await prisma.user.upsert({
          where: { email: phoneValue },
          update: {},
          create: {
            name: userData.name,
            email: phoneValue, // Store phone in email field
            password: hashedPassword,
            role: "XRAY",
            branchId: branch.id,
          },
        });
        allUsers.push(user);
        credentials.push({ ...userData, role: "X-Ray", branch: branch.name });
        console.log(`      ✅ X-Ray: ${userData.phone}`);
      }
      console.log("");
    }

    console.log("\n🎉 Setup complete! Created:");
    console.log(`   • ${branches.length} branches`);
    console.log(`   • ${allUsers.length} users total (including admin)`);
    console.log(
      "\n📋 Sample Login Credentials:"
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Show admin credentials
    const adminCred = credentials.find((c) => c.role === "ADMIN");
    if (adminCred) {
      console.log(`\n👑 Admin: ${adminCred.phone || adminCred.email} / ${adminCred.password}`);
    }

    // Show sample credentials from first branch
    const mainBranchUsers = credentials.filter(
      (c) => c.branch === "Main Branch"
    );
    console.log("\n📍 Main Branch:");
    const receptionMain = mainBranchUsers.find((c) => c.role === "RECEPTION");
    const dentistMain = mainBranchUsers.find((c) => c.role === "DENTIST");
    const xrayMain = mainBranchUsers.find((c) => c.role === "X-Ray");

    if (receptionMain) {
      console.log(
        `   👩‍💼 Reception: ${receptionMain.phone || receptionMain.email} / ${receptionMain.password}`
      );
    }
    if (dentistMain) {
      console.log(
        `   👨‍⚕️ Dentist: ${dentistMain.phone || dentistMain.email} / ${dentistMain.password}`
      );
    }
    if (xrayMain) {
      console.log(`   🩻 X-Ray: ${xrayMain.phone || xrayMain.email} / ${xrayMain.password}`);
    }

    console.log(
      "\n💡 Tip: Each branch has multiple doctors. Check database for all users."
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up initial data:", error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

setupInitialData();
