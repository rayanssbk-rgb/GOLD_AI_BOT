export const rnd = (i, j = 0) => {
  const s = Math.sin(i * 12.9898 + j * 78.233 + 0.5) * 43758.5453123;
  return s - Math.floor(s);
};

