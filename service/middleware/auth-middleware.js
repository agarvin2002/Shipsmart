/* global logger */
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const JwtHelper = require('../helpers/jwt-helper');
const SessionRepository = require('../repositories/session-repository');

const sessionRepository = new SessionRepository();

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JwtHelper.getSecret(),
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const session = await sessionRepository.findByJti(payload.jti);

      if (!session || session.revoked_at) {
        logger.warn(`Session revoked or not found for jti: ${payload.jti}`);
        return done(null, false);
      }

      if (new Date() > session.expires_at) {
        logger.warn(`Session expired for jti: ${payload.jti}`);
        return done(null, false);
      }

      return done(null, {
        userId: payload.userId,
        email: payload.email,
        jti: payload.jti,
      });
    } catch (error) {
      logger.error(`Error in JWT strategy: ${error.stack}`);
      return done(error, false);
    }
  })
);

module.exports = passport.authenticate('jwt', { session: false });
