import basicAuth from 'basic-auth';
import httpStatus from 'http-status';
export default ({ users = {}, realm = 'protected' } = {}) => {
  return (request, response, next) => {
    const { name, pass } = basicAuth(request) || {};
    if (name && pass && users[name] === pass) {
      return next();
    }
    response.writeHead(httpStatus.UNAUTHORIZED, {
      'WWW-Authenticate': `Basic realm="${realm}"`,
    });
    return response.end('Access Denied');
  };
};
