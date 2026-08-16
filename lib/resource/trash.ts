export function shouldDeleteObject(
  resourceRefs: number,
  fileRefs: number,
): boolean {
  return resourceRefs <= 0 && fileRefs <= 0;
}