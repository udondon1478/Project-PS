import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Report Feature Integration Tests', () => {
  const testEmail = 'test-report@example.com';
  const testTagName = 'TestIntegrationTag';

  const cleanup = async () => {
    // Clean up in correct order due to foreign key constraints
    await prisma.report.deleteMany({
      where: {
        reporter: { email: testEmail }
      }
    });
    await prisma.tag.deleteMany({
      where: { name: testTagName }
    });
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });
  };

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should create and resolve reports in the database', async () => {
    // 1. Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    // 2. Create test tag
    const tag = await prisma.tag.create({
      data: {
        name: testTagName,
        language: 'ja'
      },
    });

    // 3. Create a report directly in the database
    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: 'TAG',
        tagId: tag.id,
        reason: 'This is a test report',
        status: 'PENDING',
      },
    });

    // 4. Verify report was created successfully
    expect(report).toBeTruthy();
    expect(report.status).toBe('PENDING');
    expect(report.reason).toBe('This is a test report');
    expect(report.tagId).toBe(tag.id);
    expect(report.reporterId).toBe(user.id);

    // 5. Test resolving the report
    const resolvedReport = await prisma.report.update({
      where: { id: report.id },
      data: { status: 'RESOLVED' },
    });

    expect(resolvedReport.status).toBe('RESOLVED');

    // 6. Verify the report can be queried with its relationships
    const reportWithRelations = await prisma.report.findUnique({
      where: { id: report.id },
      include: {
        reporter: true,
        tag: true,
      },
    });

    expect(reportWithRelations).toBeDefined();
    expect(reportWithRelations?.reporter).toBeDefined();
    expect(reportWithRelations?.reporter?.id).toBe(user.id);
    expect(reportWithRelations?.tag).toBeDefined();
    expect(reportWithRelations?.tag?.id).toBe(tag.id);
    expect(reportWithRelations?.tag?.name).toBe(testTagName);
  }, 15000); // 15 seconds timeout for database operations

  it('should reject report creation with non-existent reporterId', async () => {
    const nonExistentUserId = 'non-existent-user-id-12345';

    await expect(
      prisma.report.create({
        data: {
          reporterId: nonExistentUserId,
          targetType: 'TAG',
          reason: 'Test report with invalid reporter',
          status: 'PENDING',
        },
      })
    ).rejects.toThrow();
  }, 15000);

  it('should reject report creation with non-existent tagId', async () => {
    // Create test user first
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    const nonExistentTagId = 'non-existent-tag-id-12345';

    await expect(
      prisma.report.create({
        data: {
          reporterId: user.id,
          targetType: 'TAG',
          tagId: nonExistentTagId,
          reason: 'Test report with invalid tag',
          status: 'PENDING',
        },
      })
    ).rejects.toThrow();
  }, 15000);

  it('should handle empty string reason', async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    // Create test tag
    const tag = await prisma.tag.create({
      data: {
        name: testTagName,
        language: 'ja'
      },
    });

    // Empty string reason should be accepted by DB (validation should be at app level)
    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: 'TAG',
        tagId: tag.id,
        reason: '',
        status: 'PENDING',
      },
    });

    expect(report.reason).toBe('');
  }, 15000);

  it('should handle report status transitions', async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    // Create test tag
    const tag = await prisma.tag.create({
      data: {
        name: testTagName,
        language: 'ja'
      },
    });

    // Create a report with PENDING status
    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: 'TAG',
        tagId: tag.id,
        reason: 'Status transition test',
        status: 'PENDING',
      },
    });

    expect(report.status).toBe('PENDING');

    // Transition to RESOLVED
    const resolvedReport = await prisma.report.update({
      where: { id: report.id },
      data: { status: 'RESOLVED' },
    });

    expect(resolvedReport.status).toBe('RESOLVED');

    // Transition back to PENDING (if allowed by business logic)
    const pendingAgainReport = await prisma.report.update({
      where: { id: report.id },
      data: { status: 'PENDING' },
    });

    expect(pendingAgainReport.status).toBe('PENDING');
  }, 15000)
});
