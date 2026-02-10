import { loadFont } from "@remotion/google-fonts/NotoSansJP";

export const { fontFamily: notoSansJP } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["japanese", "latin"],
});
