const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('./config');
const { query } = require('./db');

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

async function authenticateRequest(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const result = await query(
      `SELECT id, email, display_name, role, account_status
       FROM users
       WHERE id = $1`,
      [decoded.sub]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'User account not found' });
    }

    const user = result.rows[0];
    if (user.account_status === 'suspended') {
      return res.status(403).json({ error: 'This account is suspended please contact an administrator' });
    }

    if (user.account_status === 'access_removed') {
      return res.status(403).json({ error: 'This account no longer has access and has been removed from the system. If this is not correct, please contact an administrator.' });
    }

    if (user.account_status === 'pending_approval') {
      return res.status(403).json({ error: 'This account is waiting for admin approval' });
    }

    req.user = {
      sub: user.id,
      role: user.role,
      email: user.email,
      displayName: user.display_name,
      accountStatus: user.account_status,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function optionalAuthenticateRequest(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const result = await query(
      `SELECT id, email, display_name, role, account_status
       FROM users
       WHERE id = $1`,
      [decoded.sub]
    );

    if (!result.rows.length) {
      return next();
    }

    const user = result.rows[0];
    if (['suspended', 'access_removed', 'pending_approval'].includes(user.account_status)) {
      return next();
    }

    req.user = {
      sub: user.id,
      role: user.role,
      email: user.email,
      displayName: user.display_name,
      accountStatus: user.account_status,
    };
  } catch (_error) {
    // Guest live-session responses should continue to work when no valid account token is present.
  }

  return next();
}

module.exports = {
  createPasswordHash,
  comparePassword,
  signToken,
  authenticateRequest,
  optionalAuthenticateRequest,
};
