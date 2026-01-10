const prisma = require("../config/db");

async function testLogin() {
  try {
    console.log("🔍 Testing login for admin user...\n");

    const testPhone = "0911922363";
    
    // Normalize phone (same as controller)
    let normalizedPhone = testPhone.replace(/\s+/g, "").replace(/^\+251/, "0");
    if (!normalizedPhone.startsWith("0")) {
      normalizedPhone = `0${normalizedPhone}`;
    }

    console.log(`Original phone: ${testPhone}`);
    console.log(`Normalized phone: ${normalizedPhone}\n`);

    // Find user by email (phone is stored in email field)
    const user = await prisma.user.findUnique({
      where: { email: normalizedPhone },
    });

    if (!user) {
      console.log("❌ User NOT FOUND with email:", normalizedPhone);
      console.log("\n🔍 Checking if admin exists with different format...\n");
      
      // Check if admin exists at all
      const adminByRole = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });

      if (adminByRole) {
        console.log("✅ Admin user found with different email:");
        console.log(`   Email (phone): ${adminByRole.email}`);
        console.log(`   Name: ${adminByRole.name}`);
        console.log(`   ID: ${adminByRole.id}`);
        console.log("\n💡 The admin phone number in database doesn't match!");
        console.log(`   Database has: ${adminByRole.email}`);
        console.log(`   Looking for: ${normalizedPhone}`);
      } else {
        console.log("❌ No admin user found at all!");
        console.log("\n💡 Run this command to create admin user:");
        console.log("   node server/scripts/create-admin.js");
      }
    } else {
      console.log("✅ User FOUND!");
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email (phone): ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password Changed: ${user.passwordChanged}`);
      console.log("\n✅ The phone number matches and user exists!");
      console.log("\n💡 If login still fails, the issue might be:");
      console.log("   1. Wrong password (default is 'admin123')");
      console.log("   2. Password hash mismatch in database");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await prisma.disconnect();
  }
}

testLogin();

