import { describe, expect, it } from 'vitest';
import { fetchObjectFields } from 'src/deals-board/metadata/fetch-object-fields';

describe('Metadata API', () => {
  it('returns active fields for opportunity', async () => {
    const fields = await fetchObjectFields('opportunity');
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.some((field) => field.name === 'name')).toBe(true);
  });

  it('returns active fields for dealLineItem', async () => {
    const fields = await fetchObjectFields('dealLineItem');
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.some((field) => field.name === 'name')).toBe(true);
  });
});
