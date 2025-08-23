// 404
function notFound(req, res, next) {
  res.status(404).json({ message: 'Route not found' });
}

// Central error handler
// If any route throws or calls next(err), it lands here.
function errorHandler(err, req, res, next) {
  console.error('💥', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Server error',
  });
}

module.exports = { notFound, errorHandler };
