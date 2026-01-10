const prisma = require("../config/db");
const bcrypt = require("bcryptjs");

async function resetAdminPassword() {
  try {
    console.log("🔍 Resetting admin password...\n");

    const adminPhone = "0911922363";

    // Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: adminPhone },
    });

    if (!adminUser) {
      console.log("❌ Admin user not found!");
      console.log("Run 'npm run create-admin' first to create admin user.");
      await prisma.$disconnect();
      process.exit(1);
    }

    if (adminUser.role !== "ADMIN") {
      console.log("❌ User found but is not ADMIN role!");
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(`📋 Found admin user: ${adminUser.name}`);
    console.log(`   Phone: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}\n`);

    // Hash new password
    const adminPassword = await bcrypt.hash("admin123", 10);

    // Update password and reset passwordChanged flag and firstLoginCompleted flag
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        password: adminPassword,
        passwordChanged: false, // Reset to false so user must change password
        firstLoginCompleted: false, // Reset to allow one-time use again with default credentials
      },
    });

    console.log("✅ Admin password reset successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Phone: ${adminPhone}`);
    console.log("   Password: admin123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(
      "⚠️  Note: Default credentials will work once, then expire. You must change password on first login.\n"
    );

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting admin password:", error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

resetAdminPassword();
