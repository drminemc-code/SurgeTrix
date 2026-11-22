import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBedrockAddServerUri,
  buildFreeDomainDnsRecords,
  buildInstantWorkingDomain,
  formatConnectAddress,
  formatRawUuid,
  isBlockedHostname,
  isPrivateOrReservedIp,
  isReservedDomainHandle,
  isValidDomainHandle,
  isValidPublicIpv6,
  parseDuckDnsUpdateInput,
  parseMinecraftHostPort,
  sanitizeDomainHandle,
  validateMinecraftUsername,
} from './networkDomain';

test('sanitizeDomainHandle and isValidDomainHandle enforce clean URL slugs and block reserved names', () => {
  assert.equal(sanitizeDomainHandle('  My Cool Realm!! '), 'my-cool-realm');
  assert.equal(sanitizeDomainHandle('---test---'), 'test');
  assert.equal(isValidDomainHandle('my-realm-1'), true);
  assert.equal(isValidDomainHandle('a'), false);
  assert.equal(isValidDomainHandle('-bad'), false);
  assert.equal(isValidDomainHandle('bad$slug'), false);
  assert.equal(isReservedDomainHandle('admin'), true);
  assert.equal(isValidDomainHandle('admin'), false);
  assert.equal(isValidDomainHandle('www'), false);
  assert.equal(isValidPublicIpv6('2001:4860:4860::8888'), true);
  assert.equal(isValidPublicIpv6('::1'), false);
  assert.equal(isValidPublicIpv6('fe80::1'), false);
});

test('isPrivateOrReservedIp and isBlockedHostname block SSRF targets while allowing public domains', () => {
  assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('10.0.0.5'), true);
  assert.equal(isPrivateOrReservedIp('172.16.4.1'), true);
  assert.equal(isPrivateOrReservedIp('192.168.1.10'), true);
  assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);
  assert.equal(isPrivateOrReservedIp('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('::1'), true);
  assert.equal(isPrivateOrReservedIp('172.65.197.160'), false);

  assert.equal(isBlockedHostname('localhost'), true);
  assert.equal(isBlockedHostname('metadata.google.internal'), true);
  assert.equal(isBlockedHostname('server.local'), true);
  assert.equal(isBlockedHostname('mc.hypixel.net'), false);
  assert.equal(isBlockedHostname('myrealm.duckdns.org'), false);
});

test('parseMinecraftHostPort parses host, port, and blocks invalid/private addresses', () => {
  const ok1 = parseMinecraftHostPort('mc.hypixel.net');
  assert.equal(ok1.ok, true);
  if (ok1.ok) {
    assert.equal(ok1.host, 'mc.hypixel.net');
    assert.equal(ok1.port, 25565);
  }

  const ok2 = parseMinecraftHostPort('play.example.org:19132', 19132);
  assert.equal(ok2.ok, true);
  if (ok2.ok) {
    assert.equal(ok2.host, 'play.example.org');
    assert.equal(ok2.port, 19132);
  }

  const badPort = parseMinecraftHostPort('mc.hypixel.net:99999');
  assert.equal(badPort.ok, false);

  const ssrf = parseMinecraftHostPort('127.0.0.1:25565');
  assert.equal(ssrf.ok, false);
});

test('buildInstantWorkingDomain, formatConnectAddress, and parseDuckDnsUpdateInput work accurately', () => {
  assert.equal(
    buildInstantWorkingDomain('My Realm', '40.223.14.134'),
    'my-realm.40-223-14-134.sslip.io'
  );
  assert.equal(buildInstantWorkingDomain('bad', '127.0.0.1'), null);
  assert.equal(buildInstantWorkingDomain('bad', 'not-an-ip'), null);

  assert.equal(formatConnectAddress('my-realm.40-223-14-134.sslip.io', 25565, 'Java'), 'my-realm.40-223-14-134.sslip.io');
  assert.equal(formatConnectAddress('my-realm.40-223-14-134.sslip.io', 25577, 'Java'), 'my-realm.40-223-14-134.sslip.io:25577');
  assert.equal(formatConnectAddress('my-realm.40-223-14-134.sslip.io', 19132, 'Bedrock'), 'my-realm.40-223-14-134.sslip.io');

  const duckOk = parseDuckDnsUpdateInput('CrystalRealm.duckdns.org', '12345678-abcd-ef01-2345-6789abcdef01');
  assert.equal(duckOk.ok, true);
  if (duckOk.ok) {
    assert.equal(duckOk.subdomain, 'crystalrealm');
    assert.equal(duckOk.fqdn, 'crystalrealm.duckdns.org');
  }

  const duckBad = parseDuckDnsUpdateInput('a', 'short');
  assert.equal(duckBad.ok, false);
});

test('UUID formatting, username validation, DNS records, and Bedrock URI builders work cleanly', () => {
  assert.equal(validateMinecraftUsername('Notch'), true);
  assert.equal(validateMinecraftUsername('bad name!'), false);
  assert.equal(
    formatRawUuid('069a79f444e94726a5befca90e38aaf5'),
    '069a79f4-44e9-4726-a5be-fca90e38aaf5'
  );

  const dns = buildFreeDomainDnsRecords('play.crystal.org', 'crystal.duckdns.org', 25566);
  assert.equal(dns.srvHost, '_minecraft._tcp.play');
  assert.equal(dns.srvValue, '0 5 25566 crystal.duckdns.org');

  const uri = buildBedrockAddServerUri('CrystalSMP', 'crystal.duckdns.org', 19132);
  assert.ok(uri.startsWith('minecraft://?addExternalServer='));
  assert.ok(uri.includes('crystal.duckdns.org'));
});

