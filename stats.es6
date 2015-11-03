import httpStatus from 'http-status';
export default (stats = {}) => {
  const statsString = JSON.stringify(stats);
  return (request, response) => {
    response.writeHead(httpStatus.OK, {
      'Content-Type': 'application/json;charset=utf-8',
      'Cache-Control': 'max-age=0, must-revalidate',
    });
    response.end(statsString);
  };
};
