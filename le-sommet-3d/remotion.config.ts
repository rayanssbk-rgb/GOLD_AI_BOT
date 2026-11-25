import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setConcurrency(4);
Config.setTimeoutInMilliseconds(120000);
Config.setChromiumOpenGlRenderer('swangle');
// Use a local Chromium if REMOTION_BROWSER is set (e.g. headless shell)
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
