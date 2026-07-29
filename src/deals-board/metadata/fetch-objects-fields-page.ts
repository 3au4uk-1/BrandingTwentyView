import { queryMetadataGraphql } from './metadata-graphql-fetch';

const FETCH_OBJECTS_FIELDS_QUERY = `
  query FetchObjectsFields($paging: CursorPaging) {
    objects(paging: $paging) {
      edges {
        node {
          nameSingular
          fieldsList {
            name
            label
            type
            isActive
            isSystem
            isUIReadOnly
            options
          }
        }
      }
    }
  }
`;

type ObjectsFieldsResult = {
  objects?: {
    edges?: Array<{
      node?: { nameSingular?: string; fieldsList?: unknown[] };
    }>;
  };
};

let cachedPromise: Promise<
  NonNullable<ObjectsFieldsResult['objects']>['edges']
> | null = null;

export const resetObjectsFieldsPageCacheForTests = (): void => {
  cachedPromise = null;
};

export const fetchObjectsFieldsPage = async () => {
  if (!cachedPromise) {
    cachedPromise = queryMetadataGraphql<ObjectsFieldsResult>(
      FETCH_OBJECTS_FIELDS_QUERY,
      { paging: { first: 200 } },
    ).then((result) => result.objects?.edges ?? []);
  }
  return cachedPromise;
};
