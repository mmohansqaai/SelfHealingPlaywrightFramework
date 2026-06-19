import { configureLocatorTargets } from 'autonomous-qa-sdk';
import { NOVA_RETAIL_LOCATOR_TARGETS, resolveNovaRetailRoot } from './src/nova-locator-targets';

export default async function globalSetup(): Promise<void> {
  configureLocatorTargets({
    appRoot: resolveNovaRetailRoot(),
    targets: NOVA_RETAIL_LOCATOR_TARGETS,
  });
}
