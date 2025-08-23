const jwt = require('jsonwebtoken');

/**
 * Verifies Bearer token and sets req.user = { id }
 */
function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  console.log(req.headers)
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  console.log(token)
  if (!token) {
    return res.status(401).json({ message: 'No token provided. Authorization denied.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

module.exports = auth;
