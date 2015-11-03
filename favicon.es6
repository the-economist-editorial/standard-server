import faviconMiddleware from 'serve-favicon';
import { join as joinPath } from 'path';
export default (favicon = 'favicon.ico', dirname = process.cwd()) => {
  return faviconMiddleware(joinPath(dirname, favicon));
};
