/* src/lib/theme/font-fallback-script.ts */

const FONT_PATH =
  '/css2?family=Noto+Sans+JP:wght@100..900&family=Noto+Sans+SC:wght@100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap'

const MIRRORS = ['https://fonts.loli.net', 'https://fonts.font.im']

// Inline script: check if Google Fonts loaded, fall back to mirrors
export const fontFallbackScript = `
(function(){
  var path="${FONT_PATH}";
  var mirrors=${JSON.stringify(MIRRORS)};
  var idx=0;
  function check(){
    document.fonts.ready.then(function(){
      if(document.fonts.check("16px 'Noto Sans'"))return;
      if(idx>=mirrors.length)return;
      var l=document.createElement("link");
      l.rel="stylesheet";
      l.href=mirrors[idx++]+path;
      document.head.appendChild(l);
      setTimeout(check,3000);
    });
  }
  setTimeout(check,2000);
})();
`.trim()
