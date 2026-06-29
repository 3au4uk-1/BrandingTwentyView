import { getMetadataClient } from '../api/metadata-client';
import { DEALS_BOARD_SSE_QUERY_IDS, type WatchedObjectName } from './constants';
import type { RecordOperationSignature } from './types';

const buildOperationSignature = (objectNameSingular: WatchedObjectName): RecordOperationSignature => ({
  objectNameSingular,
  variables: {},
});

export const registerDealsBoardEventStreamQueries = async (
  eventStreamId: string,
): Promise<void> => {
  const client = getMetadataClient();

  for (const objectNameSingular of Object.keys(DEALS_BOARD_SSE_QUERY_IDS) as WatchedObjectName[]) {
    const result = await client.mutation({
      addQueryToEventStream: {
        __args: {
          input: {
            eventStreamId,
            queryId: DEALS_BOARD_SSE_QUERY_IDS[objectNameSingular],
            operationSignature: buildOperationSignature(objectNameSingular),
          },
        },
      },
    });

    if (result.addQueryToEventStream !== true) {
      throw new Error(`Failed to register SSE listener for ${objectNameSingular}`);
    }
  }
};

export const unregisterDealsBoardEventStreamQueries = async (
  eventStreamId: string,
): Promise<void> => {
  const client = getMetadataClient();

  await Promise.all(
    (Object.keys(DEALS_BOARD_SSE_QUERY_IDS) as WatchedObjectName[]).map((objectNameSingular) =>
      client.mutation({
        removeQueryFromEventStream: {
          __args: {
            input: {
              eventStreamId,
              queryId: DEALS_BOARD_SSE_QUERY_IDS[objectNameSingular],
            },
          },
        },
      }),
    ),
  );
};
