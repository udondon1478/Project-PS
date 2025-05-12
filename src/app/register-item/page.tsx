'use client';

import { useState } from 'react';

export default function RegisterItemPage() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('登録中...');

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
        setMessage('商品が正常に登録されました。');
        setUrl(''); // フォームをクリア
      } else {
        setMessage(`登録に失敗しました: ${data.message || response.statusText}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`登録中にエラーが発生しました: ${errorMessage}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>商品登録</h1>
      <form onSubmit={handleSubmit}>
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
          />
        </div>
        <button type="submit" style={{ padding: '10px 15px' }}>
          登録
        </button>
      </form>
      {message && <p style={{ marginTop: '10px' }}>{message}</p>}
    </div>
  );
}