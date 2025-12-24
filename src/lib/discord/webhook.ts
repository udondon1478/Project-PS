import { Product, ProductImage, Tag, ProductTag, Seller } from '@prisma/client';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

type ProductWithDetails = Product & {
  images: ProductImage[];
  productTags: (ProductTag & { tag: Tag })[];
  seller: Seller | null;
};

export async function sendDiscordNotification(product: ProductWithDetails) {
  if (!DISCORD_WEBHOOK_URL) {
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

    const payload = {
      username: "BOOTH Scraper Bot",
      avatar_url: "https://asset.booth.pm/static-images/booth_logo_icon_red.png", // Generic BOOTH icon or app icon
      embeds: [
        {
          title: `New Product: ${product.title}`,
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
              value: tags || 'None',
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

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to send Discord notification: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
}
