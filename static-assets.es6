import { join as joinPath } from 'path';
import acceptWebpMiddleware from 'accept-webp';
import staticMiddleware from 'st';
const oneSecondInMilliseconds = 60;
const oneYearInSeconds = 31540000;
export default ({
  uri = 'assets',
  directory = 'assets',
  maxAge = oneYearInSeconds,
  acceptWebp,
} = {}, dirname = process.cwd()) => {
  const staticDirectory = joinPath(dirname, directory);
  const maxAgeInMilliseconds = maxAge * oneSecondInMilliseconds;
  const staticAssets = staticMiddleware({
    path: staticDirectory,
    url: uri,
    cache: {
      /* eslint-disable id-length */
      fd: {
      /* eslint-enable id-length */
        maxAge: maxAgeInMilliseconds,
      },
      stats: {
        maxAge: maxAgeInMilliseconds,
      },
      content: {
        maxAge: maxAgeInMilliseconds,
      },
      readdir: {
        maxAge: maxAgeInMilliseconds,
      },
    },
    gzip: false,
    passthrough: true,
    dot: false,
    index: false,
  });
  const staticUrl = uri[0] === '/' ? uri : `/${uri}`;
  let middleware = staticAssets;
  if (acceptWebp) {
    const webp = acceptWebpMiddleware(staticDirectory);
    middleware = (request, response, next) => (
      webp(request, response, (error) => {
        if (error) {
          return next(error);
        }
        staticAssets(request, response, next);
      })
    );
  }
  return (request, response, next) => {
    if (request.url.indexOf(staticUrl) === 0) {
      return middleware(request, response, next);
    }
    next();
  };
};
