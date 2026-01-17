/**
 * Role-Based Access Control (RBAC)
 * ==================================
 * Simple role management for ChurnGuard.
 * 
 * Roles:
 * - admin: Full access (all actions)
 * - operator: Can perform interventions
 * - viewer: Read-only access
 */

// Role definitions
const ROLES = {
    ADMIN: 'admin',
    OPERATOR: 'operator',
    VIEWER: 'viewer',
};

// Permission definitions
const PERMISSIONS = {
    VIEW_DASHBOARD: 'view_dashboard',
    VIEW_USERS: 'view_users',
    CREATE_INTERVENTION: 'create_intervention',
    MANAGE_SENTINEL: 'manage_sentinel',
    VIEW_ANALYTICS: 'view_analytics',
    VIEW_AUDIT: 'view_audit',
    MANAGE_SETTINGS: 'manage_settings',
    RETRAIN_MODEL: 'retrain_model',
};

// Role-permission mapping
const rolePermissions = {
    [ROLES.ADMIN]: Object.values(PERMISSIONS), // All permissions
    [ROLES.OPERATOR]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_USERS,
        PERMISSIONS.CREATE_INTERVENTION,
        PERMISSIONS.VIEW_ANALYTICS,
    ],
    [ROLES.VIEWER]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_USERS,
        PERMISSIONS.VIEW_ANALYTICS,
    ],
};

/**
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
    const perms = rolePermissions[role] || [];
    return perms.includes(permission);
}

/**
 * Get all permissions for a role
 */
function getPermissions(role) {
    return rolePermissions[role] || [];
}

/**
 * Middleware to check permission (for Express routes)
 */
function requirePermission(permission) {
    return (req, res, next) => {
        // For demo, get role from header or default to admin
        const role = req.headers['x-user-role'] || ROLES.ADMIN;

        if (!hasPermission(role, permission)) {
            return res.status(403).json({
                success: false,
                error: 'Permission denied',
                required: permission,
                userRole: role,
            });
        }

        req.userRole = role;
        next();
    };
}

/**
 * Get role info for frontend
 */
function getRoleInfo(role) {
    return {
        role,
        permissions: getPermissions(role),
        isAdmin: role === ROLES.ADMIN,
        canIntervene: hasPermission(role, PERMISSIONS.CREATE_INTERVENTION),
        canManageSentinel: hasPermission(role, PERMISSIONS.MANAGE_SENTINEL),
    };
}

module.exports = {
    ROLES,
    PERMISSIONS,
    hasPermission,
    getPermissions,
    requirePermission,
    getRoleInfo,
};
