'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  // エラーコードに応じたメッセージ
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return 'サーバーの設定に問題があります。管理者に連絡してください。'
      case 'AccessDenied':
        return 'アクセスが拒否されました。このリソースを表示する権限がありません。'
      case 'Verification':
        return '認証トークンの有効期限が切れているか、既に使用されています。'
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
      case 'OAuthAccountNotLinked':
        return '認証プロバイダーでの処理中にエラーが発生しました。別のプロバイダーでアカウントを作成済みである可能性があります。'
      case 'SessionRequired':
        return 'このページにアクセスするにはログインが必要です。'
      default:
        return '予期せぬエラーが発生しました。'
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto border-red-200 shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-red-600">認証エラー</CardTitle>
        <CardDescription>
          ログイン処理中に問題が発生しました
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {getErrorMessage(error)}
        </p>
        {error && (
          <p className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
            Error Code: {error}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button asChild>
          <Link href="/auth/signin">
            ログインページへ戻る
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Suspense fallback={<div className="text-center">読み込み中...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  )
}
