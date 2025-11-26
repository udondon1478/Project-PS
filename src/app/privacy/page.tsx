export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-8 prose dark:prose-invert max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">プライバシーポリシー</h1>
      <p className="mb-4">
        PolySeek運営（以下「運営」といいます。）は、本ウェブサイト上で提供するサービス（以下「本サービス」といいます。）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
      </p>

      <h2 className="text-xl font-bold mt-8 mb-4">第1条（収集する情報）</h2>
      <p className="mb-4">
        本サービスでは、以下の情報を取得・利用します。
      </p>
      <h3 className="text-lg font-bold mt-4 mb-2">アカウント情報</h3>
      <p className="mb-4">
        GoogleまたはDiscord等の外部サービス連携を通じて提供される、ユーザー名、メールアドレス、プロフィール画像、および一意の識別子。
      </p>
      <h3 className="text-lg font-bold mt-4 mb-2">利用履歴</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>商品の閲覧履歴（アクセスログ、IPアドレス、User Agent等）</li>
        <li>商品への「いいね」や「所有済み」登録情報</li>
        <li>商品登録情報およびタグ編集履歴</li>
      </ul>
      <h3 className="text-lg font-bold mt-4 mb-2">Cookieおよび類似技術</h3>
      <p className="mb-4">
        ログイン状態の維持や設定の保存のためにCookieを使用します。
      </p>

      <h2 className="text-xl font-bold mt-8 mb-4">第2条（個人情報の利用目的）</h2>
      <p className="mb-4">
        運営が個人情報を収集・利用する目的は以下のとおりです。
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>本サービスの提供・運営のため（ログイン認証、マイページ機能の提供など）</li>
        <li>ユーザー設定（タグ表示設定、言語設定等）を保存・適用するため</li>
        <li>ユーザーが利用規約に違反する行為を行った場合に、当該ユーザーを特定し対応するため</li>
        <li>本サービスの利用状況を分析し、機能改善や新サービスの開発に役立てるため</li>
        <li>スパム行為や不正アクセスを検知・防止するため</li>
        <li>上記の利用目的に付随する目的</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-4">第3条（個人情報の第三者提供）</h2>
      <p className="mb-4">
        運営は、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
      </p>

      <h2 className="text-xl font-bold mt-8 mb-4">第4条（外部送信・情報収集モジュール）</h2>
      <p className="mb-4">
        本サービスでは、認証およびサービスの質の向上のため、以下の第三者が提供するサービスを利用しています。これらのサービス提供者に対し、利用者のログ情報等が送信される場合があります。
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Google : アカウント認証のため</li>
        <li>Discord: アカウント認証のため</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-4">第5条（情報の収集モジュールと自動検知）</h2>
      <p className="mb-4">
        本サービスでは、スパム行為や荒らし行為を防止するため、ユーザーの投稿頻度、タグ編集内容、他者からの評価などの行動履歴をシステムにより自動的に解析し、不正な利用の疑いがあるアカウントを検知・制限する場合があります。
      </p>

      <h2 className="text-xl font-bold mt-8 mb-4">第6条（個人情報の開示・訂正・削除）</h2>
      <p className="mb-4">
        ユーザーは、本サービスのマイページまたは設定画面を通じて、自己の登録情報を閲覧・修正・削除することができます。また、アカウントの削除を希望される場合は、所定の手続きにより退会処理を行うことで、サーバー上の個人情報を削除または匿名化することができます。ただし、システムのバックアップやタグ編集履歴など、サービスの整合性を保つために必要な最小限のログは一定期間保持される場合があります。
      </p>

      <h2 className="text-xl font-bold mt-8 mb-4">第7条（プライバシーポリシーの変更）</h2>
      <p className="mb-4">
        本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく変更することができるものとします。
      </p>
      <p className="mb-4">
        運営が別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。
      </p>

      <h2 className="text-xl font-bold mt-8 mb-4">第8条（お問い合わせ窓口）</h2>
      <p className="mb-4">
        本ポリシーに関するお問い合わせは、以下の窓口までお願いいたします。
      </p>
      <p className="mb-4">
        運営者：PolySeek運営者<br />
        連絡先：polyseek.dev@gmail.com
      </p>
    </div>
  );
}
