require('dotenv').config();

const { randomBytes } = require('node:crypto');
const { unlink, writeFile } = require('node:fs/promises');
const mongoose = require('mongoose');
const User = require('../models/User');

const DEMO_EMAIL = 'demo@syncspace.local';
const PASSWORD_OUTPUT_FILE = process.env.DEMO_PASSWORD_OUTPUT_FILE;

function assertAllowedDatabase(uri) {
  if (!uri) throw new Error('MONGODB_URI is required to rotate the demo password.');

  let hostname;
  try {
    hostname = new URL(uri).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    throw new Error('MONGODB_URI is invalid; refusing to update an unknown database.');
  }

  const localHosts = ['localhost', '127.0.0.1', '::1'];
  if (!localHosts.includes(hostname) && process.env.ALLOW_REMOTE_DEMO_PASSWORD_ROTATION !== 'true') {
    throw new Error(
      'Remote password rotation requires ALLOW_REMOTE_DEMO_PASSWORD_ROTATION=true.',
    );
  }
}

async function rotateDemoPassword() {
  const password = process.env.DEMO_ACCOUNT_PASSWORD || randomBytes(24).toString('base64url');
  if (password.length < 8) {
    throw new Error('DEMO_ACCOUNT_PASSWORD must be at least 8 characters.');
  }
  if (!process.env.DEMO_ACCOUNT_PASSWORD && !PASSWORD_OUTPUT_FILE) {
    throw new Error('Set DEMO_PASSWORD_OUTPUT_FILE to a private file path before rotation.');
  }

  const uri = process.env.MONGODB_URI;
  assertAllowedDatabase(uri);
  if (PASSWORD_OUTPUT_FILE) {
    await writeFile(
      PASSWORD_OUTPUT_FILE,
      `Email: ${DEMO_EMAIL}\nOne-time password: ${password}\n`,
      { encoding: 'utf8', mode: 0o600, flag: 'wx' },
    );
  }
  let rotationCompleted = false;
  try {
    await mongoose.connect(uri);

    const user = await User.findOne({ email: DEMO_EMAIL }).select('+password +refreshTokens');
    if (!user) throw new Error(`Demo user ${DEMO_EMAIL} was not found; no changes were made.`);

    user.password = password;
    user.refreshTokens = [];
    await user.save();
    rotationCompleted = true;
    console.log(`Rotated password for ${DEMO_EMAIL}; existing refresh sessions were revoked.`);
    if (PASSWORD_OUTPUT_FILE) console.log('One-time password saved to the requested private file.');
    else console.log('Recruiter demo password set; it was not printed by the script.');
  } catch (error) {
    if (PASSWORD_OUTPUT_FILE) {
      try {
        await unlink(PASSWORD_OUTPUT_FILE);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Password rotation failed and its temporary credential file could not be removed.',
        );
      }
    }
    throw error;
  } finally {
    if (!rotationCompleted) await mongoose.disconnect();
  }
}

rotateDemoPassword()
  .catch((error) => {
    console.error(`[demo-password] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
