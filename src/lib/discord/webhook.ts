import { Product, ProductImage, Tag, ProductTag, Seller } from '@prisma/client';

// const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

type ProductWithDetails = Product & {
  images: ProductImage[];
  productTags: (ProductTag & { tag: Tag })[];
  seller: Seller | null;
};

export async function sendDiscordNotification(product: ProductWithDetails) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL is not set. Skipping Discord notification.');
    return;
  }

  try {
    const mainImage = product.images.find(img => img.isMain) || product.images[0];
    const tags = product.productTags.map(pt => pt.tag.name).join(', ');
    
    // Limits
    const descriptionLimit = 200;
    const truncatedDescription = product.description 
      ? (product.description.length > descriptionLimit ? product.description.substring(0, descriptionLimit) + '...' : product.description)
      : 'No description';

    // Title Truncation
    // Discord embed title limit is 256 characters.
    // Prefix "New Product: " is 13 characters.
    const titlePrefix = "New Product: ";
    const maxTitleLength = 256 - titlePrefix.length; // 243
    let displayTitle = product.title;
    
    if (displayTitle.length > maxTitleLength) {
      const ellipsis = '...';
      const targetLen = maxTitleLength - ellipsis.length;
      displayTitle = displayTitle.substring(0, targetLen);
      // Avoid splitting surrogate pairs (remove trailing high surrogate)
      if (/[\uD800-\uDBFF]$/.test(displayTitle)) {
        displayTitle = displayTitle.slice(0, -1);
      }
      displayTitle += ellipsis;
    }

    let tagsValue = tags || 'None';
    if (tagsValue.length > 1024) {
      tagsValue = tagsValue.substring(0, 1021) + '...';
    }

    const payload = {
      username: "BOOTH Scraper Bot",
      avatar_url: "https://asset.booth.pm/static-images/booth_logo_icon_red.png", // Generic BOOTH icon or app icon
      embeds: [
        {
          title: `${titlePrefix}${displayTitle}`,
          url: product.boothJpUrl,
          color: 0xFC4D50, // BOOTH Red-ish
          description: truncatedDescription,
          fields: [
            {
              name: 'Price',
              value: `¥${product.lowPrice.toLocaleString()}`,
              inline: true,
            },
            {
              name: 'Seller',
              value: product.seller?.name || 'Unknown',
              inline: true,
            },
            {
              name: 'Tags',
              value: tagsValue,
              inline: false,
            }
          ],
          image: mainImage ? { url: mainImage.imageUrl } : undefined,
          footer: {
            text: `Registered at ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
          },
          timestamp: new Date().toISOString(),
        }
      ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error(`Failed to send Discord notification: ${response.status} ${response.statusText}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
}
