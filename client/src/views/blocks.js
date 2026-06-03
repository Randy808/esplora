import Snabbdom from "snabbdom-pragma";
import { formatNumber, formatRelativeTime, getBlockPercentageUsed } from "./util";
import loader from "../components/loading";

const staticRoot = process.env.STATIC_ROOT || "";

function makeBlockGrid(blockWeight, gridLength) {
  let percentFilled = Math.ceil(
    (blockWeight / 4_000_000) * (gridLength * gridLength),
  );
  let el = [];
  for (let i = 0; i < gridLength; i++) {
    let h = [];
    for (let i = 0; i < gridLength; i++) {
      h.push(
        <div
          className={`pending-block-grid-cell ${percentFilled > 0 ? "pending-block-grid-cell-filled" : ""}`}
        ></div>,
      );

      if (percentFilled > 0) {
        percentFilled--;
      }
    }
    el.push(<div className="pending-block-grid-row">{h}</div>);
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
  <div className="latest-blocks-container">
    <div className="blocks-heading">
      <div className="block-header-icon-container">
        <img src="img/icons/block-icon.svg" />
      </div>
      <h1 className="blocks-heading-title">Latest Blocks</h1>
      <img className="blocks-heading-tooltip" src="img/icons/tooltip.svg" />
    </div>

    {viewMore ? <div className="pending-block-card">

      <div className="pending-block-card-summary">
        <div className="pending-block-grid">{makeBlockGrid(2_000_838, 15)}</div>

        <div className="pending-block-details">
          <div className="block-card-header">
            <p className="block-number">
              {blocks?.[0] ? `#${(blocks[0].height + 1).toLocaleString()}` : "-"}
            </p>

            <p className="block-timestamp">in ~10 minutes</p>
            <button className="block-details-button" type="button" data-togglePendingBlockDetails>
              <img className="plus" src="img/icons/plus.svg"/> Details
            </button>
          </div>

          <div className="pending-block-stats">
            {getPendingBlockStat("AVG FEE", "-")}
            {getPendingBlockStat("TRANSACTIONS", "-")}
            {getPendingBlockStat("SIZE", "-")}
            {getPendingBlockStat("TOTAL FEE COLLECTED", "-")}
          </div>

          <div className="pending-block-progress">
            <div className="block-filling">
              <p className="block-filling-text">Block filling</p>
              <div>
                <p className="usage-number">{WIDTH}%</p>{" "}
                <div className="tooltip-icon"></div>
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

      { S.pendingBlockDetailsOpen ? <div className="expanded-block-details">
        <div className="expanded-pending-block-grid-container">
          <div className="pending-block-grid">
            {makeBlockGrid(2_000_838, 50)}
          </div>
        </div>
        <div className="expanded-block-details-stats">
          <div className="expanded-block-details-row">
            <div class="time-since-last-block">
                <p className="block-details-panel-title">Time Since Last Block</p>
                <p className="block-details-panel-value">8m 42s</p>

                <p className="block-details-panel-footer">Block #922,598
                </p>
            </div>
            <div className="block-transactions"></div>
          </div>
          <div className="expanded-block-details-row">
            <div className="low-fee"></div>
            <div className="avg-fee"></div>
            <div className="high-fee"></div>
          </div>
          <div className="expanded-block-details-row">
            <div className="total-fees-collected"></div>
          </div>
          <div className="expanded-block-details-row-bigger">
            <div className="pending-transactions"></div>
            <div className="block-weight"></div>
          </div>
          <div className="expanded-block-details-row-bigger">
            <div className="mempool-congestion"></div>
            <div className="transaction-types"></div>
          </div>
        </div>
      </div> : ""}
    </div> : ""}

    {viewMore ? <svg className="blocks-history-divider" aria-hidden="true">
      <line x1="1" y1="2" x2="100%" y2="2" />
    </svg> : ""}
    <p className="blocks-section-title">Blocks History</p>
    {!blocks ? (
      loader()
    ) : !blocks.length ? (
      <p>{t`No recent blocks`}</p>
    ) : (
      <div className="blocks-table">
        {blocks &&
          blocks.map((b) => (
            <div className="blocks-table-link-row">
              <div className="blocks-table-card">
                <div className="block-icon-container">
                  <img src="img/icons/block-icon.svg" />
                </div>
                <div className="block-details">
                  <div className="block-card-header">
                    <a href={`block/${b.id}`}>
                      <p className="block-number">#{b.height.toLocaleString()}</p>
                    </a>

                    <p className="block-timestamp" title={new Date(b.timestamp * 1000)}>{formatRelativeTime(b.timestamp)}</p>
                  </div>
                  <div className="block-card-body">
                    <div>
                      <div className="block-summary">
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
                        <div className="tooltip-icon"></div>
                      </div>
                      <div className="usage-bar">
                        <div
                          className="usage-bar-fill"
                          style={{
                            width: `${getBlockPercentageUsed(b.weight)}%`,
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
