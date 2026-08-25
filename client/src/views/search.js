import { loadingRing } from '../components/loading'
import {
  DefaultAssetIcon,
  BlockIcon,
  TxArrowsIcon,
  AddressHamburgerIcon,
} from '../components/icons'

const staticRoot = process.env.STATIC_ROOT || ''
const hasCam = process.browser && navigator.mediaDevices && navigator.mediaDevices.getUserMedia

const categoryOrder = [ 'assets', 'blocks', 'transactions', 'addresses' ]
    , categoryLabel = category => category == 'assets' ? 'Assets'
      : category == 'blocks' ? 'Blocks'
      : category == 'transactions' ? 'Transactions'
      : 'Addresses'
    , categoryIcon = category => category == 'assets' ? <DefaultAssetIcon />
      : category == 'blocks' ? <BlockIcon />
      : category == 'transactions' ? <TxArrowsIcon />
      : <AddressHamburgerIcon />
    , assetDomain = asset => asset && asset.entity && asset.entity.domain
    , assetPrimary = asset => {
        const ticker = asset && asset.ticker
            , name = asset && asset.name

        return ticker && name ? `${ticker} — ${name}`
          : name || ticker || assetDomain(asset) || asset && asset.asset_id
      }

const resultContent = result => {
  if (result.category == 'assets') {
    const asset = result.asset || {}
        , primary = assetPrimary(asset)
        , assetId = asset.asset_id

    return [
      <span className="search-autocomplete-primary">{primary}</span>,
      primary != assetId ? <span className="search-autocomplete-secondary mono">{assetId}</span> : ''
    ]
  }

  if (result.category == 'blocks') {
    const height = result.block && result.block.height
    return [
      <span className="search-autocomplete-primary">{height != null ? `Block #${height}` : 'Block'}</span>,
      <span className="search-autocomplete-secondary mono">{result.hash}</span>
    ]
  }

  return <span className="search-autocomplete-primary mono">
    {result.category == 'transactions' ? result.txid : result.address}
  </span>
}

const autocompleteResults = ({ results, activeIndex }) => {
  const indexedResults = results.map((result, index) => ({ result, index }))

  return <div className="search-autocomplete-results" id="search-autocomplete-results" role="listbox">
    {categoryOrder.map(category => {
      const matches = indexedResults.filter(({ result }) => result.category == category)
          , headingId = `search-autocomplete-${category}`

      return matches.length ? <div className="search-autocomplete-group" role="group" aria-labelledby={headingId} key={category}>
        <div className="search-autocomplete-heading" id={headingId}>
          <span className="search-autocomplete-heading-icon">{categoryIcon(category)}</span>
          <span>{`${categoryLabel(category)} (${matches.length})`}</span>
        </div>
        {matches.map(({ result, index }) =>
          <a
            className={`search-autocomplete-option${activeIndex == index ? ' active' : ''}`}
            id={`search-autocomplete-option-${index}`}
            href={result.pathname.substr(1)}
            role="option"
            aria-selected={activeIndex == index ? 'true' : 'false'}
            data-autocompleteIndex={index}
            key={result.id}
          >
            {resultContent(result)}
          </a>
        )}
      </div> : ''
    })}
  </div>
}

export default ({ t, klass, autofocus, autocomplete }) => {
  const {
    results=[],
    loading=false,
    focused=false,
    dismissed=false,
    activeIndex=-1,
  } = autocomplete || {}
      , expanded = focused && !dismissed && !!results.length

  return <form className="search" action={process.browser?undefined:"search"}>
      <div className={`search-bar${klass?` ${klass}` : ''}`}>
        <button className="search-bar-submit" type="submit" aria-label={t`Search`}>
          { loading
            ? <span className="search-bar-loading spinner" aria-hidden="true">{loadingRing('small')}</span>
            : <img src={`${staticRoot}img/icons/magnifying-glass.svg`} alt="" /> }
        </button>
        <input
          className="form-control search-bar-input"
          type="search"
          name="q"
          placeholder={t`Search for block height, hash, transaction, or address`}
          aria-label="Search"
          aria-autocomplete="list"
          aria-busy={loading ? 'true' : 'false'}
          aria-controls="search-autocomplete-results"
          aria-expanded={expanded ? 'true' : 'false'}
          aria-activedescendant={expanded && activeIndex >= 0 ? `search-autocomplete-option-${activeIndex}` : undefined}
          role="combobox"
          autofocus={!!autofocus}
          required
          autocomplete="off"
        />
        <p className="search-focus-hotkey">⌘K</p>
        { hasCam ? <a className="qrcode-link" href="scan-qr"><img src={`${staticRoot}img/icons/qrcode.svg`}/></a>: "" }
      </div>
      { expanded ? autocompleteResults({ results, activeIndex }) : '' }
    </form>
}
