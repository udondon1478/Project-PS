import { Search, Tags, Link as LinkIcon, User, type LucideIcon } from "lucide-react";

export interface Feature {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  href: string;
}

export const FEATURE_IDS = {
  ADVANCED_SEARCH: 'advanced-search',
  TAG_SYSTEM: 'tag-system',
  PRODUCT_REGISTRATION: 'product-registration',
  USER_AUTH: 'user-auth',
} as const;

export const features: Feature[] = [
  {
    id: FEATURE_IDS.ADVANCED_SEARCH,
    icon: Search,
    titleKey: "features.advancedSearch.title",
    descriptionKey: "features.advancedSearch.description",
    href: "/search",
  },
  {
    id: FEATURE_IDS.TAG_SYSTEM,
    icon: Tags,
    titleKey: "features.tagSystem.title",
    descriptionKey: "features.tagSystem.description",
    href: "/about",
  },
  {
    id: FEATURE_IDS.PRODUCT_REGISTRATION,
    icon: LinkIcon,
    titleKey: "features.productRegistration.title",
    descriptionKey: "features.productRegistration.description",
    href: "/register-item",
  },
  {
    id: FEATURE_IDS.USER_AUTH,
    icon: User,
    titleKey: "features.userAuth.title",
    descriptionKey: "features.userAuth.description",
    href: "/profile",
  },
];
