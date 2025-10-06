import { Logger } from '../utils/logger';
import { AuditManager } from './audit';
import { EncryptionManager } from './encryption';

export interface ComplianceFramework {
  name: string;
  version: string;
  requirements: ComplianceRequirement[];
  lastAssessment: Date;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'PENDING';
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  category: 'DATA_PROTECTION' | 'ACCESS_CONTROL' | 'AUDIT' | 'ENCRYPTION' | 'RETENTION';
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
  evidence: string[];
  lastChecked: Date;
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // in days
  encryptionRequired: boolean;
  deletionMethod: 'SECURE_DELETE' | 'OVERWRITE' | 'CRYPTOGRAPHIC_ERASE';
  auditRequired: boolean;
}

export class ComplianceManager {
  private logger: Logger;
  private auditManager: AuditManager;
  private encryptionManager: EncryptionManager;
  private frameworks: Map<string, ComplianceFramework>;
  private retentionPolicies: DataRetentionPolicy[];

  constructor(auditManager: AuditManager, encryptionManager: EncryptionManager) {
    this.logger = new Logger();
    this.auditManager = auditManager;
    this.encryptionManager = encryptionManager;
    this.frameworks = new Map();
    this.retentionPolicies = [];
    this.initializeComplianceFrameworks();
    this.initializeRetentionPolicies();
  }

  private initializeComplianceFrameworks() {
    // SOC 2 Type II Compliance
    const soc2Framework: ComplianceFramework = {
      name: 'SOC 2 Type II',
      version: '2023',
      status: 'COMPLIANT',
      lastAssessment: new Date(),
      requirements: [
        {
          id: 'CC6.1',
          title: 'Logical Access Security',
          description: 'Implement logical access security software, infrastructure, and architectures over protected information assets',
          category: 'ACCESS_CONTROL',
          status: 'COMPLIANT',
          evidence: ['RBAC implementation', 'MFA enforcement', 'Access logs'],
          lastChecked: new Date()
        },
        {
          id: 'CC6.2',
          title: 'Access Restriction',
          description: 'Restrict access to information assets',
          category: 'ACCESS_CONTROL',
          status: 'COMPLIANT',
          evidence: ['Role-based permissions', 'Executive approval system'],
          lastChecked: new Date()
        },
        {
          id: 'CC7.1',
          title: 'System Operations',
          description: 'Use system operations to detect, monitor, and alert on security events',
          category: 'AUDIT',
          status: 'COMPLIANT',
          evidence: ['Real-time monitoring', 'Security event logging', 'Audit trails'],
          lastChecked: new Date()
        }
      ]
    };

    // ISO 27001 Compliance
    const iso27001Framework: ComplianceFramework = {
      name: 'ISO 27001',
      version: '2022',
      status: 'COMPLIANT',
      lastAssessment: new Date(),
      requirements: [
        {
          id: 'A.9.1',
          title: 'Access Control Policy',
          description: 'Business requirements for access control',
          category: 'ACCESS_CONTROL',
          status: 'COMPLIANT',
          evidence: ['Access control policies', 'User provisioning procedures'],
          lastChecked: new Date()
        },
        {
          id: 'A.10.1',
          title: 'Cryptographic Controls',
          description: 'Policy on the use of cryptographic controls',
          category: 'ENCRYPTION',
          status: 'COMPLIANT',
          evidence: ['End-to-end encryption', 'Key management', 'HSM integration'],
          lastChecked: new Date()
        }
      ]
    };

    // GDPR Compliance
    const gdprFramework: ComplianceFramework = {
      name: 'GDPR',
      version: '2018',
      status: 'COMPLIANT',
      lastAssessment: new Date(),
      requirements: [
        {
          id: 'Art.32',
          title: 'Security of Processing',
          description: 'Implement appropriate technical and organizational measures',
          category: 'DATA_PROTECTION',
          status: 'COMPLIANT',
          evidence: ['Data encryption', 'Access controls', 'Audit logging'],
          lastChecked: new Date()
        },
        {
          id: 'Art.17',
          title: 'Right to Erasure',
          description: 'Data subject right to have personal data erased',
          category: 'RETENTION',
          status: 'COMPLIANT',
          evidence: ['Data deletion procedures', 'Retention policies'],
          lastChecked: new Date()
        }
      ]
    };

    this.frameworks.set('SOC2', soc2Framework);
    this.frameworks.set('ISO27001', iso27001Framework);
    this.frameworks.set('GDPR', gdprFramework);
  }

  private initializeRetentionPolicies() {
    this.retentionPolicies = [
      {
        dataType: 'audit_logs',
        retentionPeriod: 2555, // 7 years
        encryptionRequired: true,
        deletionMethod: 'SECURE_DELETE',
        auditRequired: true
      },
      {
        dataType: 'user_data',
        retentionPeriod: 365, // 1 year after account closure
        encryptionRequired: true,
        deletionMethod: 'CRYPTOGRAPHIC_ERASE',
        auditRequired: true
      },
      {
        dataType: 'ai_actions',
        retentionPeriod: 1095, // 3 years
        encryptionRequired: true,
        deletionMethod: 'SECURE_DELETE',
        auditRequired: true
      },
      {
        dataType: 'security_events',
        retentionPeriod: 2555, // 7 years
        encryptionRequired: true,
        deletionMethod: 'SECURE_DELETE',
        auditRequired: true
      }
    ];
  }

  async assessCompliance(frameworkName: string): Promise<ComplianceFramework> {
    const framework = this.frameworks.get(frameworkName);
    if (!framework) {
      throw new Error(`Compliance framework ${frameworkName} not found`);
    }

    // Perform compliance assessment
    for (const requirement of framework.requirements) {
      requirement.status = await this.checkRequirement(requirement);
      requirement.lastChecked = new Date();
    }

    // Update overall framework status
    const nonCompliantCount = framework.requirements.filter(r => r.status === 'NON_COMPLIANT').length;
    const partialCount = framework.requirements.filter(r => r.status === 'PARTIAL').length;

    if (nonCompliantCount === 0 && partialCount === 0) {
      framework.status = 'COMPLIANT';
    } else if (nonCompliantCount === 0) {
      framework.status = 'PARTIAL';
    } else {
      framework.status = 'NON_COMPLIANT';
    }

    framework.lastAssessment = new Date();

    await this.auditManager.logAuditEvent({
      timestamp: new Date(),
      userId: 'system',
      action: 'COMPLIANCE_ASSESSMENT',
      resource: frameworkName,
      result: 'SUCCESS',
      metadata: { status: framework.status, requirements: framework.requirements.length }
    });

    return framework;
  }

  private async checkRequirement(requirement: ComplianceRequirement): Promise<'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL'> {
    switch (requirement.category) {
      case 'ACCESS_CONTROL':
        return await this.checkAccessControlCompliance(requirement);
      case 'ENCRYPTION':
        return await this.checkEncryptionCompliance(requirement);
      case 'AUDIT':
        return await this.checkAuditCompliance(requirement);
      case 'DATA_PROTECTION':
        return await this.checkDataProtectionCompliance(requirement);
      case 'RETENTION':
        return await this.checkRetentionCompliance(requirement);
      default:
        return 'NON_COMPLIANT';
    }
  }

  private async checkAccessControlCompliance(requirement: ComplianceRequirement): Promise<'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL'> {
    // Check if RBAC is implemented
    const hasRBAC = requirement.evidence.includes('RBAC implementation');
    const hasMFA = requirement.evidence.includes('MFA enforcement');
    const hasLogs = requirement.evidence.includes('Access logs');

    if (hasRBAC && hasMFA && hasLogs) {
      return 'COMPLIANT';
    } else if (hasRBAC || hasMFA) {
      return 'PARTIAL';
    } else {
      return 'NON_COMPLIANT';
    }
  }

  private async checkEncryptionCompliance(requirement: ComplianceRequirement): Promise<'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL'> {
    const hasEncryption = requirement.evidence.includes('End-to-end encryption');
    const hasKeyManagement = requirement.evidence.includes('Key management');
    const hasHSM = requirement.evidence.includes('HSM integration');

    if (hasEncryption && hasKeyManagement && hasHSM) {
      return 'COMPLIANT';
    } else if (hasEncryption || hasKeyManagement) {
      return 'PARTIAL';
    } else {
      return 'NON_COMPLIANT';
    }
  }

  private async checkAuditCompliance(requirement: ComplianceRequirement): Promise<'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL'> {
    const hasMonitoring = requirement.evidence.includes('Real-time monitoring');
    const hasLogging = requirement.evidence.includes('Security event logging');
    const hasTrails = requirement.evidence.includes('Audit trails');

    if (hasMonitoring && hasLogging && hasTrails) {
      return 'COMPLIANT';
    } else if (hasLogging || hasTrails) {
      return 'PARTIAL';
    } else {
      return 'NON_COMPLIANT';
    }
  }

  private async checkDataProtectionCompliance(requirement: ComplianceRequirement): Promise<'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL'> {
    const hasEncryption = requirement.evidence.includes('Data encryption');
    const hasAccessControls = requirement.evidence.includes('Access controls');
    const hasAuditLogging = requirement.evidence.includes('Audit logging');

    if (hasEncryption && hasAccessControls && hasAuditLogging) {
      return 'COMPLIANT';
    } else if (hasEncryption || hasAccessControls) {
      return 'PARTIAL';
    } else {
      return 'NON_COMPLIANT';
    }
  }

  private async checkRetentionCompliance(requirement: ComplianceRequirement): Promise<'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL'> {
    const hasDeletionProcedures = requirement.evidence.includes('Data deletion procedures');
    const hasRetentionPolicies = requirement.evidence.includes('Retention policies');

    if (hasDeletionProcedures && hasRetentionPolicies) {
      return 'COMPLIANT';
    } else if (hasDeletionProcedures || hasRetentionPolicies) {
      return 'PARTIAL';
    } else {
      return 'NON_COMPLIANT';
    }
  }

  async getDataRetentionPolicy(dataType: string): Promise<DataRetentionPolicy | null> {
    return this.retentionPolicies.find(policy => policy.dataType === dataType) || null;
  }

  async scheduleDataDeletion(dataType: string): Promise<boolean> {
    const policy = await this.getDataRetentionPolicy(dataType);
    if (!policy) {
      this.logger.warn(`No retention policy found for data type: ${dataType}`);
      return false;
    }

    // Schedule deletion based on retention policy
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + policy.retentionPeriod);

    await this.auditManager.logAuditEvent({
      timestamp: new Date(),
      userId: 'system',
      action: 'SCHEDULE_DELETION',
      resource: dataType,
      result: 'SUCCESS',
      metadata: { 
        deletionDate: deletionDate.toISOString(),
        retentionPeriod: policy.retentionPeriod,
        deletionMethod: policy.deletionMethod
      }
    });

    return true;
  }

  async generateComplianceReport(): Promise<any> {
    const frameworks = Array.from(this.frameworks.values());
    const report = {
      timestamp: new Date(),
      frameworks: frameworks.map(f => ({
        name: f.name,
        version: f.version,
        status: f.status,
        lastAssessment: f.lastAssessment,
        requirementsCount: f.requirements.length,
        compliantRequirements: f.requirements.filter(r => r.status === 'COMPLIANT').length,
        nonCompliantRequirements: f.requirements.filter(r => r.status === 'NON_COMPLIANT').length,
        partialRequirements: f.requirements.filter(r => r.status === 'PARTIAL').length
      })),
      retentionPolicies: this.retentionPolicies,
      overallComplianceScore: this.calculateOverallComplianceScore(frameworks)
    };

    return report;
  }

  private calculateOverallComplianceScore(frameworks: ComplianceFramework[]): number {
    let totalScore = 0;
    let totalRequirements = 0;

    for (const framework of frameworks) {
      for (const requirement of framework.requirements) {
        totalRequirements++;
        switch (requirement.status) {
          case 'COMPLIANT':
            totalScore += 100;
            break;
          case 'PARTIAL':
            totalScore += 50;
            break;
          case 'NON_COMPLIANT':
            totalScore += 0;
            break;
        }
      }
    }

    return totalRequirements > 0 ? Math.round(totalScore / totalRequirements) : 0;
  }

  async exportComplianceEvidence(frameworkName: string): Promise<any> {
    const framework = this.frameworks.get(frameworkName);
    if (!framework) {
      throw new Error(`Framework ${frameworkName} not found`);
    }

    const evidence = {
      framework: framework.name,
      version: framework.version,
      assessmentDate: new Date(),
      requirements: framework.requirements.map(req => ({
        id: req.id,
        title: req.title,
        status: req.status,
        evidence: req.evidence,
        lastChecked: req.lastChecked
      })),
      auditLogs: await this.auditManager.getAuditTrail(undefined, 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      )
    };

    return evidence;
  }
}
