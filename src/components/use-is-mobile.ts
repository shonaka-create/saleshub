"use client";

import { useEffect, useState } from "react";

/**
 * 画面幅がしきい値以下 (既定: スマホ幅) かどうかを返すクライアントフック。
 * グラフを SP 時にコンパクト表示するなど、レスポンシブなレンダリングに使う。
 * SSR 時と初期描画は false 固定 (ハイドレーション不一致を避ける)。
 */
export function useIsMobile(query = "(max-width: 640px)"): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return isMobile;
}
