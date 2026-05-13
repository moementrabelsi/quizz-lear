import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function hashOtp(otp) {
  return bcrypt.hash(String(otp), SALT_ROUNDS);
}

export async function compareOtp(plain, hash) {
  return bcrypt.compare(String(plain), hash);
}
