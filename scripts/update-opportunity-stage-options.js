/**
 * Patch local opportunity.stage SELECT options to match OPPORTUNITY_STAGES.
 * Standard Twenty field is not owned by the app manifest — must update via metadata API.
 */
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const { OPPORTUNITY_STAGES } = (() => {
  // Keep in sync with src/constants/stages.ts
  return {
    OPPORTUNITY_STAGES: [
      { value: 'NOVYY', label: 'Новый', color: 'gray' },
      { value: 'V_RABOTE', label: 'В работе', color: 'orange' },
      { value: 'GOTOVO', label: 'Готово', color: 'green' },
      { value: 'OTCHET_STAS', label: 'Отчёт Стас', color: 'turquoise' },
      { value: 'DUBL', label: 'ДУБЛЬ', color: 'yellow' },
      { value: 'OTMENA', label: 'Отмена', color: 'red' },
    ],
  };
})();

const cfg = JSON.parse(
  fs.readFileSync(path.join(process.env.USERPROFILE, '.twenty', 'config.json'), 'utf8'),
);
const token =
  cfg.remotes?.localhost?.appAccessToken ||
  cfg.remotes?.localhost?.twentyCLIAccessToken;
if (!token) {
  console.error('No localhost token in ~/.twenty/config.json');
  process.exit(1);
}

const METADATA = 'http://localhost:2020/metadata';

async function meta(query, variables = {}) {
  const res = await fetch(METADATA, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

(async () => {
  const objects = await meta(`{
    objects(paging: { first: 200 }) {
      edges { node { id nameSingular } }
    }
  }`);
  const opportunity = objects.objects.edges
    .map((e) => e.node)
    .find((o) => o.nameSingular === 'opportunity');
  if (!opportunity) throw new Error('opportunity object not found');

  const fields = await meta(
    `query($objectMetadataId: UUID!) {
      fields(
        paging: { first: 200 }
        filter: { objectMetadataId: { eq: $objectMetadataId } }
      ) {
        edges { node { id name label type options defaultValue } }
      }
    }`,
    { objectMetadataId: opportunity.id },
  );
  const stageField = fields.fields.edges
    .map((e) => e.node)
    .find((f) => f.name === 'stage');
  if (!stageField) throw new Error('opportunity.stage field not found');

  console.log('before', (stageField.options || []).map((o) => o.value));

  const options = OPPORTUNITY_STAGES.map((stage, position) => ({
    id: randomUUID(),
    value: stage.value,
    label: stage.label,
    position,
    color: stage.color,
  }));

  const updated = await meta(
    `mutation($input: UpdateOneFieldMetadataInput!) {
      updateOneField(input: $input) {
        id
        name
        options
        defaultValue
      }
    }`,
    {
      input: {
        id: stageField.id,
        update: {
          options,
          defaultValue: "'NOVYY'",
        },
      },
    },
  );

  console.log(
    'after',
    (updated.updateOneField.options || []).map((o) => o.value),
  );
  console.log('DONE');
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
