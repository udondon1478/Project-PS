'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { taggingGuideSections } from '@/data/guidelines/taggingGuide';

export function TaggingGuide() {
  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">タグ付けガイド</h3>
          <p className="text-sm text-muted-foreground mb-4">
            正確なタグ付けのルールとベストプラクティスを確認できます。
          </p>
        </div>

        <Accordion type="multiple" className="w-full space-y-2">
          {taggingGuideSections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 text-left">
                  <span className="text-lg" role="img" aria-hidden="true">
                    {section.icon}
                  </span>
                  <span className="font-medium">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3 pl-8">
                  {section.content.map((paragraph, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}

                  {section.examples && (
                    <div className="mt-3 space-y-2">
                      {section.examples.good && (
                        <div>
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                            ✓ 良い例
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {section.examples.good.map((example, idx) => (
                              <code
                                key={idx}
                                className="inline-flex items-center rounded-md bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-mono text-green-700 dark:text-green-300"
                              >
                                {example}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                      {section.examples.bad && (
                        <div>
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                            ✗ 悪い例
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {section.examples.bad.map((example, idx) => (
                              <code
                                key={idx}
                                className="inline-flex items-center rounded-md bg-red-100 dark:bg-red-900/30 px-2 py-1 text-xs font-mono text-red-700 dark:text-red-300 line-through"
                              >
                                {example}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-6 p-4 rounded-lg bg-muted">
          <h4 className="text-sm font-semibold mb-2">📌 まとめ</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>見えるものをタグ付け（主観を避ける）</li>
            <li>空白はアンダースコアに、大文字小文字は正式表記に合わせる</li>
            <li>10〜20個程度のタグを目安に</li>
            <li>レーティングタグは必須</li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
