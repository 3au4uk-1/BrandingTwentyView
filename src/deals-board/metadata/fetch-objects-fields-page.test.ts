import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./metadata-graphql-fetch', () => ({
  queryMetadataGraphql: vi.fn(),
}));

import { queryMetadataGraphql } from './metadata-graphql-fetch';
import {
  fetchObjectsFieldsPage,
  resetObjectsFieldsPageCacheForTests,
} from './fetch-objects-fields-page';

describe('fetchObjectsFieldsPage', () => {
  beforeEach(() => {
    resetObjectsFieldsPageCacheForTests();
    vi.mocked(queryMetadataGraphql).mockReset();
  });

  it('shares one in-flight metadata request across callers', async () => {
    let resolveQuery!: (value: unknown) => void;
    vi.mocked(queryMetadataGraphql).mockReturnValue(
      new Promise((resolve) => {
        resolveQuery = resolve;
      }),
    );

    const a = fetchObjectsFieldsPage();
    const b = fetchObjectsFieldsPage();
    expect(queryMetadataGraphql).toHaveBeenCalledTimes(1);

    resolveQuery({
      objects: {
        edges: [{ node: { nameSingular: 'opportunity', fieldsList: [] } }],
      },
    });

    await expect(a).resolves.toHaveLength(1);
    await expect(b).resolves.toHaveLength(1);
    expect(queryMetadataGraphql).toHaveBeenCalledTimes(1);
  });
});
