'use client';

import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SafeSearchToggle from './SafeSearchToggle';
import DeleteAccountSection from './DeleteAccountSection';
import ProfileForm from './ProfileForm';
import LanguageSelector from '@/components/LanguageSelector';
import type { User } from '@prisma/client';

interface ProfilePageContentProps {
  user: User;
}

export default function ProfilePageContent({ user }: ProfilePageContentProps) {
  const { t } = useTranslation('profile');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('page.title')}</h1>
        <Link href={`/users/${user.id}`}>
          <Button variant="outline">{t('page.viewPublic')}</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-2">{t('page.icon')}</h2>
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? 'User profile picture'}
              width={200}
              height={200}
              className="rounded-full w-48 h-48 object-cover"
            />
          ) : (
            <div className="w-48 h-48 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
           <h2 className="text-xl font-semibold mb-4">{t('page.accountDetails')}</h2>
          <ProfileForm user={user} />

          <div className="mt-8">
             <h2 className="text-xl font-semibold mb-4">{t('page.displaySettings')}</h2>
             <SafeSearchToggle initialEnabled={user.isSafeSearchEnabled ?? true} />
          </div>

          <div className="mt-8">
             <h2 className="text-xl font-semibold mb-4">{t('page.languageSettings')}</h2>
             <LanguageSelector />
          </div>

          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}
