import { OwnerDeviceLock, OwnerOtpChallenge } from '../types';
import { saveDocumentToFirestore, fetchDocumentFromFirestore } from './firebase';
import { dispatchRealSms } from './smsGatewayService';

export const OWNER_PHONE = '0716235185';
export const OWNER_ID_NUMBER = '34233496';

const DEVICE_ID_KEY = 'academias_secure_device_id';
const LOCAL_LOCK_KEY = 'academias_owner_device_lock_v1';
export const OWNER_LOCK_DOC_ID = 'owner_device_lock';

/**
 * Returns a persistent unique UUID for this device / browser instance.
 */
export function getCurrentDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length > 5) {
      return existing;
    }
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    return 'dev-fallback-session';
  }
}

/**
 * Detects device and browser model for transparent security identification.
 */
export function getCurrentDeviceFriendlyName(): string {
  if (typeof navigator === 'undefined') return 'Primary Phone / Device';
  const ua = navigator.userAgent;

  let os = 'Unknown Device';
  if (/iPhone/i.test(ua)) os = 'Apple iPhone';
  else if (/iPad/i.test(ua)) os = 'Apple iPad';
  else if (/Android/i.test(ua)) os = 'Android Mobile Phone';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac Computer';
  else if (/Windows NT/i.test(ua)) os = 'Windows Workstation';
  else if (/Linux/i.test(ua)) os = 'Linux Device';

  let browser = 'Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari Mobile';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return `${os} (${browser})`;
}

/**
 * Generates a cryptographically strong 6-digit numeric OTP code.
 */
export function generate6DigitOtp(): string {
  const array = new Uint32Array(1);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
    const code = 100000 + (array[0] % 900000);
    return code.toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Retrieves the owner device lock record from Firestore (with local cache fallback).
 */
export async function getOwnerDeviceLock(): Promise<OwnerDeviceLock | null> {
  try {
    const remote = await fetchDocumentFromFirestore<OwnerDeviceLock>('settings', OWNER_LOCK_DOC_ID);
    if (remote && remote.activeDeviceId) {
      localStorage.setItem(LOCAL_LOCK_KEY, JSON.stringify(remote));
      return remote;
    }
  } catch (err) {
    console.warn('Could not read owner lock from Firestore server, checking local cache:', err);
  }

  const cached = localStorage.getItem(LOCAL_LOCK_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Persists the owner device lock record to Firestore and local storage.
 */
export async function persistOwnerDeviceLock(lock: OwnerDeviceLock): Promise<void> {
  localStorage.setItem(LOCAL_LOCK_KEY, JSON.stringify(lock));
  try {
    await saveDocumentToFirestore('settings', {
      ...lock,
      id: OWNER_LOCK_DOC_ID,
    });
  } catch (err) {
    console.warn('Firestore sync for owner device lock failed:', err);
  }
}

/**
 * Challenges a secondary or third-party device by generating a 6-digit OTP,
 * saving it to the cloud lock, and dispatching an SMS directly to 0716235185.
 */
export async function initiateOwnerOtpChallenge(
  targetDeviceId: string,
  targetDeviceName: string
): Promise<{ success: boolean; challenge: OwnerOtpChallenge; error?: string }> {
  const otpCode = generate6DigitOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  const challenge: OwnerOtpChallenge = {
    otpCode,
    expiresAt,
    targetDeviceId,
    targetDeviceName,
    requestedAt: new Date().toISOString(),
    attemptsLeft: 5,
  };

  const currentLock = (await getOwnerDeviceLock()) || {
    id: OWNER_LOCK_DOC_ID,
    activeDeviceId: '',
    activeDeviceName: 'Authorized Phone',
    authorizedPhone: OWNER_PHONE,
    authorizedId: OWNER_ID_NUMBER,
    lastActiveAt: new Date().toISOString(),
    registeredAt: new Date().toISOString(),
  };

  currentLock.pendingChallenge = challenge;
  currentLock.lastOtpDispatchedTo = OWNER_PHONE;
  await persistOwnerDeviceLock(currentLock);

  // Dispatch cellular SMS to 0716235185
  const smsBody = `MWIVONA SCHOOL SECURITY: A secondary device (${targetDeviceName}) is requesting access to your Owner Account. Use verification OTP: ${otpCode}. Valid for 5 minutes. Do not share if unauthorized.`;

  const dispatchRes = await dispatchRealSms(OWNER_PHONE, smsBody);

  return {
    success: true,
    challenge,
    error: dispatchRes.success ? undefined : dispatchRes.error,
  };
}

/**
 * Verifies the entered OTP and, if valid, transfers the active phone lock
 * exclusively to the target device.
 */
export async function verifyOwnerOtpAndAuthorizeDevice(
  enteredOtp: string,
  targetDeviceId: string,
  targetDeviceName: string
): Promise<{ success: boolean; error?: string }> {
  const lock = await getOwnerDeviceLock();

  if (!lock || !lock.pendingChallenge) {
    return {
      success: false,
      error: 'No active OTP verification request found. Please request a new code.',
    };
  }

  const challenge = lock.pendingChallenge;

  if (Date.now() > challenge.expiresAt) {
    return {
      success: false,
      error: 'The OTP code has expired (5-minute limit exceeded). Please request a fresh OTP.',
    };
  }

  if (challenge.attemptsLeft <= 0) {
    return {
      success: false,
      error: 'Too many incorrect attempts. For security, please request a new OTP code.',
    };
  }

  const cleanEntered = enteredOtp.trim().replace(/[^0-9]/g, '');
  const cleanStored = challenge.otpCode.trim();

  if (cleanEntered !== cleanStored) {
    challenge.attemptsLeft -= 1;
    await persistOwnerDeviceLock(lock);
    return {
      success: false,
      error: `Invalid verification code. ${challenge.attemptsLeft} attempts remaining. Please check the SMS sent to the Owner's phone.`,
    };
  }

  // OTP verified! Transfer single active phone ownership to targetDeviceId
  lock.activeDeviceId = targetDeviceId;
  lock.activeDeviceName = targetDeviceName || 'Authorized Device (OTP-Verified)';
  lock.lastActiveAt = new Date().toISOString();
  lock.pendingChallenge = null; // Clear challenge

  await persistOwnerDeviceLock(lock);

  return { success: true };
}
