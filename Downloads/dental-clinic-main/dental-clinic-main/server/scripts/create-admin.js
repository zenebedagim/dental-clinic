const prisma = require("../config/db");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  try {
    console.log("🔍 Setting up admin user...\n");

    // Admin phone number (stored in email field)
    // Normalize: remove spaces, +, and ensure 10 digits (Ethiopian format: 0XXXXXXXXX)
    const adminPhone = "0911922363"; // +251 91 192 2363 normalized

    // Check if admin user already exists (by role or phone)
    const existingAdminByPhone = await prisma.user.findUnique({
      where: { email: adminPhone },
    });

    const existingAdminByRole = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    // Check if we have at least one branch (admin needs a branchId)
    let branches = await prisma.branch.findMany({ take: 1 });
    let branchId;
    let branchName;
    let branchCode;

    if (branches.length === 0) {
      console.log("📁 No branches found. Creating default branch...");
      const defaultBranch = await prisma.branch.create({
        data: {
          name: "Main Branch",
          code: "MAIN",
          address: "Main Office",
          taxNumber: "TAX001",
        },
      });
      branchId = defaultBranch.id;
      branchName = defaultBranch.name;
      branchCode = defaultBranch.code;
      console.log(`   ✅ Created branch: ${branchName} (${branchCode})\n`);
    } else {
      branchId = branches[0].id;
      branchName = branches[0].name;
      branchCode = branches[0].code;
    }

    // If admin exists with different phone, update it
    if (existingAdminByRole && existingAdminByRole.email !== adminPhone) {
      console.log(
        "🔄 Admin user exists with different phone number. Updating..."
      );
      console.log(`   Old phone: ${existingAdminByRole.email}`);
      console.log(`   New phone: ${adminPhone}`);

      const updatedAdmin = await prisma.user.update({
        where: { id: existingAdminByRole.id },
        data: {
          email: adminPhone, // Update phone number
          firstLoginCompleted: false, // Reset to allow first login again with new phone
        },
      });

      console.log("\n✅ Admin user phone number updated successfully!");
      console.log("\n📋 Login Credentials:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Phone: ${adminPhone}`);
      console.log("   Password: (unchanged - existing password)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      await prisma.$disconnect();
      process.exit(0);
    }

    // If admin exists with same phone
    if (existingAdminByPhone) {
      console.log("✅ Admin user already exists!");
      console.log(`   Phone: ${existingAdminByPhone.email}`);
      console.log(`   Role: ${existingAdminByPhone.role}`);
      console.log(`   Name: ${existingAdminByPhone.name}`);
      console.log(
        "\n💡 If you forgot your password, you need to reset it in the database."
      );
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log("❌ Admin user not found. Creating admin user...\n");
    console.log(`   Using branch: ${branchName} (${branchCode})`);

    // Create admin user with default password (passwordChanged = false, firstLoginCompleted = false)
    const adminPassword = await bcrypt.hash("admin123", 10);
    const adminUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: adminPhone, // Store phone in email field
        password: adminPassword,
        role: "ADMIN",
        branchId: branchId,
        passwordChanged: false, // New admin user must change password on first login
        firstLoginCompleted: false, // Allow first login with default credentials
      },
    });

    console.log("\n✅ Admin user created successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Phone: ${adminPhone}`);
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
