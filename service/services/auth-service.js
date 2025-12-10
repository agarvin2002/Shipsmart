/* global logger */
const bcrypt = require('bcrypt');
const UserRepository = require('../repositories/user-repository');
const SessionRepository = require('../repositories/session-repository');
const JwtHelper = require('../helpers/jwt-helper');

class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.sessionRepository = new SessionRepository();
  }

  async register(userData) {
    try {
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        return { error: 'Email already registered' };
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);

      const user = await this.userRepository.create({
        email: userData.email,
        password_hash: passwordHash,
        first_name: userData.first_name,
        last_name: userData.last_name,
        company_name: userData.company_name,
        phone: userData.phone,
      });

      const userResponse = user.toJSON();
      delete userResponse.password_hash;

      return userResponse;
    } catch (error) {
      logger.error(`Error in register: ${error.stack}`);
      throw error;
    }
  }

  async login(email, password, ipAddress, deviceInfo) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return { error: 'Invalid credentials' };
      }

      if (user.status !== 'active') {
        return { error: 'Account is inactive or suspended' };
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return { error: 'Invalid credentials' };
      }

      const accessTokenData = JwtHelper.generateAccessToken(user);
      const refreshTokenData = JwtHelper.generateRefreshToken(user);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await this.sessionRepository.create({
        user_id: user.id,
        token_jti: accessTokenData.jti,
        refresh_token: refreshTokenData.token,
        device_info: deviceInfo,
        ip_address: ipAddress,
        expires_at: expiresAt,
      });

      await this.userRepository.updateLastLogin(user.id);

      const userResponse = user.toJSON();
      delete userResponse.password_hash;

      return {
        access_token: accessTokenData.token,
        refresh_token: refreshTokenData.token,
        user: userResponse,
      };
    } catch (error) {
      logger.error(`Error in login: ${error.stack}`);
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = JwtHelper.verifyToken(refreshToken);
      if (!decoded || decoded.type !== 'refresh') {
        return { error: 'Invalid refresh token' };
      }

      const session = await this.sessionRepository.findByJti(decoded.jti);
      if (!session || session.revoked_at) {
        return { error: 'Session has been revoked' };
      }

      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        return { error: 'User not found' };
      }

      const newAccessTokenData = JwtHelper.generateAccessToken(user);

      await this.sessionRepository.create({
        user_id: user.id,
        token_jti: newAccessTokenData.jti,
        refresh_token: refreshToken,
        device_info: session.device_info,
        ip_address: session.ip_address,
        expires_at: session.expires_at,
      });

      return {
        access_token: newAccessTokenData.token,
      };
    } catch (error) {
      logger.error(`Error in refreshToken: ${error.stack}`);
      throw error;
    }
  }

  async logout(jti) {
    try {
      const result = await this.sessionRepository.revoke(jti);
      return { message: 'Logged out successfully' };
    } catch (error) {
      logger.error(`Error in logout: ${error.stack}`);
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return { message: 'If email exists, password reset link has been sent' };
      }

      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await this.userRepository.setResetToken(user.id, token, expiresAt);

      logger.info(`Password reset token generated for user ${user.id}: ${token}`);

      return { message: 'If email exists, password reset link has been sent' };
    } catch (error) {
      logger.error(`Error in forgotPassword: ${error.stack}`);
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const user = await this.userRepository.findByResetToken(token);
      if (!user || !user.password_reset_expires_at || new Date() > user.password_reset_expires_at) {
        return { error: 'Invalid or expired reset token' };
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await this.userRepository.updatePassword(user.id, newPasswordHash);
      await this.userRepository.clearResetToken(user.id);

      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error(`Error in resetPassword: ${error.stack}`);
      throw error;
    }
  }

  async verifyEmail(token) {
    try {
      const user = await this.userRepository.findByVerificationToken(token);
      if (!user) {
        return { error: 'Invalid verification token' };
      }

      await this.userRepository.setEmailVerified(user.id);

      return { message: 'Email verified successfully' };
    } catch (error) {
      logger.error(`Error in verifyEmail: ${error.stack}`);
      throw error;
    }
  }
}

module.exports = AuthService;
