import LoginAttempt from '@/models/LoginAttempt';

// Account lock: username-based only, so spoofing IPs can't bypass it.
// IP lock: loose backstop — skipped entirely when IP is 'unknown' to avoid
// locking out all users on misconfigured proxies.
const IP_MAX_FAILURES = 30;
const ACCOUNT_MAX_FAILURES = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

function getLockoutRemainingMs(attempt) {
  if (!attempt?.lockedUntil) return 0;
  const remaining = attempt.lockedUntil.getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
}

function usernameKey(username) {
  return username.toLowerCase();
}

async function getAttempt(type, key) {
  return LoginAttempt.findOne({ type, key });
}

async function checkKey(type, key, maxFailures) {
  const attempt = await getAttempt(type, key);
  if (!attempt) return { locked: false };

  const remainingMs = getLockoutRemainingMs(attempt);
  if (remainingMs > 0) {
    return { locked: true, remainingMs };
  }

  // Lockout expired — reset for next window
  if (attempt.lockedUntil || attempt.failCount >= maxFailures) {
    attempt.failCount = 0;
    attempt.lockedUntil = null;
    await attempt.save();
  }

  return { locked: false };
}

export async function checkLoginAllowed(ip, username) {
  // Only check IP bucket when IP is identifiable
  if (ip && ip !== 'unknown') {
    const ipCheck = await checkKey('ip', ip, IP_MAX_FAILURES);
    if (ipCheck.locked) return ipCheck;
  }

  const accountCheck = await checkKey('account', usernameKey(username), ACCOUNT_MAX_FAILURES);
  if (accountCheck.locked) return accountCheck;

  return { locked: false };
}

async function recordFailure(type, key, maxFailures) {
  const now = Date.now();
  let attempt = await getAttempt(type, key);

  if (!attempt) {
    attempt = new LoginAttempt({ type, key, failCount: 1 });
  } else {
    const remainingMs = getLockoutRemainingMs(attempt);
    if (remainingMs > 0) return attempt; // Already locked, don't double-count

    if (attempt.lockedUntil && remainingMs === 0) {
      attempt.failCount = 0;
      attempt.lockedUntil = null;
    }

    attempt.failCount += 1;
    if (attempt.failCount >= maxFailures) {
      attempt.lockedUntil = new Date(now + LOCKOUT_MS);
    }
  }

  await attempt.save();
  return attempt;
}

export async function recordFailedLogin(ip, username, userExists) {
  // Only record IP failures for identifiable IPs
  if (ip && ip !== 'unknown') {
    await recordFailure('ip', ip, IP_MAX_FAILURES);
  }

  // Account bucket is always keyed by username only — IP cannot affect it
  if (userExists) {
    await recordFailure('account', usernameKey(username), ACCOUNT_MAX_FAILURES);
  }
}

export async function clearLoginAttempts(ip, username) {
  const orClauses = [{ type: 'account', key: usernameKey(username) }];
  if (ip && ip !== 'unknown') {
    orClauses.push({ type: 'ip', key: ip });
  }
  await LoginAttempt.deleteMany({ $or: orClauses });
}

export function formatLockoutMessage(remainingMs) {
  const minutes = Math.ceil(remainingMs / 60000);
  return `Too many failed login attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export function lockoutRetryAfterSeconds(remainingMs) {
  return Math.max(1, Math.ceil(remainingMs / 1000));
}
