import createLogger from 'bunyan-request-logger';
const oneSecondInMilliSeconds = 1000;
const thirtySeconds = 30;
export default (logger = {}) => {
  const log = createLogger({
    name: 'economist-server',
    ...logger,
  });
  const requestLogMiddleware = log.requestLogger();
  let metricsInterval = 0;
  log.metricsInterval = (seconds) => {
    log.metricsInterval.stop();
    metricsInterval = setInterval(() => {
      const metrics = process.memoryUsage();
      metrics.uptime = process.uptime() * oneSecondInMilliSeconds;
      log.info(metrics);
    }, (seconds || logger.metricsInterval || thirtySeconds) * oneSecondInMilliSeconds);
  };
  log.metricsInterval.stop = () => clearInterval(metricsInterval);
  log.metricsInterval();
  function requestLogger(request, response, next) {
    requestLogMiddleware(request, response, (error) => {
      if (error) {
        return next(error);
      }
      request.log = log.child({ req: request });
      next();
    });
  }
  requestLogger.log = log;
  return requestLogger;
};
