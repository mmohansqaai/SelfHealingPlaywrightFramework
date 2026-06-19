import { configureLocatorTargets } from 'autonomous-qa-sdk';
import { NOVA_RETAIL_LOCATOR_TARGETS, resolveNovaRetailRoot } from './nova-locator-targets';

configureLocatorTargets({
  appRoot: resolveNovaRetailRoot(),
  targets: NOVA_RETAIL_LOCATOR_TARGETS,
});
