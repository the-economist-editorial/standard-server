import connect from 'connect';
import npcpConfig from 'npcp';
import etagifyMiddleware from 'etagify';
import authenticationMiddleware from './authentication';
import compressionMiddleware from './compression';
import faviconMiddleware from './favicon';
import statsMiddleware from './stats';
import manifestMiddleware from './manifest';
import staticAssetsMiddleware from './static-assets';
import loggerMiddleware from './logger';
const defaultServerPort = 8080;
export default function createServer(config = npcpConfig.server, dirname = process.cwd()) {
  const server = connect();
  server.config = Object.freeze({ ...config });
  const {
    authentication,
    compression,
    favicon,
    stats,
    logger,
    manifest,
    staticAssets,
    port = defaultServerPort,
  } = server.config;
  if (authentication && Object.keys(authentication.users).length) {
    server.use(authenticationMiddleware(authentication, dirname));
  }
  if (compression) {
    server.use(compressionMiddleware(compression, dirname));
  }
  if (favicon) {
    server.use(faviconMiddleware(favicon, dirname));
  }
  const logMiddleware = loggerMiddleware(logger);
  server.log = logMiddleware.log;
  server.use(logMiddleware);
  if (stats) {
    server.use('/_stats', statsMiddleware(stats, dirname));
  }
  if (manifest) {
    server.use(manifestMiddleware(manifest, dirname));
  }
  if (staticAssets) {
    server.use(staticAssetsMiddleware(staticAssets, dirname));
  }
  server.use(etagifyMiddleware());
  server.start = () => server.listen(port, function listen() {
    /* eslint-disable no-invalid-this */
    const address = this.address();
    address.url = `http://localhost:${address.port}`;
    server.log.info({ address }, 'Server running');
    /* eslint-enable no-invalid-this */
  });
  return server;
}
