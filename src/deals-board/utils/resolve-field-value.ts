export const resolveFieldValue = (row: Record<string, unknown>, field: string): unknown => {
  if (field === 'companyName') {
    return row.companyName;
  }
  return row[field];
};
