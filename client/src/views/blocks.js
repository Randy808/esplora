import Snabbdom from "snabbdom-pragma";
import { formatTime, formatNumber } from "./util";
import loader from "../components/loading";

const staticRoot = process.env.STATIC_ROOT || "";

function getBlockPercentageUsed(blockWeight) {
  return Math.round((blockWeight / 4_000_000) * 10_000) / 100;
}

function timeAgo(fromDate, toDate = new Date()) {
  if (typeof fromDate === "number") {
    // Treat 10-digit Unix timestamps as seconds, 13-digit as milliseconds
    fromDate = fromDate < 1e12
      ? new Date(fromDate * 1000)
      : new Date(fromDate);
  }

  const diffMs = toDate - fromDate;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
}

function makeRows(blockWeight) {
  let GRID_LENGTH = 15;
  let percentFilled = Math.ceil(
    (blockWeight / 4_000_000) * (GRID_LENGTH * GRID_LENGTH),
  );
  let el = [];
  for (let i = 0; i < 15; i++) {
    let h = [];
    for (let i = 0; i < 15; i++) {
      h.push(
        <div
          className={`title-block-square ${percentFilled > 0 ? "title-block-square-used" : ""}`}
        ></div>,
      );

      if (percentFilled > 0) {
        percentFilled--;
      }
    }
    el.push(<div className="title-block-square-row">{h}</div>);
  }

  return el;
}

function getPendingBlockStat(title, value) {
  return (
    <div className="pending-block-stat">
      <p className="pending-block-stat-header">{title}</p>
      <p className="pending-block-stat-value">{value}</p>
    </div>
  );
}

/* TODO: REMOVE THIS AND USE ACTUAL PENDING BLOCK FILL AFTER ENDPOINT CHANGE IS MADE ON ELECTRS */
const WIDTH = 23;

export const blks = (blocks, viewMore, loadMore, { t, loading, ...S }) => (
  <div className="block-container">
    <div className="table-heading">
      <div className="block-header-icon-container">
        <img src="img/icons/block-icon.svg" />
      </div>
      <h1 className="table-heading-title">Latest Blocks</h1>
      <img className="table-heading-tooltip" src="img/icons/tooltip.svg" />
    </div>

    <div className="title-row">
      <div className="block-template">{makeRows(2_000_838)}</div>

      <div className="pending-block-details">
        <div className="header">
          <p className="block-number">#{(blocks?.[0]?.height + 1).toLocaleString()}</p>

          <p className="header-timestamp">in ~10 minutes</p>
        </div>

        <div className="pending-block-stats">
          {getPendingBlockStat("AVG FEE", "-")}
          {getPendingBlockStat("TRANSACTIONS", "-")}
          {getPendingBlockStat("SIZE", "-")}
          {getPendingBlockStat("TOTAL FEE COLLECTED", "-")}
        </div>

        <div className="progress-section">
          <div className="block-filling">
            <p className="block-filling-text">Block filling</p>
             <div>
                <p className="usage-number">
                  {WIDTH}%
                </p>{" "}
                <div className="tootlip"></div>
              </div>
          </div>

          <div className="pending-usage-bar">
            <div
              className="pending-usage-bar-fill"
              style={{
                width: `${WIDTH}%`,
                backgroundSize: `${100*(100/WIDTH)}%`,
              }}
            ></div>
          </div>

          <p className="target-text">Target: 2,845 tx</p>

        </div>


      </div>
    </div>

    <svg className="dashed-line" aria-hidden="true">
  <line x1="1" y1="2" x2="100%" y2="2" />
</svg>
    <p className="section-title">Blocks History</p>
    {!blocks ? (
      loader()
    ) : !blocks.length ? (
      <p>{t`No recent blocks`}</p>
    ) : (
      <div className="blocks-table">
        {blocks &&
          blocks.map((b) => (
            <div className="blocks-table-link-row">
              <div className="blocks-table-row-2">
                <div className="block-icon-container">
                  <img src="img/icons/block-icon.svg" />
                </div>
                <div className="block-details">
                  <div className="header">
                    <a href={`block/${b.id}`}>
                      <p className="block-number">#{b.height.toLocaleString()}</p>
                    </a>

                    <p className="header-timestamp" title={new Date(b.timestamp*1000)}>{timeAgo(b.timestamp)}</p>
                  </div>
                  <div className="body-block">
                    <div>
                      <div className="block-details-2">
                        <p>~2 sats vbyte</p>
                        <p>{formatNumber(b.tx_count).toLocaleString()} Transactions</p>
                        <p>{formatNumber(b.size / 1_000_000).toLocaleString()} MB</p>
                      </div>

                      <div className="block-bottom-details">
                        <div className="mining-details">
                          <p className="mining-fees">1 BTC</p>
                          <p className="mining-pool">AntPool</p>
                        </div>
                      </div>
                    </div>
                    <div className="block-usage">
                      <div className="usage-and-tooltip">
                        <p className="usage-number">
                          {getBlockPercentageUsed(b.weight)}%
                        </p>{" "}
                        <div className="tootlip"></div>
                      </div>
                      <div className="usage-bar">
                        <div
                          className="usage-bar-fill"
                          style={{
                            width: Math.round(b.weight / 4_000_000, 2) * 100,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        {blocks && viewMore ? (
          <a className="view-more font-link-semibold" href="blocks/recent">
            <span>{t`View more blocks`}</span>
            <div>
              <img alt="" src={`${staticRoot}img/icons/arrow_right_blu.png`} />
            </div>
          </a>
        ) : (
          ""
        )}
        {loadMore ? (
          <div className="load-more-container">
            <div>
              {loading ? (
                <div className="load-more disabled">
                  <span>{t`Load more`}</span>
                  <div>{loader("small")}</div>
                </div>
              ) : (
                pagingNav({ ...S, t })
              )}
            </div>
          </div>
        ) : (
          ""
        )}
      </div>
    )}
  </div>
);

const pagingNav = ({ nextBlocks, prevBlocks, t }) =>
  process.browser
    ? nextBlocks != null && (
        <div
          className="load-more g-btn primary-btn font-btn-2"
          role="button"
          data-loadmoreBlockHeight={"" + nextBlocks}
        >
          {t`Load more`}
        </div>
      )
    : [
        prevBlocks != null && (
          <a className="load-more" href={`blocks/recent/?start=${prevBlocks}`}>
            <div>
              <img alt="" src={`${staticRoot}img/icons/arrow_left_blu.png`} />
            </div>
            <span>{t`Newer`}</span>
          </a>
        ),
        nextBlocks != null && (
          <a className="load-more" href={`blocks/recent/?start=${nextBlocks}`}>
            <span>{t`Older`}</span>
            <div>
              <img alt="" src={`${staticRoot}img/icons/arrow_right_blu.png`} />
            </div>
          </a>
        ),
      ];
