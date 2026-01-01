const prisma = require("../config/db");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  try {
    console.log("🔍 Checking if admin user exists...\n");

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@clinic.com" },
    });

    if (existingAdmin) {
      console.log("✅ Admin user already exists!");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log("\n💡 If you forgot your password, you need to reset it in the database.");
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log("❌ Admin user not found. Creating admin user...\n");

    // Check if we have at least one branch (admin needs a branchId)
    const branches = await prisma.branch.findMany({ take: 1 });
    
    if (branches.length === 0) {
      console.error("❌ Error: No branches found in database!");
      console.log("   Please run 'npm run setup' to create branches and admin user.");
      await prisma.$disconnect();
      process.exit(1);
    }

    const branchId = branches[0].id;
    console.log(`   Using branch: ${branches[0].name} (${branches[0].code})`);

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const adminUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@clinic.com",
        password: adminPassword,
        role: "ADMIN",
        branchId: branchId,
      },
    });

    console.log("\n✅ Admin user created successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   Email: admin@clinic.com");
    console.log("   Password: admin123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdmin();

