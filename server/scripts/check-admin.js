const prisma = require("../config/db");

async function checkAdmin() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN", email: "0911922363" },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (admin) {
      console.log("\n✅ Admin user found:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   ID: ${admin.id}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Phone: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Password Changed: ${admin.passwordChanged}`);
      console.log(
        `   First Login Completed: ${admin.firstLoginCompleted || false}`
      );
      console.log(
        `   Branch: ${admin.branch?.name || "N/A"} (${
          admin.branch?.code || "N/A"
        })`
      );
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      if (admin.firstLoginCompleted === false) {
        console.log("\n📋 First Login Credentials (Available):");
        console.log("   Phone: 0911922363");
        console.log("   Password: admin123");
        console.log(
          "\n💡 Default credentials will work once. After first login, they expire and password change is required."
        );
      } else {
        console.log("\n📋 First Login Status:");
        console.log("   ✅ First login already completed");
        console.log("   ⚠️  Default credentials (admin123) have expired");
        console.log(
          "\n💡 To reset and allow one-time use again, run: node scripts/reset-admin-password.js"
        );
      }
    } else {
      console.log("\n❌ Admin user not found!");
      console.log("\n💡 Run this command to create admin user:");
      console.log("   node scripts/create-admin.js");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
