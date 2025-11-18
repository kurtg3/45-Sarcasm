// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Axios errors
  if (err.response) {
    return res.status(err.response.status || 500).json({
      error: 'External API error',
      message: err.response.data?.error || err.message,
      details: process.env.NODE_ENV === 'development' ? err.response.data : undefined
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: err.errors
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.name || 'Internal server error',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  // Check if the request is an API request
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'Not found',
      message: `API route ${req.method} ${req.url} not found`
    });
  }

  // For non-API requests, serve the custom 404 page
  res.status(404).sendFile(require('path').join(__dirname, '../../404.html'));
};

module.exports = {
  errorHandler,
  notFoundHandler
};
