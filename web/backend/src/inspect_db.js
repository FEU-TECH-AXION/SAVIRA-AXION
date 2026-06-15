require('dotenv').config();

async function getOpenApiSchema() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/`;
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!res.ok) {
    console.error('Failed to fetch OpenAPI schema:', res.status, res.statusText);
    return;
  }
  const schema = await res.json();
  const projectsDef = schema.definitions && schema.definitions.projects;
  if (projectsDef) {
    console.log('Projects definition properties:', JSON.stringify(projectsDef.properties, null, 2));
  } else {
    console.log('Could not find projects definition in OpenAPI schema');
  }
}

getOpenApiSchema();
