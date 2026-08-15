export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Vui lòng nhập email.";
  if (!EMAIL_REGEX.test(value)) return "Email không hợp lệ.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Vui lòng nhập mật khẩu.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  }
  return null;
}

export function validateFullName(fullName: string): string | null {
  const value = fullName.trim();
  if (!value) return "Vui lòng nhập họ tên.";
  if (value.length > 100) return "Họ tên quá dài (tối đa 100 ký tự).";
  return null;
}

export function validateCredentials(input: {
  email: string;
  password: string;
  fullName?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;

  if (input.fullName !== undefined) {
    const fullNameError = validateFullName(input.fullName);
    if (fullNameError) errors.fullName = fullNameError;
  }

  return errors;
}