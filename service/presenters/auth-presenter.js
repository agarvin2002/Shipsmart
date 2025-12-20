const BasePresenter = require('./base-presenter');
const UserPresenter = require('./user-presenter');

class AuthPresenter extends BasePresenter {
  static presentLoginResponse(data) {
    return {
      access_token: data.access_token,
      token_type: 'Bearer',
      expires_in: 86400,
      user: UserPresenter.present(data.user)
    };
  }

  static presentRegisterResponse(user) {
    return {
      user: UserPresenter.present(user),
      message: 'Registration successful. Please verify your email.'
    };
  }

  static presentLogoutResponse() {
    return {
      message: 'Logged out successfully'
    };
  }

  static presentPasswordResetRequest() {
    return {
      message: 'If the email exists, a password reset link has been sent.'
    };
  }

  static presentPasswordResetSuccess() {
    return {
      message: 'Password reset successfully. Please login with your new password.'
    };
  }

  static presentEmailVerificationSuccess() {
    return {
      message: 'Email verified successfully. You can now login.'
    };
  }
}

module.exports = AuthPresenter;
