import { prisma } from '@/lib/prisma';
import { TagResolver } from './tag-resolver';
import { sendDiscordNotification } from '../discord/webhook';
import { validateUserExists } from '@/lib/user-validation';
import { getAvatarDefinitions } from '@/lib/avatars';

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
      const avatarDefinitions = await getAvatarDefinitions();
      const detectedAvatarTags: string[] = [];
      if (description) {
        for (const [itemId, avatarName] of Object.entries(avatarDefinitions)) {
          if (description.includes(itemId)) {
            // 自動付与は「アバター名」単体とする（関連性を示すため）
            // 「対応」タグはユーザーが選択できるようにサジェストに回す
            detectedAvatarTags.push(avatarName);
          }
        }
      }
      // --- Avatar Auto-Tagging End ---

      // 1. Resolve Tags
      const tagIds = await tagResolver.resolveTags(tags);
      const detectedAvatarTagIds = await tagResolver.resolveTags(detectedAvatarTags);

      // 2. Resolve Age Rating
      // Default to 'all_ages' (-> '全年齢') if not specified
      const ageTagId = await tagResolver.resolveAgeRating(ageRating || 'all_ages');

      // 3. Resolve 'other' category (Skipped as per original logic)

      // 4. Seller Upsert
      let seller = null;
      if (sellerUrl) {
        seller = await tx.seller.upsert({
          where: { sellerUrl },
          update: {
            name: sellerName,
            iconUrl: sellerIconUrl || undefined, // Only update if provided
          },
          create: {
            name: sellerName,
            sellerUrl,
            iconUrl: sellerIconUrl,
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

      return tx.product.create({
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
              // Filter out ageTagId to prevent duplicate official registration if it was also in tags
              ...tagIds
                .filter(id => id !== ageTagId)
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
              ] : [])
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
                return [...baseTags, ...detectedAvatarTagIds];
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
