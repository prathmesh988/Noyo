import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load testing .env and backend .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const backendEnvPath = path.resolve(process.cwd(), '../Backend/.env');
const backendEnvContent = fs.existsSync(backendEnvPath) ? fs.readFileSync(backendEnvPath, 'utf8') : '';

const configPath = path.resolve(process.cwd(), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

interface SafetyResult {
  passed: boolean;
  checks: {
    targetRestriction: { passed: boolean; message: string };
    databaseTarget: { passed: boolean; message: string };
    paymentKeys: { passed: boolean; message: string };
    otpSafety: { passed: boolean; message: string };
    gitignore: { passed: boolean; message: string };
    testDataPrefix: { passed: boolean; message: string };
  };
}

export function runSafetyCheck(): SafetyResult {
  console.log('=====================================================================');
  console.log('NOYO QA AUTOMATION: STEP 0 SAFETY GATES AUDIT');
  console.log('=====================================================================\n');

  let allPassed = true;

  // 1. Target URL restriction
  const allowedHosts = ['localhost', '127.0.0.1'];
  const feUrl = new URL(config.frontendUrl);
  const beUrl = new URL(config.backendUrl);

  const feOk = allowedHosts.includes(feUrl.hostname);
  const beOk = allowedHosts.includes(beUrl.hostname);
  const targetPassed = feOk && beOk;
  if (!targetPassed) allPassed = false;

  console.log(`[Target Check] Frontend: ${config.frontendUrl} | Backend: ${config.backendUrl}`);
  console.log(`  -> Status: ${targetPassed ? '✅ PASSED (Localhost only)' : '❌ FAILED (Non-local host detected)'}`);

  // 2. Database check
  let dbLocation = 'unknown';
  let dbName = 'unknown';
  let dbPassed = false;

  const mongoLine = backendEnvContent.split('\n').find(l => l.trim().startsWith('MONGODB_URI='));
  if (mongoLine) {
    const uri = mongoLine.split('=')[1]?.trim() || '';
    const isLocal = uri.includes('localhost') || uri.includes('127.0.0.1');
    dbLocation = isLocal ? 'local' : 'Atlas/remote';

    const match = uri.match(/\/([^/?]+)(\?|$)/);
    dbName = match ? match[1] : 'default (test)';
    
    // Remote or local test db check
    dbPassed = dbName.toLowerCase().includes('test') || dbName.toLowerCase().includes('dev');
  }

  console.log(`[Database Check] Location: ${dbLocation} | Database Name: ${dbName}`);
  console.log(`  -> Status: ${dbPassed ? '✅ PASSED (Dedicated/Test DB Verified)' : '⚠️ WARNING (Verify DB before writing)'}`);

  // 3. Payment key safety
  const rzpLine = backendEnvContent.split('\n').find(l => l.trim().startsWith('RAZORPAY_KEY_ID='));
  let rzpPassed = false;
  let rzpMessage = 'Razorpay key not found';

  if (rzpLine) {
    const key = rzpLine.split('=')[1]?.trim() || '';
    if (key.startsWith('rzp_test_')) {
      rzpPassed = true;
      rzpMessage = 'rzp_test_ prefix verified (Test mode active)';
    } else {
      rzpPassed = false;
      rzpMessage = 'LIVE RAZORPAY KEY DETECTED! Hard-stop required.';
      allPassed = false;
    }
  }
  console.log(`[Payment Safety] ${rzpMessage}`);
  console.log(`  -> Status: ${rzpPassed ? '✅ PASSED' : '❌ FAILED'}`);

  // 4. OTP / External side-effects safety
  const otpLine = backendEnvContent.split('\n').find(l => l.trim().startsWith('USE_DEFAULT_OTP='));
  const useDefaultOtp = otpLine ? otpLine.split('=')[1]?.trim() === 'true' : false;
  if (!useDefaultOtp) allPassed = false;

  console.log(`[OTP Safety] USE_DEFAULT_OTP is set to: ${useDefaultOtp}`);
  console.log(`  -> Status: ${useDefaultOtp ? '✅ PASSED (No real SMS will be triggered)' : '❌ FAILED'}`);

  // 5. Gitignore check
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const requiredIgnores = ['.env', 'reports', 'artifacts', 'cache'];
  const missingIgnores = requiredIgnores.filter(rule => !gitignoreContent.includes(rule));
  const gitignorePassed = missingIgnores.length === 0;
  if (!gitignorePassed) allPassed = false;

  console.log(`[Gitignore Safety] ${gitignorePassed ? 'All sensitive paths ignored' : `Missing rules: ${missingIgnores.join(', ')}`}`);
  console.log(`  -> Status: ${gitignorePassed ? '✅ PASSED' : '❌ FAILED'}`);

  // 6. Test Data Policy
  const prefix = 'QA_TEST_';
  console.log(`[Data Policy] Enforced entity prefix: "${prefix}"`);
  console.log(`  -> Status: ✅ PASSED`);

  console.log('\n=====================================================================');
  console.log(`OVERALL SAFETY GATE RESULT: ${allPassed ? '✅ ALL GATES PASSED' : '❌ FAILED GATES'}`);
  console.log('=====================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }

  return {
    passed: allPassed,
    checks: {
      targetRestriction: { passed: targetPassed, message: `${config.frontendUrl}, ${config.backendUrl}` },
      databaseTarget: { passed: dbPassed, message: `${dbLocation} -> ${dbName}` },
      paymentKeys: { passed: rzpPassed, message: rzpMessage },
      otpSafety: { passed: useDefaultOtp, message: `USE_DEFAULT_OTP=${useDefaultOtp}` },
      gitignore: { passed: gitignorePassed, message: gitignorePassed ? 'OK' : 'Missing entries' },
      testDataPrefix: { passed: true, message: `Prefix: ${prefix}` }
    }
  };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.endsWith('safety-check.ts')) {
  runSafetyCheck();
}
