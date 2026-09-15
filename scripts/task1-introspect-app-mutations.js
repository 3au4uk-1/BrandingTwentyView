const token = process.env.TWENTY_TOKEN;
const apiUrl = process.env.TWENTY_API_URL || 'https://twenty.dosugmayak.ru';

if (!token) {
  console.error('TWENTY_TOKEN required');
  process.exit(1);
}

const gql = async (query, variables) => {
  const res = await fetch(`${apiUrl}/graphql`, {
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
};

const main = async () => {
  const introspection = await gql(`{
    __schema {
      mutationType {
        fields { name }
      }
    }
  }`);
  const mutations = introspection.__schema.mutationType.fields
    .map((f) => f.name)
    .filter((n) => /application|variable|registration/i.test(n));
  console.log('application-related mutations:', mutations.join(', '));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
