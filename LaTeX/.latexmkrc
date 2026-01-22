#!/usr/bin/env perl

# pLaTeX + dvipdfmx 設定
$latex = 'platex -synctex=1 -halt-on-error -interaction=nonstopmode %O %S';
$bibtex = 'pbibtex %O %B';
$biber = 'biber --bblencoding=utf8 -u -U --output_safechars %O %B';
$dvipdf = 'dvipdfmx %O -o %D %S';
$makeindex = 'mendex %O -o %D %S';

# PDF生成モード (0: DVI, 3: dvipdfmx経由)
$pdf_mode = 3;

# 補助ファイルのクリーン設定
$clean_ext = 'synctex.gz synctex.gz(busy) run.xml bbl bcf fdb_latexmk fls log aux dvi out blg toc lof lot';
