const test = require('node:test')
const assert = require('node:assert/strict')
const render = require('snabbdom-to-html')
const { Subject } = require('../client/node_modules/rxjs/Subject')
const { TestScheduler } = require('../client/node_modules/rxjs/testing')

process.env.IS_ELEMENTS = '1'

const {
  default: makeAutocompleteDriver,
  autocompleteDelayMs,
  debounceAutocompleteQueries,
  getAutocompletePlan,
  mergeAssetResults,
} = require('../client/src/driver/autocomplete')
const search = require('../client/src/views/search').default

const t = (strings, ...values) => Array.isArray(strings)
  ? strings.reduce((text, string, index) => text + string + (values[index] == null ? '' : values[index]), '')
  : strings

const collectAutocomplete = (driver, query) => new Promise((resolve, reject) => {
  const events = []
  driver(require('../client/src/rxjs').Observable.of(query)).subscribe(event => {
    events.push(event)
    if (!event.loading) resolve(events)
  }, reject)
})

const fakeRequester = responses => {
  const calls = []
      , requester = url => {
          const call = { url, query: null }
              , response = responses[url] || { body: [] }
              , pending = {
                  query(query) {
                    call.query = query
                    return pending
                  },
                  then(resolve, reject) {
                    return (response instanceof Error ? Promise.reject(response) : Promise.resolve(response))
                      .then(resolve, reject)
                  },
                }

          calls.push(call)
          return pending
        }

  return { calls, requester }
}

test('classifies only complete hashes and addresses for exact autocomplete', () => {
  const hash = 'a'.repeat(64)
      , address = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'

  assert.deepEqual(getAutocompletePlan(hash, true), {
    kind: 'hash',
    query: hash,
    isElements: true,
  })
  assert.deepEqual(getAutocompletePlan(address, true), {
    kind: 'address',
    query: address,
  })
  assert.equal(getAutocompletePlan('a'.repeat(63), true).kind, 'none')
  assert.equal(getAutocompletePlan('840000', true).kind, 'none')
  assert.equal(getAutocompletePlan('840000x1x0', true).kind, 'none')
})

test('uses registry metadata filters without asset ID prefix autocomplete', () => {
  assert.deepEqual(getAutocompletePlan('USD', true).filters, [ 'name', 'ticker' ])
  assert.deepEqual(getAutocompletePlan('example.com', true).filters, [ 'name', 'ticker', 'domain' ])
  assert.deepEqual(getAutocompletePlan('CAFE', true).filters, [ 'name', 'ticker' ])
  assert.equal(getAutocompletePlan('USD', false).kind, 'none')
})

test('issues only the eligible registry metadata requests', () => {
  const { calls, requester } = fakeRequester({})

  return collectAutocomplete(makeAutocompleteDriver('/api', requester), 'USD').then(events => {
    assert.equal(events[0].loading, true)
    assert.equal(events[1].loading, false)
    assert.equal(calls.length, 2)
    assert.deepEqual(calls.map(call => call.query), [
      { name: 'USD', limit: 5, sort: 'name_asc' },
      { ticker: 'USD', limit: 5, sort: 'ticker_asc' },
    ])
    assert.ok(calls.every(call => !Object.prototype.hasOwnProperty.call(call.query, 'asset_id')))
  })
})

test('checks every exact hash category only at 64 characters', () => {
  const hash = 'a'.repeat(64)
      , base = '/api'
      , { calls, requester } = fakeRequester({
          [`${base}/tx/${hash}`]: { body: { txid: hash } },
          [`${base}/block/${hash}`]: { body: { id: hash, height: 1 } },
          [`${base}/asset/${hash}`]: { body: { asset_id: hash } },
        })
  return collectAutocomplete(makeAutocompleteDriver(base, requester), hash).then(events => {
    assert.equal(calls.length, 3)
    assert.deepEqual(events[1].results.map(result => result.category), [
      'assets',
      'blocks',
      'transactions',
    ])
  })
})

test('keeps a block hash result when the other exact-match sources are unavailable', () => {
  const hash = 'b'.repeat(64)
      , base = '/api'
      , networkError = new Error('unavailable')
      , { requester } = fakeRequester({
          [`${base}/tx/${hash}`]: networkError,
          [`${base}/block/${hash}`]: { body: { id: hash, height: 42 } },
          [`${base}/asset/${hash}`]: networkError,
        })

  return collectAutocomplete(makeAutocompleteDriver(base, requester), hash).then(events => {
    assert.equal(events[0].loading, true)
    assert.equal(events[1].loading, false)
    assert.deepEqual(events[1].results.map(result => result.category), [ 'blocks' ])
    assert.equal(events[1].results[0].block.height, 42)
  })
})

test('finishes gracefully when every autocomplete source is unavailable', () => {
  const hash = 'c'.repeat(64)
      , base = '/api'
      , { requester } = fakeRequester({
          [`${base}/tx/${hash}`]: new Error('transaction source unavailable'),
          [`${base}/block/${hash}`]: new Error('block source unavailable'),
          [`${base}/asset/${hash}`]: new Error('asset source unavailable'),
        })

  return collectAutocomplete(makeAutocompleteDriver(base, requester), hash).then(events => {
    assert.equal(events[0].loading, true)
    assert.deepEqual(events[1], { query: hash, loading: false, results: [] })
  })
})

test('debounces changed queries and clears immediately', () => {
  const scheduler = new TestScheduler((actual, expected) => assert.deepEqual(actual, expected))
      , input$ = new Subject()
      , emissions = []

  scheduler.maxFrames = 3000
  debounceAutocompleteQueries(input$, scheduler)
    .subscribe(query => emissions.push([ scheduler.frame, query ]))

  scheduler.schedule(() => input$.next('U'), 0)
  scheduler.schedule(() => input$.next('US'), 500)
  scheduler.schedule(() => input$.next(''), 1600)
  scheduler.schedule(() => input$.next('US'), 1700)
  scheduler.flush()

  assert.deepEqual(emissions, [
    [ 500 + autocompleteDelayMs, 'US' ],
    [ 1600, '' ],
    [ 1700 + autocompleteDelayMs, 'US' ],
  ])
})

test('deduplicates and ranks merged asset metadata results', () => {
  const firstId = '1'.repeat(64)
      , secondId = '2'.repeat(64)
      , thirdId = '3'.repeat(64)
      , results = mergeAssetResults([
          {
            field: 'name',
            assets: [
              { asset_id: firstId, name: 'Dollar', ticker: 'USD' },
              { asset_id: secondId, name: 'USD', ticker: null },
              { asset_id: thirdId, name: 'USD Coin', ticker: 'USDC' },
            ],
          },
          {
            field: 'ticker',
            assets: [ { asset_id: firstId, name: 'Dollar', ticker: 'USD' } ],
          },
        ], 'usd')

  assert.deepEqual(results.map(result => result.asset.asset_id), [ firstId, secondId, thirdId ])
})

test('renders categorized options and accessible active state', () => {
  const hash = 'a'.repeat(64)
      , vnode = search({
          t,
          autocomplete: {
            focused: true,
            dismissed: false,
            loading: false,
            activeIndex: 0,
            results: [
              {
                category: 'assets',
                id: `asset:${hash}`,
                pathname: `/asset/${hash}`,
                asset: { asset_id: hash, ticker: 'USDt', name: 'Tether USD' },
              },
              {
                category: 'transactions',
                id: `transaction:${hash}`,
                pathname: `/tx/${hash}`,
                txid: hash,
              },
            ],
          },
        })
      , html = render(vnode)
      , findOption = node => node && node.data && node.data.dataset && node.data.dataset.autocompleteIndex != null
        ? node
        : node && node.children && node.children.map(findOption).find(Boolean)
      , option = findOption(vnode)

  assert.match(html, /aria-expanded="true"/)
  assert.match(html, /aria-activedescendant="search-autocomplete-option-0"/)
  assert.match(html, /Assets \(1\)/)
  assert.match(html, /Transactions \(1\)/)
  assert.match(html, /search-autocomplete-option active/)
  assert.match(html, /USDt — Tether USD/)
  assert.ok(option)
  assert.equal(option.data.dataset.autocompleteIndex, 0)
  assert.equal(option.data.dataset['autocomplete-index'], undefined)
})
