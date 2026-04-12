const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('./config');

function createPasswordHash(password) {
  return bcrypt.hash(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      displayName: user.display_name,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

function authenticateRequest(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = {
  createPasswordHash,
  comparePassword,
  signToken,
  authenticateRequest,
};
