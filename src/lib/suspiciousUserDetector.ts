import { prisma } from "./prisma";
import { subHours } from "date-fns";

const MIN_EDIT_COUNT = parseInt(process.env.MIN_EDIT_COUNT || "10", 10);
const HIGH_EDIT_FREQUENCY_THRESHOLD = parseInt(
  process.env.HIGH_EDIT_FREQUENCY_THRESHOLD || "30",
  10
); // edits per hour
const LOW_RATING_PERCENTAGE_THRESHOLD = parseFloat(
  process.env.LOW_RATING_PERCENTAGE_THRESHOLD || "0.5"
); // 50%

export async function detectSuspiciousUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        tagEdits: {
          some: {}, // Ensure user has at least one edit
        },
      },
      include: {
        tagEdits: {
          select: {
            score: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const suspiciousUsers = [];

    for (const user of users) {
      if (user.tagEdits.length < MIN_EDIT_COUNT) {
        continue;
      }

      let reason = "";

      // 1. Check for high frequency of edits in the last hour
      const oneHourAgo = subHours(new Date(), 1);
      const recentEdits = user.tagEdits.filter(
        (edit) => new Date(edit.createdAt) > oneHourAgo
      );
      if (recentEdits.length >= HIGH_EDIT_FREQUENCY_THRESHOLD) {
        reason += `High edit frequency: ${recentEdits.length} edits in the last hour. `;
      }

      // 2. Check for high percentage of low-rated edits (in last 50 edits)
      const editsForRatingCheck = user.tagEdits.slice(0, 50);
      const lowRatedEdits = editsForRatingCheck.filter(
        (edit) => edit.score < 0
      );
      const lowRatedPercentage =
        lowRatedEdits.length / editsForRatingCheck.length;
      if (lowRatedPercentage >= LOW_RATING_PERCENTAGE_THRESHOLD) {
        reason += `High percentage of low-rated edits: ${(
          lowRatedPercentage * 100
        ).toFixed(0)}% of the last ${
          editsForRatingCheck.length
        } edits were downvoted.`;
      }

      if (reason) {
        suspiciousUsers.push({
          id: user.id,
          isSuspicious: true,
          suspicionReason: reason.trim(),
        });
      } else if (user.isSuspicious) {
        // If user is no longer suspicious, mark them as not suspicious
        suspiciousUsers.push({
          id: user.id,
          isSuspicious: false,
          suspicionReason: null,
        });
      }
    }

    // Batch update users
    if (suspiciousUsers.length > 0) {
      await prisma.$transaction(
        suspiciousUsers.map((user) =>
          prisma.user.update({
            where: { id: user.id },
            data: {
              isSuspicious: user.isSuspicious,
              suspicionReason: user.suspicionReason,
            },
          })
        )
      );
    }

    return suspiciousUsers;
  } catch (error) {
    console.error("Error detecting suspicious users:", error);
    throw error;
  }
}
