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
    const usersPerBranch = [
      {
        branchIndex: 0, // Main Branch
        reception: [
          {
            name: "Reception Staff Main",
            email: "reception.main@clinic.com",
            password: "reception123",
          },
          {
            name: "Reception Manager Main",
            email: "reception2.main@clinic.com",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Smith",
            email: "dentist.main@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Johnson",
            email: "dentist2.main@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Williams",
            email: "dentist3.main@clinic.com",
            password: "dentist123",
          },
        ],
        xray: [
          {
            name: "Dr. XRay Main",
            email: "xray.main@clinic.com",
            password: "xray123",
          },
          {
            name: "Dr. XRay Main 2",
            email: "xray2.main@clinic.com",
            password: "xray123",
          },
        ],
      },
      {
        branchIndex: 1, // Downtown Branch
        reception: [
          {
            name: "Reception Staff Downtown",
            email: "reception.dt@clinic.com",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Brown",
            email: "dentist.dt@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Davis",
            email: "dentist2.dt@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Miller",
            email: "dentist3.dt@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Wilson",
            email: "dentist4.dt@clinic.com",
            password: "dentist123",
          },
        ],
        xray: [
          {
            name: "Dr. XRay Downtown",
            email: "xray.dt@clinic.com",
            password: "xray123",
          },
        ],
      },
      {
        branchIndex: 2, // North Branch
        reception: [
          {
            name: "Reception Staff North",
            email: "reception.nb@clinic.com",
            password: "reception123",
          },
          {
            name: "Reception Assistant North",
            email: "reception2.nb@clinic.com",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Moore",
            email: "dentist.nb@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Taylor",
            email: "dentist2.nb@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Anderson",
            email: "dentist3.nb@clinic.com",
            password: "dentist123",
          },
        ],
        xray: [
          {
            name: "Dr. XRay North",
            email: "xray.nb@clinic.com",
            password: "xray123",
          },
          {
            name: "Dr. XRay North 2",
            email: "xray2.nb@clinic.com",
            password: "xray123",
          },
        ],
      },
      {
        branchIndex: 3, // South Branch
        reception: [
          {
            name: "Reception Staff South",
            email: "reception.sb@clinic.com",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Thomas",
            email: "dentist.sb@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Jackson",
            email: "dentist2.sb@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. White",
            email: "dentist3.sb@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Harris",
            email: "dentist4.sb@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Martin",
            email: "dentist5.sb@clinic.com",
            password: "dentist123",
          },
        ],
        xray: [
          {
            name: "Dr. XRay South",
            email: "xray.sb@clinic.com",
            password: "xray123",
          },
          {
            name: "Dr. XRay South 2",
            email: "xray2.sb@clinic.com",
            password: "xray123",
          },
          {
            name: "Dr. XRay South 3",
            email: "xray3.sb@clinic.com",
            password: "xray123",
          },
        ],
      },
      {
        branchIndex: 4, // East Branch
        reception: [
          {
            name: "Reception Staff East",
            email: "reception.eb@clinic.com",
            password: "reception123",
          },
          {
            name: "Reception Manager East",
            email: "reception2.eb@clinic.com",
            password: "reception123",
          },
        ],
        dentists: [
          {
            name: "Dr. Thompson",
            email: "dentist.eb@clinic.com",
            password: "dentist123",
          },
          {
            name: "Dr. Garcia",
            email: "dentist2.eb@clinic.com",
            password: "dentist123",
          },
        ],
        xray: [
          {
            name: "Dr. XRay East",
            email: "xray.eb@clinic.com",
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
        const user = await prisma.user.upsert({
          where: { email: userData.email },
          update: {},
          create: {
            name: userData.name,
            email: userData.email,
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
        console.log(`      ✅ Reception: ${userData.email}`);
      }

      // Create dentists
      for (const userData of branchUsers.dentists) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await prisma.user.upsert({
          where: { email: userData.email },
          update: {},
          create: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: "DENTIST",
            branchId: branch.id,
          },
        });
        allUsers.push(user);
        credentials.push({ ...userData, role: "DENTIST", branch: branch.name });
        console.log(`      ✅ Dentist: ${userData.email}`);
      }

      // Create X-Ray doctors
      for (const userData of branchUsers.xray) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await prisma.user.upsert({
          where: { email: userData.email },
          update: {},
          create: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: "XRAY",
            branchId: branch.id,
          },
        });
        allUsers.push(user);
        credentials.push({ ...userData, role: "X-Ray", branch: branch.name });
        console.log(`      ✅ X-Ray: ${userData.email}`);
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
      console.log(`\n👑 Admin: ${adminCred.email} / ${adminCred.password}`);
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
        `   👩‍💼 Reception: ${receptionMain.email} / ${receptionMain.password}`
      );
    }
    if (dentistMain) {
      console.log(
        `   👨‍⚕️ Dentist: ${dentistMain.email} / ${dentistMain.password}`
      );
    }
    if (xrayMain) {
      console.log(`   🩻 X-Ray: ${xrayMain.email} / ${xrayMain.password}`);
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
