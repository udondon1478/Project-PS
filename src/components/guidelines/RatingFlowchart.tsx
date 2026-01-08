'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, AlertCircle, Check } from 'lucide-react';
import { ratingFlowchart, ratingGuidelines, RatingLevel, RATING_LEVELS } from '@/data/guidelines';

interface RatingFlowchartProps {
  onResult?: (rating: RatingLevel) => void;
  onClose?: () => void;
}

export function RatingFlowchart({ onResult, onClose }: RatingFlowchartProps) {
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(ratingFlowchart.startQuestionId);
  const [history, setHistory] = useState<string[]>([]);
  const [result, setResult] = useState<RatingLevel | null>(null);

  const currentQuestion = ratingFlowchart.questions.find(q => q.id === currentQuestionId);
  const totalQuestions = ratingFlowchart.questions.length;
  const progress = result ? 100 : ((history.length + 1) / totalQuestions) * 100;

  const handleAnswer = useCallback((answer: 'yes' | 'no') => {
    if (!currentQuestion) return;

    const nextId = answer === 'yes' ? currentQuestion.yesNext : currentQuestion.noNext;

    // 履歴に追加
    setHistory(prev => [...prev, currentQuestionId]);

    // 次がレーティング結果かチェック
    if (RATING_LEVELS.includes(nextId as RatingLevel)) {
      const rating = nextId as RatingLevel;
      setResult(rating);
      onResult?.(rating);
    } else {
      // 次の質問に進む
      setCurrentQuestionId(nextId as string);
    }
  }, [currentQuestion, currentQuestionId, onResult]);

  const handleBack = useCallback(() => {
    if (history.length === 0) return;

    setHistory(prev => {
      const newHistory = [...prev];
      const previousQuestionId = newHistory.pop();
      if (previousQuestionId) {
        setCurrentQuestionId(previousQuestionId);
        setResult(null);
      }
      return newHistory;
    });
  }, [history]);

  const handleReset = useCallback(() => {
    setCurrentQuestionId(ratingFlowchart.startQuestionId);
    setHistory([]);
    setResult(null);
  }, []);

  // キーボードショートカット
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (result) return; // 結果が表示されている場合は無効

    if (e.key === 'y' || e.key === 'Y') {
      handleAnswer('yes');
    } else if (e.key === 'n' || e.key === 'N') {
      handleAnswer('no');
    } else if (e.key === 'Backspace' && history.length > 0) {
      e.preventDefault();
      handleBack();
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  }, [result, handleAnswer, history.length, handleBack, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!currentQuestion && !result) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          フローチャートの読み込みに失敗しました。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* 進捗インジケーター */}
      {!result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              質問 {history.length + 1} / {totalQuestions}
            </span>
            <span className="text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* 質問カード または 結果カード */}
      {!result && currentQuestion ? (
        <Card className="animate-in fade-in slide-in-from-right-5 duration-300">
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.text}</CardTitle>
            {currentQuestion.description && (
              <CardDescription className="text-base">
                {currentQuestion.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardFooter className="flex flex-col gap-3 sm:flex-row pt-4">
            <Button
              size="lg"
              className="w-full sm:flex-1"
              onClick={() => handleAnswer('yes')}
            >
              はい
              <span className="ml-2 text-xs opacity-70 hidden sm:inline">(Y)</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:flex-1"
              onClick={() => handleAnswer('no')}
            >
              いいえ
              <span className="ml-2 text-xs opacity-70 hidden sm:inline">(N)</span>
            </Button>
          </CardFooter>
        </Card>
      ) : result ? (
        <Card
          className="animate-in zoom-in duration-500 border-2"
          style={{ borderColor: ratingGuidelines[result].color }}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ backgroundColor: ratingGuidelines[result].color + '20' }}
              >
                {ratingGuidelines[result].emoji}
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {ratingGuidelines[result].label}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  判定完了
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base">{ratingGuidelines[result].definition}</p>

            {ratingGuidelines[result].warnings && ratingGuidelines[result].warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {ratingGuidelines[result].warnings[0]}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h4 className="font-semibold mb-2">このレーティングの例:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {ratingGuidelines[result].examples.slice(0, 3).map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
              <ChevronLeft className="mr-2 h-4 w-4" />
              最初からやり直す
            </Button>
            {onClose && (
              <Button onClick={onClose} className="w-full sm:w-auto">
                <Check className="mr-2 h-4 w-4" />
                完了
              </Button>
            )}
          </CardFooter>
        </Card>
      ) : null}

      {/* 戻るボタン */}
      {!result && history.length > 0 && (
        <Button
          variant="ghost"
          onClick={handleBack}
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          前の質問に戻る
          <span className="ml-2 text-xs opacity-70 hidden sm:inline">(Backspace)</span>
        </Button>
      )}

      {/* キーボードヒント */}
      {!result && (
        <p className="text-xs text-center text-muted-foreground hidden sm:block">
          ヒント: Y/Nキーでも回答できます。Backspaceで戻る、Escで閉じる
        </p>
      )}
    </div>
  );
}
