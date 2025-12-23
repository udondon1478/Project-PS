
import { prisma } from '@/lib/prisma';
import { TagResolver } from './tag-resolver';
import { sendDiscordNotification } from '../discord/webhook';

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
    publishedAt
  } = data;

  const tagResolver = new TagResolver();

  // 1. Resolve Tags
  const tagIds = await tagResolver.resolveTags(tags);

  // 2. Resolve Age Rating
  if (ageRating) {
    const ageTagId = await tagResolver.resolveAgeRating(ageRating);
    if (ageTagId) {
       // Avoid duplicates if 'adult' was also in tags list (unlikely but possible)
       if (!tagIds.includes(ageTagId)) {
         tagIds.push(ageTagId);
       }
    }
  }

  // 3. Resolve 'other' category for generic tags if implementation details require it
  // (Note: TagResolver in phase 1 implementation handles creation but didn't strictly link to 'other' category 
  // unless modified. Keeping consistenty with provided TagResolver.)

  // 4. Seller Upsert
  let seller = null;
  if (sellerUrl) {
    seller = await prisma.seller.upsert({
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
  
  // Default variation (assuming single price for now)
  const variations = [{
    name: 'Standard',
    price: price,
    type: 'download', // Default assumption
    order: 0,
    isMain: true
  }];

  try {
    const newProduct = await prisma.product.create({
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
          create: tagIds.map(tagId => ({
            tagId,
            userId: systemUserId,
          })),
        },
        variations: {
          create: variations.map(v => ({
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
            addedTags: tagIds,
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

    // Send Discord Notification (Fire-and-forget)
    sendDiscordNotification(newProduct).catch(err => {
        console.error('Failed to fire Discord notification async:', err);
    });

    return newProduct;
  } catch (error) {
    console.error(`Failed to create product ${boothJpUrl}:`, error);
    throw error;
  }
}
