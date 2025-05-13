'use client';

import { useState } from 'react';

// 商品情報の型定義 (必要に応じて詳細化)
interface ProductInfo {
  id?: string; // 既存商品の場合はIDがある
  boothJpUrl: string;
  boothEnUrl: string;
  title: string;
  description: string;
  price: number;
  publishedAt: string; // Dateオブジェクトとして扱う場合は変更
  sellerName: string;
  sellerUrl: string;
  sellerIconUrl: string;
  images: { imageUrl: string; isMain: boolean; order: number }[];
  productTags?: { tag: { id: string; name: string } }[]; // 既存商品のタグ情報
}

export default function RegisterItemPage() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [productData, setProductData] = useState<ProductInfo | null>(null);
  const [status, setStatus] = useState<'initial' | 'loading' | 'existing' | 'new' | 'error'>('initial');
  const [manualTags, setManualTags] = useState<string[]>([]); // 新規登録時の手動タグ

  const isLoading = status === 'loading'; // ローディング状態を変数で管理

  const handleFetchProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('商品情報を取得中...');
    setProductData(null); // 以前の商品情報をクリア

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.status === 'existing') {
          setProductData(data.product);
          setStatus('existing');
          setMessage(data.message);
        } else if (data.status === 'new') {
          setProductData(data.productInfo);
          setStatus('new');
          setMessage(data.message);
          setManualTags([]); // 新規登録時はタグをクリア
        } else {
          setStatus('error');
          setMessage('未知のレスポンスステータスです。');
        }
      } else {
        setStatus('error');
        setMessage(`情報の取得に失敗しました: ${data.message || response.statusText}`);
      }
    } catch (error: unknown) {
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`情報の取得中にエラーが発生しました: ${errorMessage}`);
    }
  };

  const handleUpdateProduct = async () => {
    setStatus('loading');
    setMessage('商品情報を更新中...');

    try {
      const response = await fetch('/api/items/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: productData?.id }), // 既存商品のIDを送信
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('initial'); // 完了したら初期状態に戻す
        setMessage('商品情報が正常に更新されました。');
        setUrl(''); // フォームをクリア
        setProductData(null);
      } else {
        setStatus('existing'); // 更新失敗時は既存表示に戻す
        setMessage(`更新に失敗しました: ${data.message || response.statusText}`);
      }
    } catch (error: unknown) {
      setStatus('existing'); // 更新失敗時は既存表示に戻す
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`更新中にエラーが発生しました: ${errorMessage}`);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('商品を登録中...');

    if (!productData) {
      setMessage('商品情報がありません。');
      setStatus('error');
      return;
    }

    try {
      const response = await fetch('/api/items/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productInfo: productData, // Booth.pmから取得した情報
          tags: manualTags, // ユーザーが手動入力したタグ
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('initial'); // 完了したら初期状態に戻す
        setMessage('商品が正常に登録されました。');
        setUrl(''); // フォームをクリア
        setProductData(null);
        setManualTags([]);
      } else {
        setStatus('new'); // 登録失敗時は新規登録表示に戻す
        setMessage(`登録に失敗しました: ${data.message || response.statusText}`);
      }
    } catch (error: unknown) {
      setStatus('new'); // 登録失敗時は新規登録表示に戻す
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`登録中にエラーが発生しました: ${errorMessage}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>商品登録</h1>

      {/* URL入力フォーム */}
      {status === 'initial' || status === 'loading' || status === 'error' ? (
        <form onSubmit={handleFetchProduct}>
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="boothUrl" style={{ display: 'block', marginBottom: '5px' }}>
              Booth.pm 商品URL:
            </label>
            <input
              type="text"
              id="boothUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ width: '300px', padding: '8px' }}
              required
              disabled={status === 'loading'}
            />
          </div>
          <button type="submit" style={{ padding: '10px 15px' }} disabled={status === 'loading'}>
            情報を取得
          </button>
        </form>
      ) : null}

      {/* メッセージ表示 */}
      {message && <p style={{ marginTop: '10px', color: status === 'error' ? 'red' : 'black' }}>{message}</p>}

      {/* 既存商品情報の表示と更新確認 */}
      {status === 'existing' && productData ? (
        <div className="mt-4 p-4 border rounded-md">
          <h2 className="text-xl font-bold mb-2">既存の商品情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold">タイトル</h3>
              <p>{productData.title}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">価格</h3>
              <p>{productData.price}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold">説明文</h3>
              <p className="whitespace-pre-wrap">{productData.description}</p> {/* 説明文は改行を保持 */}
            </div>
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold">画像</h3>
              <div className="flex flex-wrap gap-2">
                {productData.images.map((image, index) => (
                  <img key={index} src={image.imageUrl} alt={`商品画像 ${index + 1}`} className="w-24 h-24 object-cover rounded-md" />
                ))}
              </div>
            </div>
            {/* 販売者情報などもここに追加可能 */}
          </div>
          <button onClick={handleUpdateProduct} disabled={isLoading} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
            最新情報に更新
          </button>
        </div>
      ) : null}

      {/* 新規登録フォーム */}
      {status === 'new' && productData ? (
        <div className="mt-4 p-4 border rounded-md">
          <h2 className="text-xl font-bold mb-2">新規商品登録</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold">タイトル</h3>
              <p>{productData.title}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">価格</h3>
              <p>{productData.price}</p>
            </div>
             <div className="md:col-span-2">
              <h3 className="text-lg font-semibold">説明文</h3>
              <p className="whitespace-pre-wrap">{productData.description}</p> {/* 説明文は改行を保持 */}
            </div>
             <div className="md:col-span-2">
              <h3 className="text-lg font-semibold">画像</h3>
              <div className="flex flex-wrap gap-2">
                {productData.images.map((image, index) => (
                  <img key={index} src={image.imageUrl} alt={`商品画像 ${index + 1}`} className="w-24 h-24 object-cover rounded-md" />
                ))}
              </div>
            </div>
            {/* 販売者情報などもここに追加可能 */}
          </div>

          {/* タグ入力フォーム */}
          <div className="mt-4">
            <label htmlFor="manualTags" className="block text-lg font-semibold mb-1">
              タグ (カンマ区切り):
            </label>
            <input
              type="text"
              id="manualTags"
              value={manualTags.join(',')}
              onChange={(e) => setManualTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0))}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <button onClick={handleCreateProduct} disabled={isLoading} className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
            商品を登録
          </button>
        </div>
      ) : null}
    </div>
  );
}