import compressionMiddleware from 'compression';
export default (config = {}) => {
  return compressionMiddleware({
    level: 9,
    ...config,
  });
};
