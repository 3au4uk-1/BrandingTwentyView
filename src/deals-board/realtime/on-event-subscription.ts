export const ON_EVENT_SUBSCRIPTION = `
  subscription OnEventSubscription($eventStreamId: String!) {
    onEventSubscription(eventStreamId: $eventStreamId) {
      eventStreamId
      objectRecordEventsWithQueryIds {
        queryIds
        objectRecordEvent {
          action
          objectNameSingular
          recordId
          properties {
            updatedFields
            before
            after
            diff
          }
        }
      }
    }
  }
`;
