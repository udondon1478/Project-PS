

import { ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-background py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <a
              href="https://github.com/udondon1478/Project-PS"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              PolySeek
            </a>
            .
          </p>
        </div>
        <div className="flex gap-4">
            <a
              href="https://forms.gle/PVdUpKCM4ZgMyK5fA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline underline-offset-4 flex items-center gap-1 text-muted-foreground"
            >
              削除申請・バグ報告
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
        </div>
      </div>
    </footer>
  );
}
