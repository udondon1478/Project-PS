import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-background py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="flex flex-col items-center px-8 md:flex-row md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2024 PolySeek
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/terms" className="text-sm font-medium hover:underline underline-offset-4 text-muted-foreground">
            利用規約
          </Link>
          <Link href="/privacy" className="text-sm font-medium hover:underline underline-offset-4 text-muted-foreground">
            プライバシーポリシー
          </Link>
          <a
            href="https://forms.gle/PVdUpKCM4ZgMyK5fA"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline underline-offset-4 flex items-center gap-1 text-muted-foreground"
          >
            お問い合わせ
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
