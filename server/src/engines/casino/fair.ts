import crypto from 'crypto';

export const sha256 = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');

export const randomHex = (bytes = 16): string => crypto.randomBytes(bytes).toString('hex');

/**
 * Rút số ngẫu nhiên float [0,1) từ bộ seed — minh bạch, kiểm chứng lại được.
 * Cùng (serverSeed, clientSeed, nonce, round) luôn cho cùng kết quả.
 */
export function drawFloat(serverSeed: string, clientSeed: string, nonce: number, round: number): number {
  const h = sha256(`${serverSeed}:${clientSeed}:${nonce}:${round}`);
  return parseInt(h.slice(0, 13), 16) / 0x10000000000000;
}

export interface FairSeeds {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  seedHash: string;
}

export function newSeeds(clientSeed?: string, nonce = 1): FairSeeds {
  const serverSeed = randomHex(32);
  return {
    serverSeed,
    clientSeed: clientSeed || randomHex(16),
    nonce,
    seedHash: sha256(serverSeed),
  };
}
