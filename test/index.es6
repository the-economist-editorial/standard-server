import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiSpies from 'chai-spies';
import fileSystem from 'fs';
import createServer from '..';
import authenticationMiddleware from '../authentication';
import compressionMiddleware from '../compression';
import faviconMiddleware from '../favicon';
import manifestMiddleware from '../manifest';
import statsMiddleware from '../stats';
import staticAssetsMiddleware from '../static-assets';
import connect from 'connect';
import httpStatus from 'http-status';
chai.use(chaiHttp).use(chaiSpies).should();
describe('standard server', () => {
  let server = null;
  beforeEach(() => {
    server = createServer();
  });

  it('is a function', () => createServer.should.be.a('function'));

  it('returns a connect server', () => {
    server
      .should.be.a('function')
        .that.itself.respondsTo('start')
        .and.respondsTo('listen')
        .and.respondsTo('use')
        .and.respondsTo('handle')
        .and.respondsTo('listen')
        .and.respondsTo('on')
        .and.respondsTo('once');
  });

  it('includes a log function to the server', () => {
    server
      .should.have.property('log')
        .that.respondsTo('trace')
        .and.respondsTo('debug')
        .and.respondsTo('info')
        .and.respondsTo('warn')
        .and.respondsTo('error');
  });

  describe('authenticationMiddleware', () => {

    it('is a function', () => authenticationMiddleware.should.be.a('function'));

    it('returns a middlware handler', () => {
      authenticationMiddleware()
        .should.be.a('function');
    });

    it('returns 401 unauthorized for every url', () => {
      const app = chai.request(connect().use(authenticationMiddleware()));
      return app.get('/').then((response) => {
        response
          .should.have.status(httpStatus.UNAUTHORIZED)
          .and.have.header('www-authenticate', 'Basic realm="protected"');
      });
    });

    it('allows realm can be overriden', () => {
      const app = chai.request(connect().use(authenticationMiddleware({
        realm: 'foo',
      })));
      return app.get('/').then((response) => {
        response
          .should.have.status(httpStatus.UNAUTHORIZED)
          .and.have.header('www-authenticate', 'Basic realm="foo"');
      });
    });

    it('will allow in users with the right credentials', () => {
      const app = chai.request(connect().use(authenticationMiddleware({
        users: {
          'foo': 'bar',
        },
      })).use((request, response) => response.end('Access Granted!')));
      return app.get('/').buffer().auth('foo', 'bar').then((response) => {
        response
          .should.have.status(httpStatus.OK)
          .and.have.property('text', 'Access Granted!');
        response
          .should.not.have.header('www-authenticate');
      });
    });

    it('will deny in users with the wrong credentials', () => {
      const app = chai.request(connect().use(authenticationMiddleware({
        users: {
          'foo': 'bar',
        },
      })).use((request, response) => response.end('Access Granted!')));
      return app.get('/').buffer().auth('foo', 'barrrr').then((response) => {
        response
          .should.have.status(httpStatus.UNAUTHORIZED)
          .and.have.header('www-authenticate', 'Basic realm="protected"')
          .and.have.property('text', 'Access Denied');
      });
    });

  });

  describe('compressionMiddleware', () => {

    it('is a function', () => compressionMiddleware.should.be.a('function'));

    it('returns a middlware handler', () => {
      compressionMiddleware()
        .should.be.a('function');
    });

  });

  describe('faviconMiddleware', () => {
    /* eslint-disable no-sync */
    let stat = {};
    beforeEach(() => {
      stat = {
        isDirectory: () => false,
      };
      fileSystem.statSync = chai.spy(() => stat);
    });

    it('is a function', () => faviconMiddleware.should.be.a('function'));

    it('returns a middlware handler', () => {
      faviconMiddleware()
        .should.be.a('function');
    });

    it('reads the file favicon file from `(filename, dirname)`', () => {
      faviconMiddleware('fav.ico', '/foo/bar');
      fileSystem.statSync.should.have.been.called.with.exactly('/foo/bar/fav.ico');
    });

  });

  describe('manifestMiddleware', () => {

    it('is a function', () => manifestMiddleware.should.be.a('function'));

    it('returns a middlware handler', () => {
      manifestMiddleware()
        .should.be.a('function');
    });

  });

  describe('statsMiddleware', () => {
    let json = {};
    let app = {};
    beforeEach(() => {
      json = {
        foo: 'bar',
        baz: 'bing',
      };
      app = chai.request(connect()
        .use(statsMiddleware(json))
        .use((request, response) => response.write(request.url))
      );
    });

    it('is a function', () => statsMiddleware.should.be.a('function'));

    it('returns a middlware handler', () => {
      statsMiddleware()
        .should.be.a('function');
    });

    it('will return given object as JSON response', () => {
      return app.get('/').then((response) => {
        response
          .should.be.json
          .and.have.status(httpStatus.OK)
          .and.have.property('body').deep.equal(json);
      });
    });

  });

  describe('staticAssetsMiddleware', () => {

    it('is a function', () => staticAssetsMiddleware.should.be.a('function'));

    it('returns a middlware handler', () => {
      staticAssetsMiddleware()
        .should.be.a('function');
    });

  });

});
