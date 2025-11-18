// Middleware to authenticate API requests
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      message: 'Please provide X-API-Key header' 
    });
  }

  if (apiKey !== process.env.BLOG_API_KEY) {
    return res.status(403).json({ 
      error: 'Invalid API key',
      message: 'The provided API key is not valid' 
    });
  }

  next();
};

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map();

const rateLimit = (limit = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitMap.get(ip);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    if (record.count >= limit) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later'
      });
    }

    record.count++;
    next();
  };
};

// Clean up rate limit map every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 600000);

module.exports = {
  authenticateAPIKey,
  rateLimit
};
