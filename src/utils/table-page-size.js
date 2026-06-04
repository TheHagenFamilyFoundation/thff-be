export const TABLE_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];
export const DEFAULT_TABLE_PAGE_SIZE = 10;

export function isValidTablePageSize(value) {
  return TABLE_PAGE_SIZE_OPTIONS.includes(Number(value));
}
