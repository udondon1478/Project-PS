"use client";

import { useState } from "react";

export default function SendSessionButton() {
  const [message, setMessage] = useState("");

  const sendSessionInfo = async () => {
    try {
      const response = await fetch("/api/session-info");
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message + (data.user ? ` User: ${JSON.stringify(data.user)}` : ""));
      } else {
        setMessage(`エラー: ${data.message}`);
      }
    } catch (error) {
      setMessage("リクエスト中にエラーが発生しました。");
      console.error("Failed to send session info:", error);
    }
  };

  return (
    <div>
      <button onClick={sendSessionInfo}>セッション情報送信</button>
      {message && <p>{message}</p>}
    </div>
  );
}