import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encryptString, decryptString, encryptJson, decryptJson, ipv4InCidr, sha256 } from '../server/crypto.ts';
import { detectValueAnomalies, evaluateCondition, clusterLogs, zScore } from '../server/anomaly.ts';
import { normalizeIntegrationConfig } from '../server/collectors.ts';
import { totpCode, verifyTotp, generateTotpSecret } from '../server/totp.ts';

test('AES-256-GCM round trip', () => {
  const secret = 'unit-test-encryption-key-32ch';
  const cipher = encryptString('sensitive-token', secret);
  assert.notEqual(cipher, 'sensitive-token');
  assert.equal(decryptString(cipher, secret), 'sensitive-token');
});

test('JSON encrypt helper', () => {
  const payload = encryptJson({ token: 'abc' });
  assert.deepEqual(decryptJson(payload, {}), { token: 'abc' });
});

test('IPv4 CIDR allowlist', () => {
  assert.equal(ipv4InCidr('10.0.0.5', '10.0.0.0/8'), true);
  assert.equal(ipv4InCidr('11.0.0.5', '10.0.0.0/8'), false);
  assert.equal(ipv4InCidr('192.168.1.20', '192.168.1.20/32'), true);
});

test('sha256 is stable', () => {
  assert.equal(sha256('abc'), sha256('abc'));
  assert.notEqual(sha256('abc'), sha256('abd'));
});

test('threshold conditions', () => {
  assert.equal(evaluateCondition(91, '>', 90), true);
  assert.equal(evaluateCondition(90, '>', 90), false);
  assert.equal(evaluateCondition(10, '<=', 10), true);
});

test('z-score anomaly detection uses real series', () => {
  const series = Array.from({ length: 20 }, (_, i) => ({ value: 40 + (i % 3), timestamp: String(i) }));
  series.push({ value: 99, timestamp: 'spike' });
  const points = detectValueAnomalies(series, 2.5);
  const spike = points.find((p) => p.timestamp === 'spike');
  assert.equal(spike?.isAnomaly, true);
  assert.ok((zScore(99, series.map((s) => s.value))) > 2);
});

test('log clustering', () => {
  const clusters = clusterLogs(['error code 12', 'error code 99', 'all good']);
  assert.ok(clusters.length >= 1);
  assert.ok(clusters.some((c) => c.count >= 2));
});

test('normalizes AWS and Jenkins integration form fields', () => {
  const aws = normalizeIntegrationConfig('aws', {
    aws_access_key_id: 'AKIATEST',
    aws_secret_access_key: 'secret',
    aws_region: 'us-west-2',
  });
  assert.equal(aws.accessKeyId, 'AKIATEST');
  assert.equal(aws.secretAccessKey, 'secret');
  assert.equal(aws.region, 'us-west-2');

  const jenkins = normalizeIntegrationConfig('jenkins', { token: 'abc', url: 'http://jenkins' });
  assert.equal(jenkins.apiToken, 'abc');
  assert.equal(jenkins.token, 'abc');
});

test('TOTP generate and verify', () => {
  const secret = generateTotpSecret();
  assert.ok(secret.length >= 16);
  const code = totpCode(secret);
  assert.equal(verifyTotp(secret, code), true);
  assert.equal(verifyTotp(secret, '000000'), false);
});
