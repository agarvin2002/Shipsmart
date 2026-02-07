/* global logger */
const bcrypt = require('bcrypt');
const UserRepository = require('../repositories/user-repository');
const SessionRepository = require('../repositories/session-repository');
const JwtHelper = require('../helpers/jwt-helper');
const { ValidationError, AuthenticationError } = require('@shipsmart/errors');

class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.sessionRepository = new SessionRepository();
  }

  async register(userData) {
    try {
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new ValidationError('Email already registered');
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
        throw new AuthenticationError('Invalid credentials');
      }

      if (user.status !== 'active') {
        throw new AuthenticationError('Account is inactive or suspended');
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        throw new AuthenticationError('Invalid credentials');
      }

      const accessTokenData = JwtHelper.generateAccessToken(user);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await this.sessionRepository.create({
        user_id: user.id,
        token_jti: accessTokenData.jti,
        device_info: deviceInfo,
        ip_address: ipAddress,
        expires_at: expiresAt,
      });

      await this.userRepository.updateLastLogin(user.id);

      const userResponse = user.toJSON();
      delete userResponse.password_hash;

      return {
        access_token: accessTokenData.token,
        user: userResponse,
      };
    } catch (error) {
      logger.error(`Error in login: ${error.stack}`);
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

      logger.info('Password reset token generated', { userId: user.id });

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
        throw new AuthenticationError('Invalid or expired reset token');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await this.userRepository.updatePassword(user.id, newPasswordHash);
      await this.userRepository.clearResetToken(user.id);

      // SECURITY: Revoke all existing sessions after password reset
      await this.sessionRepository.revokeAllByUserId(user.id);
      logger.info('All sessions revoked after password reset', { userId: user.id });

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
        throw new AuthenticationError('Invalid verification token');
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
