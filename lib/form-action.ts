export function asVoidAction<T extends FormData>(
  action: (formData: T) => Promise<unknown>,
): (formData: T) => Promise<void> {
  return (formData) => action(formData).then(() => undefined);
}