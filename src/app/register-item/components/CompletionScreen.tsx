'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';

interface CompletionScreenProps {
  message: string;
  onReset: () => void;
  isError?: boolean;
}

export const CompletionScreen = ({ message, onReset, isError = false }: CompletionScreenProps) => {
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>処理完了</CardTitle>
        <CardDescription>商品登録フローが完了しました。</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant={isError ? 'destructive' : 'default'}>
          {isError ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertTitle>{isError ? 'エラー' : '成功'}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button onClick={onReset} className="w-full">
          別の商品を登録する
        </Button>
      </CardFooter>
    </Card>
  );
};