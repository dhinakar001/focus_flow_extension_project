/**
 * User Service - Production-grade user management
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dbService = require('./dbService');
const logger = require('../utils/logger');
const authMiddleware = require('../middlewares/authMiddleware');

const SALT_ROUNDS = 12;

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Create new user account
 */
async function createUser(userData) {
  const { email, username, password, firstName, lastName, cliqUserId } = userData;

  // Validate required fields
  if (!email || !username || !password) {
    throw new Error('Email, username, and password are required');
  }

  // Check if user already exists
  const existingUser = await dbService.getUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const existingUsername = await dbService.getUserByUsername(username);
  if (existingUsername) {
    throw new Error('Username is already taken');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Create user
  const user = await dbService.createUser({
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    passwordHash,
    firstName,
    lastName,
    cliqUserId,
    verificationToken,
    isActive: true,
    isVerified: false
  });

  // Assign default role
  await dbService.assignRoleToUser(user.id, 'user');

  // Create initial user score
  await dbService.createUserScore(user.id);

  // Create initial streak records
  await dbService.createFocusStreak(user.id, 'daily');
  await dbService.createFocusStreak(user.id, 'weekly');
  await dbService.createFocusStreak(user.id, 'monthly');

  // Log activity
  await dbService.logActivity({
    userId: user.id,
    activityType: 'user_created',
    activityCategory: 'authentication',
    description: 'User account created',
    metadata: { email, username }
  });

  // Remove sensitive data before returning
  delete user.password_hash;
  delete user.verification_token;

  return user;
}

/**
 * Authenticate user and generate tokens
 */
async function authenticateUser(emailOrUsername, password) {
  // Find user by email or username
  let user = await dbService.getUserByEmail(emailOrUsername);
  if (!user) {
    user = await dbService.getUserByUsername(emailOrUsername);
  }

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.is_active) {
    throw new Error('Account is deactivated');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Get user roles and permissions
  const roles = await dbService.getUserRoles(user.id);
  const permissions = await dbService.getUserPermissions(user.id);

  // Update last login
  await dbService.updateUserLastLogin(user.id);

  // Create session
  const sessionToken = await dbService.createActiveSession({
    userId: user.id,
    deviceInfo: {},
    ipAddress: null,
    userAgent: null,
    expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Generate tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    roles: roles.map(r => r.name)
  };

  const accessToken = authMiddleware.generateToken(tokenPayload);
  const refreshToken = authMiddleware.generateRefreshToken({ userId: user.id, sessionToken });

  // Log activity
  await dbService.logActivity({
    userId: user.id,
    activityType: 'login',
    activityCategory: 'authentication',
    description: 'User logged in',
    metadata: { email: user.email }
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: roles.map(r => ({ id: r.id, name: r.name })),
      permissions,
      isVerified: user.is_verified
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60 // 24 hours in seconds
    }
  };
}

/**
 * Refresh access token
 */
async function refreshToken(refreshTokenString) {
  try {
    const decoded = authMiddleware.verifyToken(refreshTokenString);
    
    // Verify session exists and is valid
    if (decoded.sessionToken) {
      const session = await dbService.getActiveSessionByToken(decoded.sessionToken);
      if (!session || new Date(session.expires_at) < new Date()) {
        throw new Error('Session expired');
      }
    }

    // Get user
    const user = await dbService.getUserById(decoded.userId);
    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    // Get roles
    const roles = await dbService.getUserRoles(user.id);

    // Generate new access token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      roles: roles.map(r => r.name)
    };

    const accessToken = authMiddleware.generateToken(tokenPayload);

    return {
      accessToken,
      expiresIn: 24 * 60 * 60
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

/**
 * Get user profile
 */
async function getUserProfile(userId) {
  const user = await dbService.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const roles = await dbService.getUserRoles(userId);
  const permissions = await dbService.getUserPermissions(userId);
  const score = await dbService.getUserScore(userId);
  const streaks = await dbService.getUserStreaks(userId);

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    timezone: user.timezone,
    preferences: user.preferences || {},
    isVerified: user.is_verified,
    roles: roles.map(r => ({ id: r.id, name: r.name })),
    permissions,
    score: score || {},
    streaks: streaks || [],
    createdAt: user.created_at,
    lastLogin: user.last_login
  };
}

/**
 * Update user profile
 */
async function updateUserProfile(userId, updateData) {
  const allowedFields = ['first_name', 'last_name', 'timezone', 'preferences'];
  const updates = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updates[field] = updateData[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No valid fields to update');
  }

  const user = await dbService.updateUser(userId, updates);

  // Log activity
  await dbService.logActivity({
    userId,
    activityType: 'profile_updated',
    activityCategory: 'settings',
    description: 'User profile updated',
    metadata: { updatedFields: Object.keys(updates) }
  });

  return user;
}

/**
 * Change user password
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await dbService.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await dbService.updateUser(userId, { password_hash: newPasswordHash });

  // Log activity
  await dbService.logActivity({
    userId,
    activityType: 'password_changed',
    activityCategory: 'authentication',
    description: 'User changed password'
  });

  return { success: true };
}

/**
 * Request password reset
 */
async function requestPasswordReset(email) {
  const user = await dbService.getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists for security
    return { success: true, message: 'If the email exists, a reset link has been sent' };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 3600000); // 1 hour

  await dbService.updateUser(user.id, {
    reset_password_token: resetToken,
    reset_password_expires: resetExpires
  });

  // TODO: Send email with reset link
  // await emailService.sendPasswordResetEmail(user.email, resetToken);

  return { success: true, message: 'If the email exists, a reset link has been sent' };
}

/**
 * Reset password with token
 */
async function resetPassword(token, newPassword) {
  const user = await dbService.getUserByResetToken(token);
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  if (new Date(user.reset_password_expires) < new Date()) {
    throw new Error('Reset token has expired');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password and clear reset token
  await dbService.updateUser(user.id, {
    password_hash: passwordHash,
    reset_password_token: null,
    reset_password_expires: null
  });

  // Log activity
  await dbService.logActivity({
    userId: user.id,
    activityType: 'password_reset',
    activityCategory: 'authentication',
    description: 'User reset password via token'
  });

  return { success: true };
}

/**
 * Verify user email
 */
async function verifyEmail(token) {
  const user = await dbService.getUserByVerificationToken(token);
  if (!user) {
    throw new Error('Invalid verification token');
  }

  if (user.is_verified) {
    return { success: true, message: 'Email already verified' };
  }

  await dbService.updateUser(user.id, {
    is_verified: true,
    verification_token: null
  });

  // Log activity
  await dbService.logActivity({
    userId: user.id,
    activityType: 'email_verified',
    activityCategory: 'authentication',
    description: 'User verified email'
  });

  return { success: true };
}

/**
 * Logout user
 */
async function logoutUser(userId, sessionToken) {
  if (sessionToken) {
    await dbService.deleteActiveSession(sessionToken);
  }

  // Log activity
  await dbService.logActivity({
    userId,
    activityType: 'logout',
    activityCategory: 'authentication',
    description: 'User logged out'
  });

  return { success: true };
}

module.exports = {
  createUser,
  authenticateUser,
  refreshToken,
  getUserProfile,
  updateUserProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  logoutUser,
  hashPassword,
  comparePassword
};

