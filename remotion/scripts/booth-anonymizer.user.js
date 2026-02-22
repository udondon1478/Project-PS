// ==UserScript==
// @name         BOOTH Anonymizer for PolySeek Promo
// @namespace    http://tampermonkey.net/
// @version      5.1
// @description  BOOTHの商品情報をいらすとや画像とダミーテキストに置き換え
// @author       PolySeek Team
// @match        https://booth.pm/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ========================================
    // 商品データ（画像・名前・出品者・カテゴリをセットで管理）
    // ========================================

    const productData = [
        {
            name: '古代マクデブルクのユニコーンのアバター',
            shop: '3Dモデル販売所',
            category: '3Dキャラクター',
            image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhiVihh8hcbXcbs2uT4Tz1RBL-y_RSdFbRSi4O4V6V38LzdzbiR08c_-K26qZMDmO1TOJCE_MXZirQXMgnbP-uZaz-Qpp4P3CFLW0L6y-Y34tOMBlyrlE5fvVb58wHllm-R1uOwnfFtbUxDYL6BtxkToXehxm2D8Oao9PHbHMHMsR2v-ynI1yOFLHEUvfRB/s850/kodai_magdeburg_unicorn.png',
        },
        {
            name: '【VRChat対応】ルーズソックス',
            shop: 'ファッション工房A',
            category: '3D衣装',
            image: 'https://blogger.googleusercontent.com/img/a/AVvXsEh-LWtL3-6l_w-XoUvIYisUXQvJ7oA_yPvqWgSmLUjpQ44Yyhl4_gY8UhqwWrAVri4lllg7Nlg5dd169mT0ydmywXabzHxwle4RbiO08v8zhq407bSprg8wELYZtIpEzAtwDXjzBRcQwfRj2cpad1YmHkGQjl0kLKdMHSycEEntNMx9yEzoaTLbhu1MgQ=s546',
        },
        {
            name: '深きものども',
            shop: '3Dモデル販売所',
            category: '3Dキャラクター',
            image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgW9-_kOPz6cTYncnmFtR25jOeIp9-eeCb2ZvzBPGbiZWJeZiqCOc0l8x3Ht0iUIE1TJjnaRONcA7wrTW875qZo2bax_AFMkXEbJhHcuSoCnYb7Zd5NRTFvqwLx_uvQxcT4_x2gxY-yEMzs/s675/cthulhu_deep_ones.png',
        },
        {
            name: 'PBRテクスチャパック - 布地素材',
            shop: 'テクスチャ屋さん',
            category: 'テクスチャ',
            image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg4XPjNBoZbXeX6IyG0MThh3kltQgXzFQ9OkHPkjb4JuR4hTtlmfA338I_PqLjyNCX3zvusNDj0b60k4gsQA7wf3IeLWlO4D0EndWhgR9x8wAK2DB051kPiHWUPRCUT7YyZpR8KIzgTjcM/s800/fabric_circle_brown.png',
        },
        {
            name: '歯車を使ったアバターギミック',
            shop: 'ギミック専門店',
            category: 'ギミック',
            image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjZKmbmc0fwFGOznYdrrMMaHU0zK_tttBoiPl8o_qesnhXO0LJBnyloD0x_B__LC_kXIcKeknv2piBckNQpevKVOqAfntCVuTbU_yibT6R8py7Ym9grYtZUiBZlvvSPrOjuij-Mb9fBNN4/s800/haguruma.png',
        },
        {
            name: 'ハロウィン風キャラクターモデル',
            shop: '3Dモデル販売所',
            category: '3Dキャラクター',
            image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhzcFNt2HfjMpos5fNO5PDunpUPl8UkP2m22Kyd89sL3eidu5EebohaqLzCPYSH2xRIMYyWS34T8WCffp6wGebDb03p9px_ltOR2ROsphgaqjx5raTO5mPPkfBloACple6rd4O018wMpu4/s800/halloween_lantern_obake.png',
        },
        {
            name: 'ワールド用 森林背景素材セット',
            shop: '背景素材ショップ',
            category: '3D背景・シーン',
            image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj9nSlEdzOidnQt0USF9t7eH1RAUmOb-XUVRNhRl2uVQsyv_ApsFy9RyUhQAUFm9C-Atd_1jMZmzrdUraTh-HKrE09sQxj_yc4xBo48KIioEK3CvJGFOcRXkTbNswoGozKQwfdr4u4CC3nb/s1600/bg_natural_mori.jpg',
        },
        {
            name: '政治家風スーツアバター',
            shop: 'アバター製作所',
            category: '3Dキャラクター',
            image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgOqHLZ48mnh3bjYcyQbCja35mK2ILl0JqB0LM3OlBbtFb7EENAmw_KPo0dBPsJvvMRFlHhwOMwA64xi76t5AaG_GemvEqLAONvmz6s9KbUDZKFfHTC0iMnVuRzGbbMJyWhfLyMDJw0iuWn/s988/seiji_souridaijin_nobg3.png',
        },
        {
            name: '白バイ隊員コスチューム一式',
            shop: 'コスチューム工房',
            category: '3D衣装',
            image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgwGlMlEJTBLiBedDSncNlgrJTrYgB7kaMmfb4dYQ6XqThp1ZkWx3D-mCSb3PL58iP1RfDMBGr3CvaDiyhkNkBDvDPKpYFxi9QjeQCifnXXcijmxI2oAFqXmx-ncvj9QqhBiUDqml6giWkB/s1285/police_shirobai_stand_woman.png',
        },
        {
            name: 'ショコラティエ風エプロン衣装',
            shop: 'おしゃれ衣装店',
            category: '3D衣装',
            image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgsygjmBbrJfM15TitbPfEOkhdLsVQLczU0ehVBWXqnYIFyDHr2mgTwcP_17LYKLdM8E8mbFtqjde21xUTcZUBfiw2ZwXdI-XYWht3KGGC23Tt3fjtMdZoaNZAiUOmxMo7TkpoIgnvPdOgq/s1315/job_chocolatiere_woman.png',
        },
    ];

    // ========================================
    // 置き換え処理
    // ========================================

    let processedCount = 0;

    function replaceContent() {
        const itemCards = document.querySelectorAll('.item-card:not([data-anonymized])');

        itemCards.forEach((card) => {
            const index = processedCount % productData.length;
            const data = productData[index];
            processedCount++;

            // サムネイル画像を置き換え
            const thumbnail = card.querySelector('.item-card__thumbnail-image');
            if (thumbnail) {
                thumbnail.style.backgroundImage = `url(${data.image})`;
                thumbnail.style.backgroundSize = 'contain';
                thumbnail.style.backgroundPosition = 'center';
                thumbnail.style.backgroundRepeat = 'no-repeat';
                thumbnail.style.backgroundColor = '#f5f5f5';
            }

            // 商品名を置き換え
            const titleLink = card.querySelector('.item-card__title a, .item-card__summary > a');
            if (titleLink) {
                titleLink.textContent = data.name;
            }

            // カテゴリを置き換え
            const categoryLink = card.querySelector('.item-card__category a, .item-card__category-anchor');
            if (categoryLink) {
                categoryLink.textContent = data.category;
            }

            // 出品者名を置き換え
            const shopLink = card.querySelector('.item-card__shop-name a, .item-card__shop-name-anchor');
            if (shopLink) {
                shopLink.textContent = data.shop;
            }

            // ショップアイコンを非表示
            const shopIcon = card.querySelector('.item-card__shop-icon, .item-card__shop-image');
            if (shopIcon) {
                shopIcon.style.visibility = 'hidden';
            }

            // 処理済みマーク
            card.setAttribute('data-anonymized', 'true');
        });

        if (itemCards.length > 0) {
            console.log(`[BOOTH Anonymizer] ${itemCards.length}件置換 (累計: ${processedCount})`);
        }
    }

    // ========================================
    // 実行
    // ========================================

    // 初回実行
    replaceContent();

    // MutationObserverで動的コンテンツに対応
    const observer = new MutationObserver(replaceContent);
    observer.observe(document.body, { childList: true, subtree: true });

    // ページ遷移対応
    window.addEventListener('popstate', () => setTimeout(replaceContent, 100));

    const pushState = history.pushState;
    history.pushState = function() {
        pushState.apply(this, arguments);
        setTimeout(replaceContent, 100);
    };

    console.log('[BOOTH Anonymizer v5.1] 有効化されました');
})();
