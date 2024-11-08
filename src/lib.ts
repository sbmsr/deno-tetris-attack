export function getRandomNumber(): number {
    return crypto.getRandomValues(new Uint32Array(1))[0]
  }
