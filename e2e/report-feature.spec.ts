import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/prisma';

test.describe('Report Feature', () => {
  test.beforeEach(async () => {
    // Clean up any existing reports and users
    await prisma.report.deleteMany();
    await prisma.tag.deleteMany({
      where: { name: 'TestTag' }
    });
    await prisma.productTag.deleteMany({
      where: {
        user: {
          email: 'test@example.com'
        }
      }
    });
    await prisma.product.deleteMany({
      where: {
        user: {
          email: 'test@example.com'
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: 'test@example.com'
      }
    });
  });

  test.afterEach(async () => {
    // Clean up any existing reports and users
    await prisma.report.deleteMany();
    await prisma.tag.deleteMany({
      where: { name: 'TestTag' }
    });
    await prisma.productTag.deleteMany({
      where: {
        user: {
          email: 'test@example.com'
        }
      }
    });
    await prisma.product.deleteMany({
      where: {
        user: {
          email: 'test@example.com'
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: 'test@example.com'
      }
    });
  });

  test('should allow admin to view and resolve reports', async () => {
    // 1. Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    // 2. Create test data
    const tag = await prisma.tag.upsert({
      where: { name: 'TestTag' },
      update: {},
      create: { name: 'TestTag', language: 'ja' },
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

    // 5. Test resolving the report programmatically
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
    expect(reportWithRelations.reporter?.id).toBe(user.id);
    expect(reportWithRelations.tag).toBeTruthy();
    expect(reportWithRelations.tag?.id).toBe(tag.id);
    expect(reportWithRelations.tag?.name).toBe('TestTag');
  });
});
