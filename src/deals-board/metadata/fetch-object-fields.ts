import { MetadataApiClient, MetadataSchema } from 'twenty-client-sdk/metadata';

import { filterActiveCrmFields, toFieldDescriptor } from './field-registry';
import type { BoardObjectName, FieldDescriptor, RawFieldMetadata } from './types';

let metadataClient: MetadataApiClient | null = null;

const getMetadataClient = (): MetadataApiClient => {
  if (!metadataClient) metadataClient = new MetadataApiClient();
  return metadataClient;
};

export const fetchObjectFields = async (
  objectNameSingular: BoardObjectName,
): Promise<RawFieldMetadata[]> => {
  const client = getMetadataClient();
  const result = await client.query({
    objects: {
      __args: {
        filter: { nameSingular: { eq: objectNameSingular } } as MetadataSchema.ObjectFilter,
        paging: { first: 1 },
      },
      edges: {
        node: {
          nameSingular: true,
          fieldsList: {
            name: true,
            label: true,
            type: true,
            isActive: true,
            isSystem: true,
            isUIReadOnly: true,
            options: true,
          },
        },
      },
    },
  });

  const fieldsList = result.objects?.edges?.[0]?.node?.fieldsList ?? [];
  return filterActiveCrmFields(fieldsList as RawFieldMetadata[]);
};

export const fetchFieldDescriptors = async (
  objectNameSingular: BoardObjectName,
): Promise<FieldDescriptor[]> => {
  const rawFields = await fetchObjectFields(objectNameSingular);
  return rawFields.map(toFieldDescriptor);
};
