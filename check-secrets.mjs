const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (clientId === undefined || clientId === '') {
  console.error('FAIL: GOOGLE_CLIENT_ID is not set');
  process.exit(1);
}
if (clientSecret === undefined || clientSecret === '') {
  console.error('FAIL: GOOGLE_CLIENT_SECRET is not set');
  process.exit(1);
}
if (clientId.includes('.apps.googleusercontent.com') === false) {
  console.error('FAIL: GOOGLE_CLIENT_ID format is invalid. Got:', clientId.substring(0, 20) + '...');
  process.exit(1);
}
if (clientSecret.startsWith('GOCSPX-') === false) {
  console.warn('WARN: GOOGLE_CLIENT_SECRET format may be invalid (expected GOCSPX-...)');
}
console.log('OK: GOOGLE_CLIENT_ID =', clientId.substring(0, 20) + '...');
console.log('OK: GOOGLE_CLIENT_SECRET = GOCSPX-...(set)');
