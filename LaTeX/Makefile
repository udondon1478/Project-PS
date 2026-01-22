# LaTeX コンパイル用 Makefile
# pLaTeX + dvipdfmx + BibLaTeX(biber)

MAIN = main
PDF = $(MAIN).pdf

.PHONY: all pdf clean watch open

# デフォルト: PDFを生成
all: pdf

# latexmkでPDF生成
pdf:
	latexmk -f $(MAIN).tex

# 継続的コンパイル（ファイル変更を監視）
watch:
	latexmk -pvc $(MAIN).tex

# 生成されたPDFを開く
open: pdf
	open $(PDF)

# 補助ファイルをクリーン
clean:
	latexmk -c

# 全ファイルをクリーン（PDFも削除）
distclean:
	latexmk -C
