"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '@prisma/client';

interface ProfileFormProps {
  user: User;
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? '');
  const [gyazoUrl, setGyazoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { t } = useTranslation('profile');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, gyazoUrl }),
    });

    if (res.ok) {
      setSuccess(t('form.updateSuccess'));
      // Refresh the page to show the new data
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || t('form.updateFailed'));
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">{t('form.username')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gyazoUrl">{t('form.profileIconUrl')}</Label>
          <Input
            id="gyazoUrl"
            placeholder="https://gyazo.com/..."
            value={gyazoUrl}
            onChange={(e) => setGyazoUrl(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            {t('form.profileIconDescription')}
          </p>
        </div>

        {error && <p className="text-red-500">{error}</p>}
        {success && <p className="text-green-500">{success}</p>}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('form.saving') : t('form.save')}
        </Button>
      </form>
    </div>
  );
}
