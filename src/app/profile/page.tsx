import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProfileForm from '@/components/profile/ProfileForm';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SafeSearchToggle from '@/components/profile/SafeSearchToggle';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    // Redirect to login if not authenticated
    redirect('/api/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  // If the user is somehow not in the DB, redirect to home
  if (!user) {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">プロフィールの編集</h1>
        <Link href={`/users/${user.id}`}>
          <Button variant="outline">公開プロフィールを見る</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-2">プロフィールアイコン</h2>
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
           <h2 className="text-xl font-semibold mb-4">アカウント詳細</h2>
          <ProfileForm user={user} />
          
          <div className="mt-8">
             <h2 className="text-xl font-semibold mb-4">表示設定</h2>
             <SafeSearchToggle initialEnabled={user.isSafeSearchEnabled} />
          </div>
        </div>
      </div>
    </div>
  );
}
