import request from 'superagent'
import { tryUnconfidentialAddress, isHash256 } from '../util'
import {
  normalizeSearchQuery,
  isNumberSearch,
  isAddressSearch,
  matchShortTxOut,
} from '../lib/search-query'
import { Observable as O } from '../rxjs'

export const autocompleteDelayMs = 1000
export const autocompleteResultLimit = 5
export const minimumAssetSearchLength = 2

const reDomain = /^(?=.{3,255}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i
    , reLongHex = /^[a-f0-9]{25,}$/i
    , autocompleteCacheMs = 60000
    , categoryOrder = [ 'assets', 'blocks', 'transactions', 'addresses' ]
    , categoryRank = category => categoryOrder.indexOf(category)
    , lower = value => typeof value == 'string' ? value.toLowerCase() : ''

export const debounceAutocompleteQueries = (query$, scheduler) =>
  O.from(query$)
    .map(normalizeSearchQuery)
    .distinctUntilChanged()
    .switchMap(query => query
      ? O.timer(autocompleteDelayMs, scheduler).mapTo(query)
      : O.of(query))
    .share()

export const getAutocompletePlan = (rawQuery, isElements=!!process.env.IS_ELEMENTS) => {
  const query = normalizeSearchQuery(rawQuery)

  if (!query || isNumberSearch(query) || matchShortTxOut(query)) {
    return { kind: 'none', query }
  }

  if (isHash256(query)) {
    return { kind: 'hash', query, isElements }
  }

  if (isAddressSearch(query)) {
    return { kind: 'address', query }
  }

  // Once a hexadecimal query is longer than the largest ticker, treat it as
  // an incomplete identifier and wait for the complete 64-character value.
  if (reLongHex.test(query)) {
    return { kind: 'none', query }
  }

  if (!isElements || query.length < minimumAssetSearchLength || query.length > 255) {
    return { kind: 'none', query }
  }

  return {
    kind: 'assets',
    query,
    filters: [
      'name',
      ...(query.length <= 24 ? [ 'ticker' ] : []),
      ...(reDomain.test(query) ? [ 'domain' ] : []),
    ],
  }
}

const assetDomain = asset => asset && asset.entity && asset.entity.domain
    , assetMatchRank = (asset, field, query) => {
        const value = field == 'domain' ? assetDomain(asset) : asset && asset[field]
        return [ lower(value) == lower(query) ? 0 : 1, [ 'ticker', 'name', 'domain' ].indexOf(field) ]
      }
    , compareRanks = (a, b) => a[0] - b[0] || a[1] - b[1]

export const mergeAssetResults = (responses, query, limit=autocompleteResultLimit) => {
  const matches = new Map()

  responses.forEach(({ field, assets }) => (assets || []).forEach(asset => {
    if (!asset || !asset.asset_id) return

    const rank = assetMatchRank(asset, field, query)
        , existing = matches.get(asset.asset_id)

    if (!existing || compareRanks(rank, existing.rank) < 0) {
      matches.set(asset.asset_id, { asset, rank })
    }
  }))

  return [ ...matches.values() ]
    .sort((a, b) => compareRanks(a.rank, b.rank)
      || lower(a.asset.ticker || a.asset.name || assetDomain(a.asset) || a.asset.asset_id)
        .localeCompare(lower(b.asset.ticker || b.asset.name || assetDomain(b.asset) || b.asset.asset_id)))
    .slice(0, limit)
    .map(({ asset }) => ({
      category: 'assets',
      id: `asset:${asset.asset_id}`,
      pathname: `/asset/${asset.asset_id}`,
      asset,
    }))
}

const settled = promise => promise
  .then(value => ({ value, cacheable: true }))
  .catch(error => ({
    value: null,
    cacheable: !!(error && error.status >= 400 && error.status < 500 && error.status != 429),
  }))

const lookupHash = (apiBase, { query, isElements }, requester) => Promise.all([
  settled(requester(`${apiBase}/tx/${query}`).then(_ => ({
    category: 'transactions',
    id: `transaction:${query}`,
    pathname: `/tx/${query}`,
    txid: query,
  }))),
  settled(requester(`${apiBase}/block/${query}`).then(response => ({
    category: 'blocks',
    id: `block:${query}`,
    pathname: `/block/${query}`,
    hash: query,
    block: response.body,
  }))),
  ...(isElements ? [ settled(requester(`${apiBase}/asset/${query}`).then(response => ({
    category: 'assets',
    id: `asset:${query}`,
    pathname: `/asset/${query}`,
    asset: { ...(response.body || {}), asset_id: (response.body && response.body.asset_id) || query },
  }))) ] : []),
]).then(responses => ({
  cacheable: responses.every(response => response.cacheable),
  results: responses.map(response => response.value)
    .filter(Boolean)
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category)),
}))

const lookupAddress = (apiBase, { query }, requester) =>
  settled(requester(`${apiBase}/address/${tryUnconfidentialAddress(query)}`).then(_ => ({
    category: 'addresses',
    id: `address:${query}`,
    pathname: `/address/${query}`,
    address: query,
  }))).then(response => ({
    cacheable: response.cacheable,
    results: response.value ? [ response.value ] : [],
  }))

const lookupAssets = (apiBase, { query, filters }, requester) => Promise.all(filters.map(field =>
  settled(requester(`${apiBase}/assets/registry`)
    .query({ [field]: query, limit: autocompleteResultLimit, sort: `${field}_asc` })
    .then(response => ({ field, assets: Array.isArray(response.body) ? response.body : [] })))
)).then(responses => ({
  cacheable: responses.every(response => response.cacheable),
  results: mergeAssetResults(responses.map((response, index) => response.value || {
    field: filters[index],
    assets: [],
  }), query),
}))

const executePlan = (apiBase, plan, requester) =>
  plan.kind == 'hash' ? lookupHash(apiBase, plan, requester)
  : plan.kind == 'address' ? lookupAddress(apiBase, plan, requester)
  : plan.kind == 'assets' ? lookupAssets(apiBase, plan, requester)
  : Promise.resolve({ cacheable: true, results: [] })

export default (apiBase, requester=request) => {
  const cache = new Map()

  return query$ => O.from(query$)
    .switchMap(rawQuery => {
      const plan = getAutocompletePlan(rawQuery)
          , query = plan.query

      if (plan.kind == 'none') {
        return O.of({ query, loading: false, results: [] })
      }

      const cacheKey = plan.kind == 'assets' ? `${plan.kind}:${lower(query)}` : `${plan.kind}:${query}`

      const cached = cache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return O.of({ query, loading: false, results: cached.results })
      }
      cache.delete(cacheKey)

      return O.from(executePlan(apiBase, plan, requester))
        .map(({ cacheable, results }) => {
          if (cacheable) cache.set(cacheKey, { results, expiresAt: Date.now() + autocompleteCacheMs })
          return { query, loading: false, results }
        })
        .catch(_ => O.of({ query, loading: false, results: [] }))
        .startWith({ query, loading: true, results: [] })
    })
    .share()
}
