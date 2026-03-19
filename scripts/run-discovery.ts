import '../src/lib/utils/env-loader';
import { runDiscovery } from '../src/discovery/discovery-runner';
import { logger } from '../src/lib/utils/logger';

async function main() {
  const result = await runDiscovery('hotel');
  logger.info('Discovery complete', result);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
