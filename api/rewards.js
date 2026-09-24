const MESO_MINT = '86CNkduuBxboTJn6je3w6EjQZQT7yS9LXSR2s1dguw3Q';
const STONKFUN_REWARDS_URL = `https://www.stonkfun.xyz/api/rewards?mint=${MESO_MINT}`;
const STONKFUN_PUBLIC_URL = `https://www.stonkfun.xyz/api/public/v1/tokens/${MESO_MINT}/rewards`;

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  response.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=90');

  try {
    const upstream = await fetch(STONKFUN_REWARDS_URL, {
      headers: { Accept: 'application/json' }
    });

    if (!upstream.ok) throw new Error(`StonkFun returned ${upstream.status}`);

    const data = await upstream.json();
    const quotePriceUsd = finiteNumber(data.quotePriceUsd);
    const awaitingDeliveryUsd = finiteNumber(data.awaitingDeliveryTokens) * quotePriceUsd;
    const collectingUsd = Math.max(
      0,
      finiteNumber(data.pendingUsd) + finiteNumber(data.pendingTaxUsd) - awaitingDeliveryUsd
    );

    return response.status(200).json({
      distributedUsd: optionalNumber(data.distributedUsd),
      distributedTokens: optionalNumber(data.distributedTokens),
      collectingUsd,
      collectingTokens: optionalNumber(data.pendingTokens),
      payoutCount: optionalNumber(data.payoutCount),
      holderCount: optionalNumber(data.holderCount),
      lastPayoutAt: data.lastPayoutAt || null,
      quoteSymbol: data.quoteSymbol || 'GLDX',
      transferTaxBps: optionalNumber(data.transferTaxBps),
      operatingFeeBps: optionalNumber(data.operatingFeeBps),
      minHoldingUsd: optionalNumber(data.minHoldingUsd),
      source: 'StonkFun',
      generatedAt: new Date().toISOString()
    });
  } catch (primaryError) {
    try {
      const fallback = await fetch(STONKFUN_PUBLIC_URL, {
        headers: { Accept: 'application/json' }
      });

      if (!fallback.ok) throw new Error(`StonkFun public API returned ${fallback.status}`);

      const payload = await fallback.json();
      const rewards = payload?.data?.rewards;
      const quote = payload?.data?.quote;
      if (!rewards) throw new Error('StonkFun public API returned no rewards data');

      return response.status(200).json({
        distributedUsd: null,
        distributedTokens: optionalNumber(rewards.distributedTokens),
        collectingUsd: null,
        collectingTokens: optionalNumber(rewards.undistributedTokens),
        payoutCount: optionalNumber(rewards.payoutCount),
        holderCount: optionalNumber(rewards.holderCount),
        lastPayoutAt: rewards.lastPayoutAt || null,
        quoteSymbol: quote?.symbol || 'GLDX',
        source: 'StonkFun',
        generatedAt: payload?.meta?.generatedAt || new Date().toISOString()
      });
    } catch (fallbackError) {
      return response.status(502).json({
        error: 'Live holder rewards are temporarily unavailable.',
        detail: process.env.NODE_ENV === 'development' ? fallbackError.message : undefined
      });
    }
  }
};

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
