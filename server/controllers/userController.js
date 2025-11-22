/**
 * User Controller - Handle user authentication and profile requests
 */
const userService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * Register new user
 */
async function register(req, res, next) {
  try {
    const { email, username, password, firstName, lastName } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Email, username, and password are required'
      });
    }

    const user = await userService.createUser({
      email,
      username,
      password,
      firstName,
      lastName
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully. Please check your email to verify your account.',
      data: {
        userId: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    logger.error('[UserController] register failed', error);
    
    if (error.message.includes('already exists') || error.message.includes('already taken')) {
      return res.status(409).json({
        error: error.message
      });
    }

    return next(error);
  }
}

/**
 * Login user
 */
async function login(req, res, next) {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        error: 'Email/username and password are required'
      });
    }

    const result = await userService.authenticateUser(emailOrUsername, password);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('[UserController] login failed', error);
    
    if (error.message === 'Invalid credentials' || error.message === 'Account is deactivated') {
      return res.status(401).json({
        error: error.message
      });
    }

    return next(error);
  }
}

/**
 * Refresh access token
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    const result = await userService.refreshToken(refreshToken);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('[UserController] refreshToken failed', error);
    return res.status(401).json({
      error: 'Invalid or expired refresh token'
    });
  }
}

/**
 * Get user profile
 */
async function getProfile(req, res, next) {
  try {
    const profile = await userService.getUserProfile(req.user.userId);

    return res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('[UserController] getProfile failed', error);
    return next(error);
  }
}

/**
 * Update user profile
 */
async function updateProfile(req, res, next) {
  try {
    const updates = await userService.updateUserProfile(req.user.userId, req.body);

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updates
    });
  } catch (error) {
    logger.error('[UserController] updateProfile failed', error);
    return next(error);
  }
}

/**
 * Change password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    await userService.changePassword(req.user.userId, currentPassword, newPassword);

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('[UserController] changePassword failed', error);
    
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        error: error.message
      });
    }

    return next(error);
  }
}

/**
 * Forgot password
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    const result = await userService.requestPasswordReset(email);

    return res.json(result);
  } catch (error) {
    logger.error('[UserController] forgotPassword failed', error);
    return next(error);
  }
}

/**
 * Reset password
 */
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token and new password are required'
      });
    }

    await userService.resetPassword(token, newPassword);

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('[UserController] resetPassword failed', error);
    
    if (error.message.includes('Invalid') || error.message.includes('expired')) {
      return res.status(400).json({
        error: error.message
      });
    }

    return next(error);
  }
}

/**
 * Verify email
 */
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }

    const result = await userService.verifyEmail(token);

    return res.json(result);
  } catch (error) {
    logger.error('[UserController] verifyEmail failed', error);
    
    if (error.message === 'Invalid verification token') {
      return res.status(400).json({
        error: error.message
      });
    }

    return next(error);
  }
}

/**
 * Logout
 */
async function logout(req, res, next) {
  try {
    const { sessionToken } = req.body;
    
    await userService.logoutUser(req.user.userId, sessionToken);

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('[UserController] logout failed', error);
    return next(error);
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout
};

