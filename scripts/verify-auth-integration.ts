async function testAuthIntegration() {
  const BASE_URL = 'http://localhost:3000';
  console.log('\n--- VERIFIKASI KEAMANAN & AKSES ENDPOINT REAL-TIME ---');

  // Test 1: Unauthenticated request to /admin/kopi-senja
  const unauthAdmin = await fetch(`${BASE_URL}/admin/kopi-senja`, { redirect: 'manual' });
  console.log(`1. Unauth /admin/kopi-senja status: ${unauthAdmin.status}`);
  const redirectLocation = unauthAdmin.headers.get('location') || '';
  console.log(`   Redirect URL: ${redirectLocation}`);
  if (unauthAdmin.status !== 307 && unauthAdmin.status !== 308) {
    throw new Error('FAILED: Unauthenticated /admin must redirect to /login');
  }

  // Test 2: Unauthenticated request to /cashier/kopi-senja
  const unauthCashier = await fetch(`${BASE_URL}/cashier/kopi-senja`, { redirect: 'manual' });
  console.log(`2. Unauth /cashier/kopi-senja status: ${unauthCashier.status}`);
  const cashierRedirect = unauthCashier.headers.get('location') || '';
  console.log(`   Redirect URL: ${cashierRedirect}`);
  if (unauthCashier.status !== 307 && unauthCashier.status !== 308) {
    throw new Error('FAILED: Unauthenticated /cashier must redirect to /login');
  }

  // Test 3: Login as Owner with wrong password
  const badLogin = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'kopi-senja', password: 'wrongpassword' }),
  });
  console.log(`3. Bad password login status: ${badLogin.status}`);
  if (badLogin.status !== 401) throw new Error('FAILED: Bad password must return 401');

  // Test 4: Login as Owner with correct credentials
  const goodLogin = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'kopi-senja', password: 'admin123' }),
  });
  const goodLoginData = await goodLogin.json();
  const setCookie = goodLogin.headers.get('set-cookie');
  console.log(`4. Owner login status: ${goodLogin.status}, user: ${goodLoginData.user?.role}`);
  console.log(`   Set-Cookie: ${setCookie?.slice(0, 30)}...`);
  if (!setCookie || !setCookie.includes('tap_session=')) {
    throw new Error('FAILED: Expected tap_session cookie on owner login');
  }

  const cookieVal = setCookie.split(';')[0];

  // Test 5: Access /admin/kopi-senja WITH owner cookie
  const authAdmin = await fetch(`${BASE_URL}/admin/kopi-senja`, {
    headers: { Cookie: cookieVal },
    redirect: 'manual',
  });
  console.log(`5. Auth Owner /admin/kopi-senja status: ${authAdmin.status}`);
  if (authAdmin.status !== 200) {
    throw new Error(`FAILED: Authenticated owner should get 200, got ${authAdmin.status}`);
  }

  // Test 6a: Cashier with BAD pin
  const badCashier = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'cashier', slug: 'kopi-senja', pin: '999999' }),
  });
  console.log(`6a. Cashier BAD PIN status: ${badCashier.status}`);
  if (badCashier.status !== 401) throw new Error('FAILED: Bad PIN must return 401');

  // Test 6b: Cashier with CORRECT pin (8899)
  const cashierLogin = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'cashier', slug: 'kopi-senja', pin: '8899' }),
  });
  const cashierData = await cashierLogin.json();
  const cashierCookie = cashierLogin.headers.get('set-cookie')?.split(';')[0] || '';
  console.log(`6b. Cashier CORRECT PIN status: ${cashierLogin.status}, role: ${cashierData.venue?.role}`);
  if (!cashierCookie) throw new Error('FAILED: Expected tap_session cookie on cashier login');

  // Test 7: Cashier tries to open /admin/kopi-senja (Privilege Escalation attempt)
  const cashierAdmin = await fetch(`${BASE_URL}/admin/kopi-senja`, {
    headers: { Cookie: cashierCookie },
    redirect: 'manual',
  });
  console.log(`7. Cashier attempting /admin/kopi-senja status: ${cashierAdmin.status} (Forbidden/Redirect)`);
  if (cashierAdmin.status !== 307 && cashierAdmin.status !== 308) {
    throw new Error('FAILED: Cashier must NOT be able to open /admin');
  }

  // Test 8: Cashier opens /cashier/kopi-senja
  const authCashier = await fetch(`${BASE_URL}/cashier/kopi-senja`, {
    headers: { Cookie: cashierCookie },
    redirect: 'manual',
  });
  console.log(`8. Auth Cashier /cashier/kopi-senja status: ${authCashier.status}`);
  if (authCashier.status !== 200) {
    throw new Error(`FAILED: Cashier should get 200 on /cashier, got ${authCashier.status}`);
  }

  console.log('\n✔ SEMUA 8 PENGUJIAN INTEGRASI KEAMANAN & OTORISASI BERHASIL 100%!\n');
}

testAuthIntegration().catch((e) => {
  console.error(e);
  process.exit(1);
});
