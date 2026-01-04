import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Report Feature Integration Tests', () => {
  const testEmail = 'test-report@example.com';
  const testTagName = 'TestIntegrationTag';

  const cleanup = async () => {
    // Clean up in correct order due to foreign key constraints
    await prisma.report.deleteMany();
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

    expect(reportWithRelations).toBeTruthy();
    if (!reportWithRelations) throw new Error('Report not found');
    expect(reportWithRelations.reporter).toBeTruthy();
    if (!reportWithRelations.reporter) throw new Error('Reporter not found');
    expect(reportWithRelations.reporter.id).toBe(user.id);
    expect(reportWithRelations.tag).toBeTruthy();
    expect(reportWithRelations.tag?.id).toBe(tag.id);
    expect(reportWithRelations.tag?.name).toBe(testTagName);
  }, 15000); // 15 seconds timeout for database operations
});
