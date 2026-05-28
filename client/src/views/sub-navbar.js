import Snabbdom from 'snabbdom-pragma'
import search from './search'
import menu from './navbar-menu'
import networkSelection from './network-selection'

export default ( t, isTouch, activeTab, theme, page) =>
  <div className="sub-navbar">
    <div className="container sub-nav-container">
      { networkSelection({t, theme, page}) }
      { search({ t, autofocus: !isTouch }) }
    </div>
  </div>