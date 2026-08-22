export const copyToClipboardFallback = (text: string) => {
  const fallbackCopy = (val: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = val;
    textArea.style.position = "fixed"; // avoid scrolling to bottom
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
};
