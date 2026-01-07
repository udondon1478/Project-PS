'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ratingFlowchart } from '@/data/guidelines';

export function RatingFlowchartDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function renderDiagram() {
      try {
        // Mermaid.jsを動的にインポート
        const mermaid = (await import('mermaid')).default;

        // Mermaidを初期化
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
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
            curve: 'basis',
            padding: 20,
            nodeSpacing: 60,
            rankSpacing: 80,
          },
          securityLevel: 'loose',
        });

        // Mermaid構文を生成
        const mermaidSyntax = generateMermaidSyntax();

        if (!mounted || !containerRef.current) return;

        // ユニークなIDを生成
        const uniqueId = `flowchart-diagram-${Date.now()}`;

        // Mermaidでレンダリング
        const { svg } = await mermaid.render(uniqueId, mermaidSyntax);

        if (!mounted || !containerRef.current) return;

        // SVGを挿入
        containerRef.current.innerHTML = svg;

        // SVGのサイズを調整
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) {
          svgElement.style.maxWidth = '100%';
          svgElement.style.height = 'auto';
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (mounted) {
          setError('フローチャートの表示に失敗しました。ブラウザをリロードしてお試しください。');
        }
      }
    }

    // レンダリングを遅延実行
    const timer = setTimeout(() => {
      renderDiagram();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const generateMermaidSyntax = (): string => {
    let syntax = 'graph TD\n';
    syntax += '    Start([開始]):::startClass\n';
    syntax += `    Start --> ${ratingFlowchart.startQuestionId}\n\n`;

    ratingFlowchart.questions.forEach((q) => {
      // 質問ノード
      const questionLabel = q.text.replace(/\?/g, '').substring(0, 20) + '...';
      syntax += `    ${q.id}["${questionLabel}"]:::questionClass\n`;

      // はい/いいえの分岐
      const yesLabel = typeof q.yesNext === 'string' && q.yesNext.length <= 10 ? q.yesNext : '次へ';
      const noLabel = typeof q.noNext === 'string' && q.noNext.length <= 10 ? q.noNext : '次へ';

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
      general: '✅ General',
      sensitive: '👙 Sensitive',
      questionable: '⚠️ Questionable',
      explicit: '🔞 Explicit',
    };
    return labels[rating] || rating;
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.3, 4));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.5));
  const handleResetZoom = () => setScale(1.5);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg">レーティング判定フローチャート</CardTitle>
            <CardDescription className="text-xs sm:text-sm">全体の分岐を一目で確認できます</CardDescription>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleZoomOut} title="縮小">
              <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleResetZoom} title="リセット">
              <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleZoomIn} title="拡大">
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
      </CardContent>
    </Card>
  );
}
