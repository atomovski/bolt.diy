import { Sandbox } from 'e2b';
import { WORK_DIR_NAME } from '~/utils/constants';

interface SandboxContext {
  loaded: boolean;
}

export const sandboxContext: SandboxContext = import.meta.hot?.data.sandboxContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.sandboxContext = sandboxContext;
}

export let sandbox: Promise<Sandbox> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  console.log('E2B API KEY', import.meta.env.E2B_API_KEY);
  console.log('E2B TEMPLATE ID', import.meta.env.E2B_TEMPLATE_ID);

  sandbox =
    import.meta.hot?.data.sandbox ??
    Promise.resolve()
      .then(() => {
        // Use environment variable for template ID, fallback to default
        const templateId = import.meta.env.E2B_TEMPLATE_ID || 'bolt-dev';

        return Sandbox.create(templateId, {
          apiKey: import.meta.env.E2B_API_KEY,
          timeoutMs: 600_000,
          metadata: {
            workdir: WORK_DIR_NAME,
          },
        });
      })
      .then(async (sandbox) => {
        sandboxContext.loaded = true;

        //const { workbenchStore } = await import('~/lib/stores/workbench');

        /**
         * Note: e2b doesn't have the same preview script injection mechanism
         * This will need to be handled differently in the preview system
         */
        console.log('E2B Sandbox initialized successfully: ', sandbox.sandboxId);

        /**
         * e2b doesn't have the same event system as WebContainer
         * Will need to implement sandbox lifecycle monitoring differently
         * For now, we'll just log successful initialization
         */

        return sandbox;
      })
      .catch((error) => {
        console.error('Failed to initialize E2B Sandbox:', error);
        throw error;
      });

  if (import.meta.hot) {
    import.meta.hot.data.sandbox = sandbox;
  }
}
