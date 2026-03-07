import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('TagProposal Feature Integration Tests', () => {
  const testEmail = 'test-proposal@example.com';
  const testTagName = 'TestProposalTag';
  const testTranslationTagName = 'TestTranslationTag';
  const testCategoryName = 'TestProposalCategory';

  const cleanup = async () => {
    // Clean up in reverse dependency order
    await prisma.tagProposal.deleteMany({
      where: {
        proposer: { email: testEmail },
      },
    }).catch(() => {
      // tagProposal table may not exist yet during TDD
    });
    await prisma.tag.deleteMany({
      where: {
        name: { in: [testTagName, testTranslationTagName] },
      },
    });
    await prisma.tagCategory.deleteMany({
      where: { name: testCategoryName },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  };

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should create a CATEGORY proposal in the database', async () => {
    // Given: user, tag, and category exist
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    const tag = await prisma.tag.create({
      data: { name: testTagName, language: 'ja' },
    });

    const category = await prisma.tagCategory.create({
      data: { name: testCategoryName, color: '#FF0000' },
    });

    // When: a category proposal is created
    const proposal = await prisma.tagProposal.create({
      data: {
        proposerId: user.id,
        tagId: tag.id,
        type: 'CATEGORY',
        categoryId: category.id,
        status: 'PENDING',
      },
    });

    // Then: proposal is saved correctly
    expect(proposal).toBeTruthy();
    expect(proposal.type).toBe('CATEGORY');
    expect(proposal.status).toBe('PENDING');
    expect(proposal.tagId).toBe(tag.id);
    expect(proposal.proposerId).toBe(user.id);
    expect(proposal.categoryId).toBe(category.id);
  }, 15000);

  it('should create a TRANSLATION proposal with existing tag', async () => {
    // Given: user and two tags exist
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    const sourceTag = await prisma.tag.create({
      data: { name: testTagName, language: 'ja' },
    });

    const translationTag = await prisma.tag.create({
      data: { name: testTranslationTagName, language: 'en' },
    });

    // When: a translation proposal is created referencing existing tag
    const proposal = await prisma.tagProposal.create({
      data: {
        proposerId: user.id,
        tagId: sourceTag.id,
        type: 'TRANSLATION',
        existingTagId: translationTag.id,
        status: 'PENDING',
      },
    });

    // Then: proposal references both tags
    expect(proposal.type).toBe('TRANSLATION');
    expect(proposal.tagId).toBe(sourceTag.id);
    expect(proposal.existingTagId).toBe(translationTag.id);
  }, 15000);

  it('should create a TRANSLATION proposal with new tag name', async () => {
    // Given: user and source tag exist
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    const tag = await prisma.tag.create({
      data: { name: testTagName, language: 'ja' },
    });

    // When: a translation proposal with new tag name is created
    const proposal = await prisma.tagProposal.create({
      data: {
        proposerId: user.id,
        tagId: tag.id,
        type: 'TRANSLATION',
        newTagName: 'hat',
        language: 'en',
        status: 'PENDING',
      },
    });

    // Then: proposal stores new tag name and language
    expect(proposal.type).toBe('TRANSLATION');
    expect(proposal.newTagName).toBe('hat');
    expect(proposal.language).toBe('en');
    expect(proposal.existingTagId).toBeNull();
  }, 15000);

  it('should create an IMPLICATION proposal', async () => {
    // Given: user and two tags exist
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    const implyingTag = await prisma.tag.create({
      data: { name: testTagName, language: 'ja' },
    });

    const impliedTag = await prisma.tag.create({
      data: { name: testTranslationTagName, language: 'ja' },
    });

    // When: an implication proposal is created
    const proposal = await prisma.tagProposal.create({
      data: {
        proposerId: user.id,
        tagId: implyingTag.id,
        type: 'IMPLICATION',
        existingTagId: impliedTag.id,
        status: 'PENDING',
      },
    });

    // Then: proposal is saved with IMPLICATION type
    expect(proposal.type).toBe('IMPLICATION');
    expect(proposal.tagId).toBe(implyingTag.id);
    expect(proposal.existingTagId).toBe(impliedTag.id);
  }, 15000);

  it('should query proposal with its relationships', async () => {
    // Given: a proposal exists
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    const tag = await prisma.tag.create({
      data: { name: testTagName, language: 'ja' },
    });

    const category = await prisma.tagCategory.create({
      data: { name: testCategoryName, color: '#00FF00' },
    });

    await prisma.tagProposal.create({
      data: {
        proposerId: user.id,
        tagId: tag.id,
        type: 'CATEGORY',
        categoryId: category.id,
        reason: 'This tag fits the category',
        status: 'PENDING',
      },
    });

    // When: querying with relations
    const proposals = await prisma.tagProposal.findMany({
      where: { proposerId: user.id },
      include: {
        proposer: true,
        tag: true,
        category: true,
      },
    });

    // Then: relationships are loaded
    expect(proposals).toHaveLength(1);
    const proposal = proposals[0];
    expect(proposal.proposer).toBeDefined();
    expect(proposal.proposer?.id).toBe(user.id);
    expect(proposal.tag).toBeDefined();
    expect(proposal.tag.name).toBe(testTagName);
    expect(proposal.category).toBeDefined();
    expect(proposal.category?.name).toBe(testCategoryName);
    expect(proposal.reason).toBe('This tag fits the category');
  }, 15000);

  it('should reject proposal with non-existent proposerId', async () => {
    // Given: non-existent user
    const tag = await prisma.tag.create({
      data: { name: testTagName, language: 'ja' },
    });

    // When/Then: foreign key constraint prevents creation
    await expect(
      prisma.tagProposal.create({
        data: {
          proposerId: 'non-existent-user-id',
          tagId: tag.id,
          type: 'CATEGORY',
          status: 'PENDING',
        },
      })
    ).rejects.toThrow();
  }, 15000);

  it('should reject proposal with non-existent tagId', async () => {
    // Given: user exists but tag does not
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    // When/Then: foreign key constraint prevents creation
    await expect(
      prisma.tagProposal.create({
        data: {
          proposerId: user.id,
          tagId: 'non-existent-tag-id',
          type: 'CATEGORY',
          status: 'PENDING',
        },
      })
    ).rejects.toThrow();
  }, 15000);

  it('should handle proposal status transitions', async () => {
    // Given: a pending proposal
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    const tag = await prisma.tag.create({
      data: { name: testTagName, language: 'ja' },
    });

    const proposal = await prisma.tagProposal.create({
      data: {
        proposerId: user.id,
        tagId: tag.id,
        type: 'CATEGORY',
        status: 'PENDING',
      },
    });
    expect(proposal.status).toBe('PENDING');

    // When: status is updated to APPROVED
    const approved = await prisma.tagProposal.update({
      where: { id: proposal.id },
      data: { status: 'APPROVED' },
    });

    // Then: status reflects the change
    expect(approved.status).toBe('APPROVED');

    // When: create another and reject it
    const proposal2 = await prisma.tagProposal.create({
      data: {
        proposerId: user.id,
        tagId: tag.id,
        type: 'IMPLICATION',
        newTagName: 'test-implied',
        language: 'ja',
        status: 'PENDING',
      },
    });

    const rejected = await prisma.tagProposal.update({
      where: { id: proposal2.id },
      data: { status: 'REJECTED' },
    });

    expect(rejected.status).toBe('REJECTED');
  }, 15000);

  it('should store optional reason field', async () => {
    // Given: user and tag
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        termsAgreedAt: new Date(),
      },
    });

    const tag = await prisma.tag.create({
      data: { name: testTagName, language: 'ja' },
    });

    // When: proposal without reason
    const withoutReason = await prisma.tagProposal.create({
      data: {
        proposerId: user.id,
        tagId: tag.id,
        type: 'CATEGORY',
        status: 'PENDING',
      },
    });

    // Then: reason is null
    expect(withoutReason.reason).toBeNull();

    // When: proposal with reason
    const withReason = await prisma.tagProposal.create({
      data: {
        proposerId: user.id,
        tagId: tag.id,
        type: 'IMPLICATION',
        existingTagId: tag.id,
        reason: 'Because these tags are related',
        status: 'PENDING',
      },
    });

    // Then: reason is stored
    expect(withReason.reason).toBe('Because these tags are related');
  }, 15000);
});
