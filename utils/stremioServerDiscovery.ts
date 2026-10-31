import * as Network from 'expo-network';

export interface DiscoveredStremioServer {
  host: string;
  serverUrl: string;
}

const STREMIO_ENDPOINTS = [
  { protocol: 'http', port: 11470 },
  { protocol: 'https', port: 12470 },
] as const;
const MAX_CONCURRENT_PROBES = 32;
const REQUEST_TIMEOUT_MS = 750;

const isPrivateIpv4 = (address: string) => {
  const octets = address.split('.').map(Number);
  if (
    octets.length !== 4
    || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
};

const isStremioEndpoint = async (serverUrl: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(serverUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { Accept: '*/*' },
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function discoverStremioServers(): Promise<DiscoveredStremioServer[]> {
  const localAddress = await Network.getIpAddressAsync();
  if (!isPrivateIpv4(localAddress)) {
    throw new Error('Could not determine a private IPv4 address for this network.');
  }

  const prefix = localAddress.split('.').slice(0, 3).join('.');
  const candidates = Array.from({ length: 254 }, (_, index) => `${prefix}.${index + 1}`)
    .filter((host) => host !== localAddress)
    .flatMap((host) => STREMIO_ENDPOINTS.map(({ protocol, port }) => ({
      host,
      serverUrl: `${protocol}://${host}:${port}`,
    })));
  const discovered: DiscoveredStremioServer[] = [];
  let nextCandidate = 0;

  const workers = Array.from({ length: MAX_CONCURRENT_PROBES }, async () => {
    while (nextCandidate < candidates.length) {
      const candidate = candidates[nextCandidate++];
      if (await isStremioEndpoint(candidate.serverUrl)) {
        discovered.push({ host: candidate.host, serverUrl: candidate.serverUrl });
      }
    }
  });

  await Promise.all(workers);
  return discovered.sort((serverA, serverB) => serverA.serverUrl.localeCompare(serverB.serverUrl));
}