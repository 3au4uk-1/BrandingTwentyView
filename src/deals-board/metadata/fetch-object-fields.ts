import { filterActiveCrmFields, toFieldDescriptor } from './field-registry';
import { queryMetadataGraphql } from './metadata-graphql-fetch';
import type { BoardObjectName, FieldDescriptor, RawFieldMetadata } from './types';

const FETCH_OBJECT_FIELDS_QUERY = `
  query FetchObjectFields($filter: ObjectFilter, $paging: CursorPaging) {
    objects(filter: $filter, paging: $paging) {
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

type FetchObjectFieldsResult = {
  objects?: {
    edges?: Array<{
      node?: {
        nameSingular?: string;
        fieldsList?: RawFieldMetadata[];
      };
    }>;
  };
};

export const fetchObjectFields = async (
  objectNameSingular: BoardObjectName,
): Promise<RawFieldMetadata[]> => {
  const result = await queryMetadataGraphql<FetchObjectFieldsResult>(
    FETCH_OBJECT_FIELDS_QUERY,
    {
      filter: { nameSingular: { eq: objectNameSingular } },
      paging: { first: 1 },
    },
  );

  const fieldsList = result.objects?.edges?.[0]?.node?.fieldsList ?? [];
  return filterActiveCrmFields(fieldsList);
};

export const fetchFieldDescriptors = async (
  objectNameSingular: BoardObjectName,
): Promise<FieldDescriptor[]> => {
  const rawFields = await fetchObjectFields(objectNameSingular);
  return rawFields.map(toFieldDescriptor);
};
