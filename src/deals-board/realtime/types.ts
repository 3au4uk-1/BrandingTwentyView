export type DatabaseEventAction =
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'DESTROYED'
  | 'RESTORED'
  | 'UPSERTED';

export type ObjectRecordEventProperties = {
  updatedFields?: string[];
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Record<string, unknown>;
};

export type ObjectRecordEvent = {
  action: DatabaseEventAction;
  objectNameSingular: string;
  recordId: string;
  properties: ObjectRecordEventProperties;
};

export type ObjectRecordEventWithQueryIds = {
  queryIds: string[];
  objectRecordEvent: ObjectRecordEvent;
};

export type EventSubscriptionPayload = {
  eventStreamId: string;
  objectRecordEventsWithQueryIds: ObjectRecordEventWithQueryIds[];
};

export type RecordOperationSignature = {
  objectNameSingular: string;
  variables: Record<string, unknown>;
};
