import { queryMetadataGraphql } from '../metadata/metadata-graphql-fetch';
import { DEALS_BOARD_SSE_QUERY_IDS, type WatchedObjectName } from './constants';
import type { RecordOperationSignature } from './types';

const ADD_QUERY_TO_EVENT_STREAM_MUTATION = `
  mutation AddQueryToEventStream($input: AddQuerySubscriptionInput!) {
    addQueryToEventStream(input: $input)
  }
`;

const REMOVE_QUERY_FROM_EVENT_STREAM_MUTATION = `
  mutation RemoveQueryFromEventStream($input: RemoveQueryFromEventStreamInput!) {
    removeQueryFromEventStream(input: $input)
  }
`;

const buildOperationSignature = (objectNameSingular: WatchedObjectName): RecordOperationSignature => ({
  objectNameSingular,
  variables: {},
});

export const registerDealsBoardEventStreamQueries = async (
  eventStreamId: string,
): Promise<void> => {
  for (const objectNameSingular of Object.keys(DEALS_BOARD_SSE_QUERY_IDS) as WatchedObjectName[]) {
    const result = await queryMetadataGraphql<{ addQueryToEventStream: boolean }>(
      ADD_QUERY_TO_EVENT_STREAM_MUTATION,
      {
        input: {
          eventStreamId,
          queryId: DEALS_BOARD_SSE_QUERY_IDS[objectNameSingular],
          operationSignature: buildOperationSignature(objectNameSingular),
        },
      },
    );

    if (result.addQueryToEventStream !== true) {
      // Twenty returns false when Redis has no stream for this id yet (or it expired).
      throw new Error(
        `Event stream not ready for ${objectNameSingular} (addQueryToEventStream returned false)`,
      );
    }
  }
};

export const unregisterDealsBoardEventStreamQueries = async (
  eventStreamId: string,
): Promise<void> => {
  await Promise.all(
    (Object.keys(DEALS_BOARD_SSE_QUERY_IDS) as WatchedObjectName[]).map((objectNameSingular) =>
      queryMetadataGraphql<{ removeQueryFromEventStream: boolean }>(
        REMOVE_QUERY_FROM_EVENT_STREAM_MUTATION,
        {
          input: {
            eventStreamId,
            queryId: DEALS_BOARD_SSE_QUERY_IDS[objectNameSingular],
          },
        },
      ),
    ),
  );
};
