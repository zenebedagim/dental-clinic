/**
 * Deployment Script for Render
 * 
 * Handles Prisma migrations with automatic baselining for existing databases.
 * If the database already has tables (from prisma db push), this script will
 * automatically mark the baseline migration as applied.
 */

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function main() {
  try {
    log('\n🚀 Starting deployment process...', 'blue');
    log('='.repeat(60), 'blue');

    // Step 1: Generate Prisma Client
    log('\n📦 Generating Prisma Client...', 'blue');
    try {
      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
      log('✅ Prisma Client generated', 'green');
    } catch (error) {
      log('❌ Failed to generate Prisma Client', 'red');
      process.exit(1);
    }

    // Step 2: Try to deploy migrations
    log('\n📦 Attempting to deploy migrations...', 'blue');
    let migrationSucceeded = false;
    
    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
      migrationSucceeded = true;
      log('\n✅ Migrations deployed successfully!', 'green');
    } catch (error) {
      // Migration deploy failed - likely P3005 error (database schema not empty)
      log('\n⚠️  Migration deploy failed', 'yellow');
      log('This is normal if the database already has tables (from prisma db push)', 'yellow');
    }

    // If migration failed, try to baseline
    if (!migrationSucceeded) {
      log('\nAttempting to baseline the database...', 'yellow');

      try {
        // Mark the baseline migration as applied
        // This command is idempotent - safe to run even if already resolved
        log('\n📝 Marking baseline migration as applied...', 'blue');
        execSync('npx prisma migrate resolve --applied 0_baseline', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        });
        log('✅ Baseline migration marked as applied', 'green');

        // Retry migration deploy
        log('\n🔄 Retrying migration deploy...', 'blue');
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        });
        log('\n✅ Migrations deployed successfully after baselining!', 'green');
        process.exit(0);
      } catch (baselineError) {
        log('\n❌ Failed to baseline database or retry failed', 'red');
        log('Error details:', 'red');
        console.error(baselineError.message || baselineError);
        log('\nPlease check the error messages above for details.', 'yellow');
        process.exit(1);
      }
    } else {
      process.exit(0);
    }
  } catch (error) {
    log('\n❌ Deployment script failed with unexpected error', 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
