'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ratingFlowchart } from '@/data/guidelines';

const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: 'neutral' as const,
  themeVariables: {
    primaryColor: '#3498DB',
    primaryTextColor: '#fff',
    primaryBorderColor: '#2980B9',
    lineColor: '#95A5A6',
    secondaryColor: '#44ff88',
    tertiaryColor: '#ffdd44',
    fontSize: '18px',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis' as const,
    padding: 20,
    nodeSpacing: 60,
    rankSpacing: 80,
  },
  securityLevel: 'strict' as const,
};

// ズーム関連の定数
const ZOOM_STEP = 0.3;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 10;
const ZOOM_DEFAULT = 2.5;

export function RatingFlowchartDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(ZOOM_DEFAULT);
  const [fullscreenScale, setFullscreenScale] = useState(ZOOM_DEFAULT);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mountedRef = useRef(true);

  const RENDER_DELAY_MS = 100;

  const renderMermaid = async (
    targetRef: React.RefObject<HTMLDivElement | null>,
    uniqueIdPrefix: string,
    setLocalError?: (err: string) => void
  ) => {
    if (!mountedRef.current || !targetRef.current) return;

    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize(MERMAID_CONFIG);

      const mermaidSyntax = generateMermaidSyntax();
      const uniqueId = `${uniqueIdPrefix}-${crypto.randomUUID()}`;
      const { svg } = await mermaid.render(uniqueId, mermaidSyntax);

      if (!mountedRef.current) return;

      if (targetRef.current) {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

        svgElement.setAttribute('role', 'img');
        svgElement.setAttribute('aria-label', 'レーティング判定フローチャート詳細図');
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';

        targetRef.current.innerHTML = '';
        targetRef.current.appendChild(svgElement);
      }
    } catch (err) {
      console.error(`Mermaid rendering error (${uniqueIdPrefix}):`, err);
      if (mountedRef.current && setLocalError) {
        setLocalError('フローチャートの表示に失敗しました。ブラウザをリロードしてお試しください。');
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // レンダリングを遅延実行
    // レイアウトやDOMの初期化が完了するのを待つため
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        renderMermaid(containerRef, 'flowchart-diagram', setError);
      }
    }, RENDER_DELAY_MS);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  // フルスクリーンモード用のレンダリング
  useEffect(() => {
    if (!isFullscreen) return;

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        renderMermaid(fullscreenContainerRef, 'flowchart-fullscreen', setFullscreenError);
      }
    }, RENDER_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [isFullscreen]);

  const generateMermaidSyntax = (): string => {
    let syntax = 'graph TD\n';
    syntax += '    Start([開始]):::startClass\n';
    syntax += `    Start --> ${ratingFlowchart.startQuestionId}\n\n`;

    ratingFlowchart.questions.forEach((q) => {
      // 質問ノード
      const textWithoutQuestion = q.text.replace(/\?/g, '');
      // 日本語の表示を考慮して長めに切り取る
      const questionLabel = Array.from(textWithoutQuestion).slice(0, 30).join('') + (textWithoutQuestion.length > 30 ? '...' : '');
      syntax += `    ${q.id}["${questionLabel}"]:::questionClass\n`;

      // はい/いいえの分岐
      if (['general', 'sensitive', 'questionable', 'explicit'].includes(q.yesNext as string)) {
        syntax += `    ${q.id} -->|はい| ${q.yesNext}_result["${getRatingLabel(q.yesNext as string)}"]:::${q.yesNext}Class\n`;
      } else {
        syntax += `    ${q.id} -->|はい| ${q.yesNext}\n`;
      }

      if (['general', 'sensitive', 'questionable', 'explicit'].includes(q.noNext as string)) {
        syntax += `    ${q.id} -->|いいえ| ${q.noNext}_result["${getRatingLabel(q.noNext as string)}"]:::${q.noNext}Class\n`;
      } else {
        syntax += `    ${q.id} -->|いいえ| ${q.noNext}\n`;
      }
    });

    // スタイルクラス定義
    syntax += '\n    classDef startClass fill:#44ff88,stroke:#2ecc71,stroke-width:3px,color:#000\n';
    syntax += '    classDef questionClass fill:#3498DB,stroke:#2980B9,stroke-width:2px,color:#fff\n';
    syntax += '    classDef generalClass fill:#44ff88,stroke:#2ecc71,stroke-width:3px,color:#000\n';
    syntax += '    classDef sensitiveClass fill:#ffdd44,stroke:#f39c12,stroke-width:3px,color:#000\n';
    syntax += '    classDef questionableClass fill:#ff9944,stroke:#e67e22,stroke-width:3px,color:#fff\n';
    syntax += '    classDef explicitClass fill:#ff4444,stroke:#c0392b,stroke-width:3px,color:#fff\n';

    return syntax;
  };

  const getRatingLabel = (rating: string): string => {
    const labels: Record<string, string> = {
      general: '✅ 全年齢',
      sensitive: '👙 R-15',
      questionable: '⚠️ R-17',
      explicit: '🔞 R-18',
    };
    return labels[rating] || rating;
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + ZOOM_STEP, ZOOM_MAX));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - ZOOM_STEP, ZOOM_MIN));
  const handleResetZoom = () => setScale(ZOOM_DEFAULT);

  const handleFullscreenZoomIn = () => setFullscreenScale((prev) => Math.min(prev + ZOOM_STEP, ZOOM_MAX));
  const handleFullscreenZoomOut = () => setFullscreenScale((prev) => Math.max(prev - ZOOM_STEP, ZOOM_MIN));
  const handleFullscreenResetZoom = () => setFullscreenScale(ZOOM_DEFAULT);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg">レーティング判定フローチャート</CardTitle>
              <CardDescription className="text-xs sm:text-sm">全体の分岐を一目で確認できます</CardDescription>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleZoomOut} aria-label="縮小">
                <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleResetZoom} aria-label="ズームリセット">
                <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleZoomIn} aria-label="拡大">
                <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[500px] sm:max-h-[700px] rounded-lg border bg-background p-2 sm:p-4">
          <div
            ref={containerRef}
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}
            className="min-h-[400px] sm:min-h-[500px] flex items-center justify-center"
          >
            {/* Mermaidがここにレンダリングされます */}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <p>
            <span className="hidden sm:inline">ズームボタンで拡大・縮小 / </span>スクロールで全体を確認
          </p>
          <p className="text-right">
            倍率: {Math.round(scale * 100)}%
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full mt-3"
          onClick={() => setIsFullscreen(true)}
        >
          <Maximize2 className="mr-2 h-4 w-4" />
          大画面で表示
        </Button>
      </CardContent>
    </Card>

    {/* フルスクリーンダイアログ */}
    <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] p-0 gap-0">
        <div className="flex flex-col h-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div>
              <h2 className="text-lg font-semibold">レーティング判定フローチャート</h2>
              <p className="text-sm text-muted-foreground">全体図を大画面で確認</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleFullscreenZoomOut} title="縮小" aria-label="縮小">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleFullscreenResetZoom} title="リセット" aria-label="ズームリセット">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleFullscreenZoomIn} title="拡大" aria-label="拡大">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="text-sm text-muted-foreground px-2">
                {Math.round(fullscreenScale * 100)}%
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)} title="閉じる" aria-label="閉じる">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* フローチャートコンテンツ */}
          <div className="flex-1 overflow-auto p-4">
            <div
              ref={fullscreenContainerRef}
              style={{ transform: `scale(${fullscreenScale})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}
              className="min-h-[500px] flex items-center justify-center"
              role="img"
              aria-label="レーティング判定フローチャート図（フルスクリーン）"
            >
              {/* Mermaidがここにレンダリングされます */}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
