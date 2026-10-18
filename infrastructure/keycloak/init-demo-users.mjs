const keycloakUrl = (process.env.KEYCLOAK_INTERNAL_URL ?? 'http://keycloak:8080').replace(/\/+$/, '');
const demoUsers = [
  { username: 'admin@demo.com', password: process.env.KEYCLOAK_DEMO_ADMIN_PASSWORD },
  { username: 'landlord@demo.com', password: process.env.KEYCLOAK_DEMO_LANDLORD_PASSWORD },
  { username: 'tenant@demo.com', password: process.env.KEYCLOAK_DEMO_TENANT_PASSWORD },
];
const configuredUsers = demoUsers.filter(user => user.password);

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function waitForRealm() {
  const discoveryUrl = `${keycloakUrl}/realms/rent-management/.well-known/openid-configuration`;
  let lastStatus = 'no response';

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(discoveryUrl, { signal: AbortSignal.timeout(5000) });
      if (response.ok) return;
      lastStatus = `HTTP ${response.status}`;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : 'network error';
    }
    await delay(2000);
  }

  throw new Error(`Keycloak realm did not become ready (${lastStatus}).`);
}

async function getAdminToken() {
  const form = new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: process.env.KEYCLOAK_ADMIN ?? '',
    password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? '',
  });
  const response = await fetch(`${keycloakUrl}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Keycloak admin authentication failed (HTTP ${response.status}); check KEYCLOAK_ADMIN settings.`);
  }

  const tokenResponse = await response.json();
  if (typeof tokenResponse.access_token !== 'string') {
    throw new Error('Keycloak admin token response did not contain an access token.');
  }

  return tokenResponse.access_token;
}

async function setDemoUserPassword(token, user) {
  const usersUrl = new URL(`${keycloakUrl}/admin/realms/rent-management/users`);
  usersUrl.searchParams.set('username', user.username);
  usersUrl.searchParams.set('exact', 'true');

  const lookupResponse = await fetch(usersUrl, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!lookupResponse.ok) {
    throw new Error(`Could not find Keycloak demo account ${user.username} (HTTP ${lookupResponse.status}).`);
  }

  const users = await lookupResponse.json();
  if (!Array.isArray(users) || users.length !== 1 || typeof users[0].id !== 'string') {
    throw new Error(`Expected exactly one Keycloak demo account for ${user.username}.`);
  }

  const passwordResponse = await fetch(
    `${keycloakUrl}/admin/realms/rent-management/users/${encodeURIComponent(users[0].id)}/reset-password`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ type: 'password', value: user.password, temporary: false }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!passwordResponse.ok) {
    throw new Error(`Could not set the password for Keycloak demo account ${user.username} (HTTP ${passwordResponse.status}).`);
  }

  console.log(`Configured the local-demo password for ${user.username}.`);
}

async function main() {
  if (configuredUsers.length === 0) {
    console.log('No Keycloak demo passwords are configured; demo accounts remain without passwords.');
    return;
  }

  await waitForRealm();
  const token = await getAdminToken();
  for (const user of configuredUsers) {
    await setDemoUserPassword(token, user);
  }
}

main().catch(error => {
  console.error(`Keycloak demo-user initialization failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
