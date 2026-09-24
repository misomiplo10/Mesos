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

const MESO_MINT = '86CNkduuBxboTJn6je3w6EjQZQT7yS9LXSR2s1dguw3Q';
const PUBLIC_REWARDS_URL = `https://www.stonkfun.xyz/api/public/v1/tokens/${MESO_MINT}/rewards`;
const rewardsCard = document.getElementById('rewards-card');
const distributedValue = document.getElementById('distributed-value');
const distributedDetails = document.getElementById('distributed-details');
const collectingValue = document.getElementById('collecting-value');
const rewardsSource = document.getElementById('rewards-source');
const holderCount = document.getElementById('holder-count');

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});
const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const tokenFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function formatRelativeTime(value) {
  if (!value) return null;
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (!Number.isFinite(elapsedSeconds)) return null;
  if (elapsedSeconds < 60) return 'just now';
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  return `${Math.floor(elapsedSeconds / 86400)}d ago`;
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function renderRewards(data) {
  const symbol = data.quoteSymbol || 'GLDX';
  const distributedTokens = isNumber(data.distributedTokens)
    ? `${tokenFormatter.format(data.distributedTokens)} ${symbol}`
    : null;
  const payoutCount = isNumber(data.payoutCount)
    ? `${integerFormatter.format(data.payoutCount)} payment${data.payoutCount === 1 ? '' : 's'}`
    : null;
  const lastPayout = formatRelativeTime(data.lastPayoutAt);

  distributedValue.textContent = isNumber(data.distributedUsd)
    ? currencyFormatter.format(data.distributedUsd)
    : distributedTokens || 'Unavailable';
  distributedDetails.textContent = [
    isNumber(data.distributedUsd) ? distributedTokens : null,
    payoutCount,
    lastPayout ? `last ${lastPayout}` : null
  ].filter(Boolean).join(' · ') || 'Live distribution total';

  collectingValue.textContent = isNumber(data.collectingUsd)
    ? currencyFormatter.format(data.collectingUsd)
    : isNumber(data.collectingTokens)
      ? `${tokenFormatter.format(data.collectingTokens)} ${symbol}`
      : 'Unavailable';

  rewardsSource.textContent = 'Live from StonkFun · refreshes every minute';
  holderCount.textContent = isNumber(data.holderCount)
    ? `${integerFormatter.format(data.holderCount)} holders`
    : '';
  rewardsCard.setAttribute('aria-busy', 'false');
  rewardsCard.classList.remove('rewards-error');
}

function normalizePublicRewards(payload) {
  const rewards = payload?.data?.rewards;
  const quote = payload?.data?.quote;
  if (!rewards) throw new Error('No rewards data returned');
  return {
    distributedUsd: null,
    distributedTokens: Number(rewards.distributedTokens),
    collectingUsd: null,
    collectingTokens: Number(rewards.undistributedTokens),
    payoutCount: Number(rewards.payoutCount),
    holderCount: Number(rewards.holderCount),
    lastPayoutAt: rewards.lastPayoutAt,
    quoteSymbol: quote?.symbol || 'GLDX'
  };
}

async function fetchRewards() {
  const localResponse = await fetch('/api/rewards', { cache: 'no-store' });
  if (localResponse.ok) return localResponse.json();

  const publicResponse = await fetch(PUBLIC_REWARDS_URL, { cache: 'no-store' });
  if (!publicResponse.ok) throw new Error('StonkFun rewards are unavailable');
  return normalizePublicRewards(await publicResponse.json());
}

async function updateRewards() {
  if (document.hidden) return;
  try {
    renderRewards(await fetchRewards());
  } catch {
    rewardsSource.textContent = 'Live data is temporarily unavailable · view the latest on StonkFun';
    rewardsCard.setAttribute('aria-busy', 'false');
    rewardsCard.classList.add('rewards-error');
  }
}

updateRewards();
setInterval(updateRewards, 60 * 1000);
document.addEventListener('visibilitychange', updateRewards);
