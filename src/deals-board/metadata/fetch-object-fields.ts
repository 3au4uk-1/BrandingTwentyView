import { filterActiveCrmFields, toFieldDescriptor } from './field-registry';
import { fetchObjectsFieldsPage } from './fetch-objects-fields-page';
import type { BoardObjectName, FieldDescriptor, RawFieldMetadata } from './types';

export const fetchObjectFields = async (
  objectNameSingular: BoardObjectName,
): Promise<RawFieldMetadata[]> => {
  const edges = await fetchObjectsFieldsPage();

  const objectNode = edges?.find(
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
