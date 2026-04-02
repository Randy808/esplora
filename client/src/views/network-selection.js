import Snabbdom from "snabbdom-pragma";
import navToggle from "./nav-toggle";

const items = process.env.MENU_ITEMS && JSON.parse(process.env.MENU_ITEMS),
  active = process.env.MENU_ACTIVE;

const staticRoot = process.env.STATIC_ROOT || "";

export default ({ t, theme, page }) => (
  <div className="main-nav-container">
    <ul className="main-nav">
      <li id={active.replace(/ /g, "")} className={`nav-item active`}>
        <a
          className="nav-link font-h4"
          href={Object.entries(items).find((i) => i.name === active)?.url}
          rel="external"
        >
          <span>
            <img
              className="menu-logo"
              alt=""
              src={`${staticRoot}img/icons/${active.replace(/ /g, "")}-menu-logo.svg`}
            />
          </span>
          <span>{t(active)}</span>
          <img src={`${staticRoot}img/icons/angle-down.svg`} />
        </a>

        <div className="network-hover-menu-container">
          <div className="network-hover-menu">
            {items &&
              Object.entries(items).map(([name, url]) => {
                return (
                  <a
                    id={name.replace(/ /g, "")}
                    href={url}
                    className={`network-hover-menu-option-container ${name.replace(/ /g, "").toLowerCase()} ${name === active ? "active" : ""}`}
                  >
                    <div
                      id={name.replace(/ /g, "")}
                      className={`network-hover-menu-option`}
                    >
                      <span>
                        <img
                          className="menu-logo"
                          src={`${staticRoot}img/icons/${name.replace(/ /g, "")}-menu-logo.svg`}
                        />
                      </span>
                      {name}
                    </div>
                  </a>
                );
              })}
          </div>
        </div>
      </li>
    </ul>
  </div>
);
