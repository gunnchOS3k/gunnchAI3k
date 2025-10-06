import { Logger } from '../utils/logger';
import { AuditManager } from './audit';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  mfaEnabled: boolean;
  lastLogin?: Date;
  isActive: boolean;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export enum UserRole {
  EXECUTIVE = 'executive',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  VIEWER = 'viewer'
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredApproval?: boolean;
  auditRequired?: boolean;
}

export class AuthorizationManager {
  private logger: Logger;
  private auditManager: AuditManager;
  private rolePermissions: Map<UserRole, Permission[]>;

  constructor(auditManager: AuditManager) {
    this.logger = new Logger();
    this.auditManager = auditManager;
    this.rolePermissions = new Map();
    this.initializeRolePermissions();
  }

  private initializeRolePermissions() {
    // Executive role - Full control with approval requirements
    this.rolePermissions.set(UserRole.EXECUTIVE, [
      { resource: '*', actions: ['*'] },
      { resource: 'ai_actions', actions: ['approve', 'reject', 'execute'] },
      { resource: 'security', actions: ['view', 'configure', 'audit'] },
      { resource: 'users', actions: ['create', 'read', 'update', 'delete'] }
    ]);

    // Admin role - Administrative functions
    this.rolePermissions.set(UserRole.ADMIN, [
      { resource: 'users', actions: ['read', 'update'] },
      { resource: 'ai_actions', actions: ['view', 'approve'] },
      { resource: 'audit', actions: ['read'] },
      { resource: 'security', actions: ['view'] }
    ]);

    // Manager role - Limited administrative functions
    this.rolePermissions.set(UserRole.MANAGER, [
      { resource: 'ai_actions', actions: ['view', 'request'] },
      { resource: 'users', actions: ['read'] },
      { resource: 'audit', actions: ['read'] }
    ]);

    // User role - Basic interactions
    this.rolePermissions.set(UserRole.USER, [
      { resource: 'ai_actions', actions: ['view', 'request'] },
      { resource: 'profile', actions: ['read', 'update'] }
    ]);

    // Viewer role - Read-only access
    this.rolePermissions.set(UserRole.VIEWER, [
      { resource: 'ai_actions', actions: ['view'] },
      { resource: 'profile', actions: ['read'] }
    ]);
  }

  async authorize(user: User, resource: string, action: string, context?: Record<string, any>): Promise<AuthorizationResult> {
    try {
      // Check if user is active
      if (!user.isActive) {
        await this.auditManager.logSecurityEvent({
          timestamp: new Date(),
          eventType: 'AUTHORIZATION',
          severity: 'HIGH',
          description: `Inactive user attempted access: ${user.id}`,
          userId: user.id,
          metadata: { resource, action }
        });
        return { allowed: false, reason: 'User account is inactive' };
      }

      // Check MFA requirement for sensitive actions
      if (this.requiresMFA(resource, action) && !user.mfaEnabled) {
        await this.auditManager.logSecurityEvent({
          timestamp: new Date(),
          eventType: 'AUTHORIZATION',
          severity: 'MEDIUM',
          description: `MFA required for action: ${action} on ${resource}`,
          userId: user.id,
          metadata: { resource, action }
        });
        return { allowed: false, reason: 'Multi-factor authentication required' };
      }

      // Check role-based permissions
      const hasPermission = this.checkPermission(user.role, resource, action);
      if (!hasPermission) {
        await this.auditManager.logSecurityEvent({
          timestamp: new Date(),
          eventType: 'AUTHORIZATION',
          severity: 'HIGH',
          description: `Unauthorized access attempt: ${action} on ${resource}`,
          userId: user.id,
          metadata: { resource, action, role: user.role }
        });
        return { allowed: false, reason: 'Insufficient permissions' };
      }

      // Check if action requires executive approval
      const requiresApproval = this.requiresExecutiveApproval(resource, action);
      if (requiresApproval && user.role !== UserRole.EXECUTIVE) {
        await this.auditManager.logSecurityEvent({
          timestamp: new Date(),
          eventType: 'AUTHORIZATION',
          severity: 'MEDIUM',
          description: `Executive approval required for: ${action} on ${resource}`,
          userId: user.id,
          metadata: { resource, action }
        });
        return { 
          allowed: false, 
          reason: 'Executive approval required',
          requiredApproval: true 
        };
      }

      // Log successful authorization
      await this.auditManager.logAuditEvent({
        timestamp: new Date(),
        userId: user.id,
        action: `AUTHORIZE_${action.toUpperCase()}`,
        resource,
        result: 'SUCCESS',
        metadata: { role: user.role, requiresApproval }
      });

      return { 
        allowed: true,
        auditRequired: this.requiresAudit(resource, action)
      };

    } catch (error) {
      this.logger.error('Authorization check failed:', error);
      return { allowed: false, reason: 'Authorization system error' };
    }
  }

  async authorizeAIAction(user: User, action: string, metadata?: Record<string, any>): Promise<AuthorizationResult> {
    // AI actions always require executive approval
    if (user.role !== UserRole.EXECUTIVE) {
      await this.auditManager.logAIAction(user.id, action, metadata);
      return { 
        allowed: false, 
        reason: 'AI actions require executive approval',
        requiredApproval: true 
      };
    }

    return { allowed: true, auditRequired: true };
  }

  private checkPermission(role: UserRole, resource: string, action: string): boolean {
    const permissions = this.rolePermissions.get(role) || [];
    
    for (const permission of permissions) {
      // Check wildcard permissions
      if (permission.resource === '*' && permission.actions.includes('*')) {
        return true;
      }
      
      // Check resource-specific permissions
      if (permission.resource === resource || permission.resource === '*') {
        if (permission.actions.includes(action) || permission.actions.includes('*')) {
          return true;
        }
      }
    }
    
    return false;
  }

  private requiresMFA(resource: string, action: string): boolean {
    const mfaRequiredResources = ['security', 'users', 'ai_actions'];
    const mfaRequiredActions = ['delete', 'execute', 'approve', 'configure'];
    
    return mfaRequiredResources.includes(resource) || mfaRequiredActions.includes(action);
  }

  private requiresExecutiveApproval(resource: string, action: string): boolean {
    const approvalRequiredResources = ['ai_actions', 'security', 'users'];
    const approvalRequiredActions = ['execute', 'approve', 'delete', 'configure'];
    
    return approvalRequiredResources.includes(resource) || approvalRequiredActions.includes(action);
  }

  private requiresAudit(resource: string, action: string): boolean {
    const auditRequiredResources = ['ai_actions', 'security', 'users', 'audit'];
    const auditRequiredActions = ['create', 'update', 'delete', 'execute', 'approve'];
    
    return auditRequiredResources.includes(resource) || auditRequiredActions.includes(action);
  }

  async createUser(userData: Omit<User, 'id'>, createdBy: string): Promise<User> {
    const user: User = {
      ...userData,
      id: this.generateUserId(),
      isActive: true
    };

    await this.auditManager.logAuditEvent({
      timestamp: new Date(),
      userId: createdBy,
      action: 'CREATE_USER',
      resource: 'users',
      result: 'SUCCESS',
      metadata: { createdUserId: user.id, role: user.role }
    });

    return user;
  }

  async updateUserRole(userId: string, newRole: UserRole, updatedBy: string): Promise<boolean> {
    // Only executives can change roles
    if (updatedBy !== 'executive') {
      await this.auditManager.logSecurityEvent({
        timestamp: new Date(),
        eventType: 'AUTHORIZATION',
        severity: 'HIGH',
        description: `Unauthorized role change attempt: ${userId}`,
        userId: updatedBy,
        metadata: { targetUserId: userId, newRole }
      });
      return false;
    }

    await this.auditManager.logAuditEvent({
      timestamp: new Date(),
      userId: updatedBy,
      action: 'UPDATE_USER_ROLE',
      resource: 'users',
      result: 'SUCCESS',
      metadata: { targetUserId: userId, newRole }
    });

    return true;
  }

  async deactivateUser(userId: string, deactivatedBy: string): Promise<boolean> {
    await this.auditManager.logAuditEvent({
      timestamp: new Date(),
      userId: deactivatedBy,
      action: 'DEACTIVATE_USER',
      resource: 'users',
      result: 'SUCCESS',
      metadata: { deactivatedUserId: userId }
    });

    return true;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getRolePermissions(role: UserRole): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  async getSecurityReport(): Promise<any> {
    const securityEvents = await this.auditManager.getSecurityEvents();
    const auditEvents = await this.auditManager.getAuditTrail();
    
    return {
      totalSecurityEvents: securityEvents.length,
      criticalEvents: securityEvents.filter(e => e.severity === 'CRITICAL').length,
      highSeverityEvents: securityEvents.filter(e => e.severity === 'HIGH').length,
      recentAuditEvents: auditEvents.slice(0, 10),
      securityScore: this.calculateSecurityScore(securityEvents)
    };
  }

  private calculateSecurityScore(events: any[]): number {
    const criticalCount = events.filter(e => e.severity === 'CRITICAL').length;
    const highCount = events.filter(e => e.severity === 'HIGH').length;
    const mediumCount = events.filter(e => e.severity === 'MEDIUM').length;
    
    // Calculate score (100 = perfect, 0 = critical issues)
    let score = 100;
    score -= criticalCount * 20;
    score -= highCount * 10;
    score -= mediumCount * 5;
    
    return Math.max(0, score);
  }
}
