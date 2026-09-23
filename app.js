const copyButton = document.getElementById('copy');
copyButton.addEventListener('click', async () => {
  const address = document.getElementById('address').textContent;
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(address);
    copyButton.textContent = 'Copied ✓';
    status.textContent = 'Contract address copied.';
    setTimeout(() => { copyButton.innerHTML = 'Copy address <span aria-hidden="true">⧉</span>'; }, 2500);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('address'));
    selection.removeAllRanges(); selection.addRange(range);
    status.textContent = 'Address selected. Use your device’s copy command.';
  }
});
