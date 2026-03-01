import { prisma } from '@/lib/prisma';
import { TagResolver } from './tag-resolver';
import { sendDiscordNotification } from '../discord/webhook';
import { validateUserExists } from '@/lib/user-validation';
import { getAvatarDefinitionsDirect } from '@/lib/avatars';
import { createAITagger, type AITagResult } from './ai-tagger';

/** 次の日本時間0:00 (UTC 15:00) を取得 */
function getNextMidnight(): Date {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const jstMidnight = new Date(jstNow);
  jstMidnight.setUTCHours(0, 0, 0, 0);
  if (jstMidnight <= jstNow) {
    jstMidnight.setUTCDate(jstMidnight.getUTCDate() + 1);
  }
  return new Date(jstMidnight.getTime() - jstOffset);
}

export interface ScrapedProductData {
  boothJpUrl: string;
  boothEnUrl?: string; // Optional, defaults to boothJpUrl if not provided
  title: string;
  description: string;
  price: number;
  images: string[];
  tags: string[];
  ageRating: string | null; // 'adult', 'r15', 'all_ages', or null
  sellerName: string;
  sellerUrl: string;
  sellerIconUrl?: string | null;
  publishedAt?: string | Date; // ISO string or Date object
  variations: {
    name: string;
    price: number;
    type: string;
    order: number;
    isMain: boolean;
  }[];
}

/**
 * Creates a new Product record from scraped data.
 * Handles:
 * - Seller upsert
 * - Tag resolution (including Age Rating)
 * - Product creation
 * - Image & Variation creation
 *
 * @param data Scraped product data
 * @param systemUserId ID of the system user acting as the creator
 */
export async function createProductFromScraper(data: ScrapedProductData, systemUserId: string) {
  if (!systemUserId) {
    throw new Error('systemUserId is required for creating products via scraper');
  }

  // Validate that the user exists in the database
  const userExists = await validateUserExists(systemUserId);

  if (!userExists) {
    throw new Error(`User with ID '${systemUserId}' not found in database. Please re-authenticate.`);
  }

  const {
    boothJpUrl,
    boothEnUrl,
    title,
    description,
    price,
    images,
    tags,
    ageRating,
    sellerName,
    sellerUrl,
    sellerIconUrl,
    publishedAt,
    variations
  } = data;

  /* 
    Transaction Wrapper: 
    Entire process is wrapped in a transaction to ensure atomicity.
    Tag creation, Seller upserts, and Product creation must all succeed or fail together.
  */
  try {
    const newProduct = await prisma.$transaction(async (tx) => {
      // Initialize TagResolver with transaction client
      const tagResolver = new TagResolver(tx);

      // --- Avatar Auto-Tagging Start ---
      const avatarDefinitions = await getAvatarDefinitionsDirect();
      const detectedAvatarTags: string[] = [];
      const normalizedDescription = description ? description.toLowerCase() : '';

      if (description) {
        for (const def of avatarDefinitions) {
          const { itemId, avatarName, aliases } = def;

          // ID check (exact or contained)
          const hasId = description.includes(itemId);

          // Name check (case insensitive)
          const hasName = normalizedDescription.includes(avatarName.toLowerCase());

          // Alias check (case insensitive)
          const hasAlias = aliases.some(alias =>
            normalizedDescription.includes(alias.toLowerCase())
          );

          if (hasId || hasName || hasAlias) {
            // 設定に基づいてタグを自動付与リストに追加
            // DBに設定されたタグリストがあればそれを使用
            if (def.suggestedTags && def.suggestedTags.length > 0) {
                detectedAvatarTags.push(...def.suggestedTags);
            } else {
                // 設定がない場合は従来通り「アバター名」単体を付与
                detectedAvatarTags.push(avatarName);
            }
          }
        }
      }
      // --- Avatar Auto-Tagging End ---

      // --- AI Auto-Tagging Start ---
      let aiTags: AITagResult | null = null;
      const config = await tx.scraperConfig.findFirst();
      if (config?.enableAITagging) {
        // 日次コストリセットチェック
        const now = new Date();
        if (config.aiCostResetAt && config.aiCostResetAt < now) {
          await tx.scraperConfig.update({
            where: { id: config.id },
            data: { aiTodayCostYen: 0, aiCostResetAt: getNextMidnight() },
          });
          config.aiTodayCostYen = 0;
        }

        if (config.aiTodayCostYen < config.aiDailyCostLimitYen) {
          try {
            const aiTagger = createAITagger(
              config.aiProvider,
              config.aiModel,
              config.aiMaxImagesPerProduct,
              config.aiMaxImageSize,
            );
            aiTags = await aiTagger.analyzeProduct({
              title,
              description: description || '',
              imageUrls: images.slice(0, config.aiMaxImagesPerProduct),
              ageRating,
            });
            // コスト記録
            await tx.scraperConfig.update({
              where: { id: config.id },
              data: {
                aiTodayCostYen: { increment: aiTags.estimatedCostYen },
                ...(!config.aiCostResetAt ? { aiCostResetAt: getNextMidnight() } : {}),
              },
            });
          } catch (error) {
            console.warn('[ProductCreator] AI tagging failed, continuing with BOOTH tags only:', error);
          }
        }
      }
      // --- AI Auto-Tagging End ---

      // 1. Resolve Tags
      const tagIds = await tagResolver.resolveTags(tags);
      const detectedAvatarTagIds = await tagResolver.resolveTags(detectedAvatarTags);

      // 2. Resolve Age Rating
      // Default to 'all_ages' (-> '全年齢') if not specified
      const ageTagId = await tagResolver.resolveAgeRating(ageRating || 'all_ages');

      // 3. Resolve 'other' category (Skipped as per original logic)

      // 4. Seller Upsert & Creator Tag
      let seller = null;
      let creatorTagId: string | null = null;
      
      if (sellerUrl) {
        // Resolve creator tag first
        try {
            creatorTagId = await tagResolver.resolveCreatorTag(sellerName);
        } catch (e) {
            console.warn(`Failed to resolve creator tag for ${sellerName}:`, e);
        }

        seller = await tx.seller.upsert({
          where: { sellerUrl },
          update: {
            name: sellerName,
            iconUrl: sellerIconUrl || undefined, // Only update if provided
            ...(creatorTagId ? { tagId: creatorTagId } : {}),
          },
          create: {
            name: sellerName,
            sellerUrl,
            iconUrl: sellerIconUrl,
            ...(creatorTagId ? { tagId: creatorTagId } : {}),
          },
        });
      }

      // 5. Product Creation
      // Defaulting publishedAt to now if not provided
      const publishedDate = publishedAt ? new Date(publishedAt) : new Date();
      
      // Use parsed variations or fallback
      const productVariations = (variations && variations.length > 0) ? variations : [{
        name: 'Standard',
        price: price,
        type: 'download',
        order: 0,
        isMain: true
      }];

      const product = await tx.product.create({
        data: {
          boothJpUrl,
          boothEnUrl: boothEnUrl || boothJpUrl, // Fallback
          title,
          description,
          lowPrice: price,
          highPrice: price,
          publishedAt: publishedDate,
          user: {
            connect: { id: systemUserId }
          },
          ...(seller && {
            seller: {
              connect: { id: seller.id }
            }
          }),
          images: {
            create: images.map((url, index) => ({
              imageUrl: url,
              isMain: index === 0,
              order: index,
            })),
          },
          productTags: {
            create: [
              // 1. Normal Scraped Tags -> Official
              // Filter out ageTagId and creatorTagId to prevent duplicate
              ...tagIds
                .filter(id => id !== ageTagId && id !== creatorTagId)
                .map(tagId => ({
                  tagId,
                  userId: systemUserId,
                  isOfficial: true,
                })),
              // 1.5 Detected Avatar Tags -> Unofficial (Proprietary)
              ...detectedAvatarTagIds.map(tagId => ({
                tagId,
                userId: systemUserId,
                isOfficial: false,
              })),
              // 2. Age Rating -> Both Official AND Proprietary
              ...(ageTagId ? [
                {
                    tagId: ageTagId,
                    userId: systemUserId,
                    isOfficial: true, // Official Age Rating
                },
                {
                    tagId: ageTagId,
                    userId: systemUserId,
                    isOfficial: false, // Proprietary Age Rating (for initial state)
                }
              ] : []),
              // 3. Creator Tag -> Official
              ...(creatorTagId ? [{
                  tagId: creatorTagId,
                  userId: systemUserId,
                  isOfficial: true,
              }] : [])
            ],
          },
          variations: {
            create: productVariations.map(v => ({
              name: v.name,
              price: v.price,
              type: v.type,
              order: v.order,
              isMain: v.isMain,
            })),
          },
          tagEditHistory: {
            create: {
              editorId: systemUserId,
              version: 1,
              addedTags: (() => {
                const baseTags = ageTagId && !tagIds.includes(ageTagId) ? [...tagIds, ageTagId] : tagIds;
                // Add creatorTagId if it exists and isn't already in baseTags
                const allBaseTags = creatorTagId && !baseTags.includes(creatorTagId)
                  ? [...baseTags, creatorTagId]
                  : baseTags;
                return [...new Set([...allBaseTags, ...detectedAvatarTagIds])];
              })(),
              removedTags: [],
              keptTags: [],
              comment: 'Scraper Auto-Import',
            },
          },
        },
        include: {
          images: true,
          productTags: {
            include: {
              tag: true,
            }
          },
          variations: true,
          seller: true,
        }
      });

      // --- AI Tags: 商品作成後にAIタグを追加 ---
      if (aiTags) {
        const aiConfidenceThreshold = config?.aiConfidenceThreshold ?? 0.5;
        for (const suggestion of aiTags.tags) {
          if (suggestion.confidence < aiConfidenceThreshold) continue;
          try {
            const resolvedTagId = await tagResolver.resolveTagWithCategory(
              suggestion.name,
              suggestion.category,
            );
            await tx.productTag.create({
              data: {
                productId: product.id,
                tagId: resolvedTagId,
                source: 'ai',
                confidence: suggestion.confidence,
                isOfficial: false,
              },
            });
          } catch (e) {
            // 重複や解決失敗はスキップ
            console.warn(`[ProductCreator] AI tag creation failed for "${suggestion.name}":`, e);
          }
        }

        // 美学カテゴリタグも保存
        if (aiTags.aestheticCategory) {
          try {
            const aestheticTagId = await tagResolver.resolveTagWithCategory(
              aiTags.aestheticCategory,
              'aesthetic',
            );
            await tx.productTag.create({
              data: {
                productId: product.id,
                tagId: aestheticTagId,
                source: 'ai',
                confidence: 1.0,
                isOfficial: false,
              },
            });
          } catch (e) {
            console.warn(`[ProductCreator] Aesthetic tag creation failed:`, e);
          }
        }
      }
      // --- AI Tags End ---

      return product;
    });

    // Persistence Verification
    // Feature flag driven: defaults to false if not explicitly enabled
    // To enable in dev: ENABLE_PERSISTENCE_VERIFY=true
    if (process.env.ENABLE_PERSISTENCE_VERIFY === 'true') {
      try {
        const persistedProduct = await prisma.product.findUnique({
           where: { id: newProduct.id },
           select: { id: true, boothJpUrl: true }
        });
        
        if (persistedProduct) {
           console.log(`[ProductCreator] Verified persistence for product: ${persistedProduct.id} (${persistedProduct.boothJpUrl})`);
        } else {
           console.error(`[ProductCreator] CRITICAL: Product returned from transaction but NOT found in DB immediately after! ID: ${newProduct.id}, URL: ${boothJpUrl}`);
        }
      } catch (verifyError) {
          console.error(`[ProductCreator] Verification query failed for product ${newProduct.id}:`, verifyError);
      }
    }

    // Send Discord Notification (Fire-and-forget) - Outside Transaction
    // Pass the object from the transaction to be safe, or fetch fresh if needed for details not returned?
    // The transaction returns the product with includes, so newProduct is good.
    sendDiscordNotification(newProduct).catch(err => {
        console.error('Failed to fire Discord notification async:', err);
    });

    return newProduct;
  } catch (error) {
    console.error(`Failed to create product ${boothJpUrl}:`, error);
    throw error;
  }
}
