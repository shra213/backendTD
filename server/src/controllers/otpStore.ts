type OTPData = {
  otp: string;
  password: string;
  expiresAt: number;
};

const otpMap: Map<string, OTPData> = new Map();

export function saveOTP(email: string, otp: string, password: string): void {
  otpMap.set(email, {
    otp,
    password,
    expiresAt: Date.now() + 10 * 60 * 1000, // 5 minutes
  });
}
export function updateOtp(email: string, newOtp: string): boolean {
  const existingData = otpMap.get(email);
  console.log(existingData ? existingData : "there is no existiing daaata");
  if (!existingData) return false;

  otpMap.set(email, {
    ...existingData,
    otp: newOtp,
  });

  return true;
}

export function getOTP(email: string): OTPData | undefined {
  return otpMap.get(email);
}

export function removeOTP(email: string): boolean {
  return otpMap.delete(email);
}
