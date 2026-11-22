import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

const FONTS: [string, string][] = [
  ['Inter500', 'Inter-500.woff2'],
  ['Inter700', 'Inter-700.woff2'],
  ['CormorantLocal', 'CormorantGaramond-Medium.woff2'],
];

/** Loads the bundled fonts before the first frame (canvas textures need them too). */
export function useFonts() {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(
      FONTS.map(([fam, file]) =>
        new FontFace(fam, `url(${staticFile(file)}) format('woff2')`, { weight: '300 800', style: 'normal' }).load().then((ff) => {
          (document.fonts as unknown as { add: (f: FontFace) => void }).add(ff);
        }),
      ),
    )
      .catch((e) => console.error(e))
      .finally(() => continueRender(handle));
  }, [handle]);
}
