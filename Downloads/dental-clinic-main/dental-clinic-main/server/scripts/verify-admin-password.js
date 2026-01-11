const prisma = require("../config/db");
const bcrypt = require("bcryptjs");

async function verifyAdminPassword() {
  try {
    const adminPhone = "0911922363";
    const testPassword = "admin123";

    const adminUser = await prisma.user.findUnique({
      where: { email: adminPhone },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        passwordChanged: true,
      },
    });

    if (!adminUser) {
      console.log("❌ Admin user not found!");
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log("📋 Admin User Details:");
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Phone: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Password Changed: ${adminUser.passwordChanged}`);
    console.log(`   Password Hash (first 20 chars): ${adminUser.password.substring(0, 20)}...`);
    console.log();

    // Test password comparison
    console.log("🔍 Testing password comparison...");
    const isMatch = await bcrypt.compare(testPassword, adminUser.password);
    console.log(`   Testing password: "${testPassword}"`);
    console.log(`   Password matches: ${isMatch}`);
    
    if (!isMatch) {
      console.log("\n❌ Password does NOT match! The stored hash is not for 'admin123'");
      console.log("\n💡 Solution: Run 'node scripts/reset-admin-password.js' to reset password");
    } else {
      console.log("\n✅ Password matches correctly!");
    }

    await prisma.$disconnect();
    process.exit(isMatch ? 0 : 1);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyAdminPassword();

