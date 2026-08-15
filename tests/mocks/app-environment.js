// Stand-in for SvelteKit's $app/environment virtual module.
// Tests run under vitest's jsdom environment, which is a browser-like
// environment, so `browser` is true here — this mirrors what the real
// module reports when the app is actually running in a browser.
export const browser = true;
export const dev = true;
export const building = false;
export const version = 'test';
