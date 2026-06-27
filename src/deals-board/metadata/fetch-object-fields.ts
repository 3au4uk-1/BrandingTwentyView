import { filterActiveCrmFields, toFieldDescriptor } from './field-registry';
import { queryMetadataGraphql } from './metadata-graphql-fetch';
import type { BoardObjectName, FieldDescriptor, RawFieldMetadata } from './types';

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

type FetchObjectsFieldsResult = {
  objects?: {
    edges?: Array<{
      node?: {
        nameSingular?: string;
        fieldsList?: RawFieldMetadata[];
      };
    }>;
  };
};

const OBJECTS_PAGE_SIZE = 200;

export const fetchObjectFields = async (
  objectNameSingular: BoardObjectName,
): Promise<RawFieldMetadata[]> => {
  const result = await queryMetadataGraphql<FetchObjectsFieldsResult>(
    FETCH_OBJECTS_FIELDS_QUERY,
    { paging: { first: OBJECTS_PAGE_SIZE } },
  );

  const objectNode = result.objects?.edges?.find(
    (edge) => edge.node?.nameSingular === objectNameSingular,
  )?.node;

  if (!objectNode) {
    throw new Error(`Object "${objectNameSingular}" was not found in metadata`);
  }

  return filterActiveCrmFields(objectNode.fieldsList ?? []);
};

export const fetchFieldDescriptors = async (
  objectNameSingular: BoardObjectName,
): Promise<FieldDescriptor[]> => {
  const rawFields = await fetchObjectFields(objectNameSingular);
  return rawFields.map(toFieldDescriptor);
};
