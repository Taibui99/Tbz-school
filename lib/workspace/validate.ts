export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;

export function validateName(name: string): string | null {
  const value = name.trim();
  if (!value) return "Vui lòng nhập tên.";
  if (value.length > MAX_NAME_LENGTH) {
    return `Tên quá dài (tối đa ${MAX_NAME_LENGTH} ký tự).`;
  }
  return null;
}

export function validateDescription(description: string): string | null {
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Mô tả quá dài (tối đa ${MAX_DESCRIPTION_LENGTH} ký tự).`;
  }
  return null;
}

export function validateFormFields(input: {
  name: string;
  description?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;

  if (input.description !== undefined) {
    const descriptionError = validateDescription(input.description);
    if (descriptionError) errors.description = descriptionError;
  }

  return errors;
}