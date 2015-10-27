import manifestMiddlware from 'connect-cache-manifest';
import { join as joinPath } from 'path';
const oneMinuteInSeconds = 60;
export default ({
    uri = 'application.manifest',
    maxAge = oneMinuteInSeconds,
    networks = [ '*' ],
    directories = [],
} = {}, dirname) => {
  const manifest = manifestMiddlware({
    manifestPath: uri[0] === '/' ? uri : `/${uri}`,
    networks,
    files: directories.map((dirOptions) => {
      const {
        directory = dirOptions,
        only = false,
        ignore = false,
      } = dirOptions;
      const dirUri = dirOptions.uri || directory;
      const ignoreRegexp = ignore && new RegExp(ignore);
      const onlyRegexp = only && new RegExp(only);
      return {
        dir: joinPath(dirname, directory),
        prefix: `/${dirUri}/`,
        ignore(file) {
          if (onlyRegexp) {
            return !onlyRegexp.test(file);
          } else if (ignoreRegexp) {
            return ignoreRegexp.test(file);
          }
          return false;
        },
      };
    }),
  });
  const manifestPath = uri[0] === '/' ? uri : `/${uri}`;
  return (request, response, next) => {
    if (request.url === manifestPath) {
      response.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      return manifest(request, response, next);
    }
    next();
  };
};
