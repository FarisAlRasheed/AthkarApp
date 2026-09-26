// Web entry: Skia draws with CanvasKit (public/canvaskit.wasm), which must load before any screen
// renders. Native uses index.ts. See https://shopify.github.io/react-native-skia/docs/getting-started/web
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// The wasm file sits at the site root (copied from public/). Without locateFile, CanvasKit looks
// next to the script — /_expo/static/js/web/ in a production export — and the page stays blank.
LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => {
  renderRootComponent(App);
});
