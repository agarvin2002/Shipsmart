const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('@shipsmart/env');

class JwtHelper {
  static getSecret() {
    const secret = config.get('jwt:secret');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

  static generateAccessToken(user) {
    const jti = uuidv4();
    const payload = {
      userId: user.id,
      email: user.email,
      jti,
    };

    return {
      token: jwt.sign(payload, this.getSecret(), { expiresIn: '24h' }),
      jti,
    };
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, this.getSecret());
    } catch (error) {
      return null;
    }
  }

  static decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = JwtHelper;
