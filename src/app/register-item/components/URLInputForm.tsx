'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface URLInputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  message: string;
}

export const URLInputForm = ({ onSubmit, isLoading, message }: URLInputFormProps) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Booth.pm 商品URL入力</CardTitle>
        <CardDescription>登録したい商品のURLを入力してください。</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          {message && (
            <Alert variant={message.includes('失敗') || message.includes('エラー') ? 'destructive' : 'default'} className="mb-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="boothUrl">URL</Label>
            <Input
              type="url"
              id="boothUrl"
              placeholder="https://example.booth.pm/items/123456"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || !url.trim()} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                取得中...
              </>
            ) : (
              '商品情報を取得'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};