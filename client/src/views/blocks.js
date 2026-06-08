import Snabbdom from "snabbdom-pragma";
import {
  formatNumber,
  formatRelativeTime,
  getBlockPercentageUsed,
  formatVMB,
} from "./util";
import blockDetailsCard from "./block-details-card";
import loader from "../components/loading";

const staticRoot = process.env.STATIC_ROOT || "";

export const blks = (blocks, viewMore, loadMore, { t, loading, ...S }) => (
  <div className="latest-blocks-container">
    <div className="blocks-heading">
      <div className="block-header-icon-container">
        <img src="img/icons/block-icon.svg" />
      </div>
      <h1 className="blocks-heading-title">Latest Blocks</h1>
      <img className="blocks-heading-tooltip" src="img/icons/tooltip.svg" />
    </div>

    {/* {viewMore
      ? blockDetailsCard({
          block: blocks?.[0] && { height: blocks[0].height + 1 },
          detailsOpen: S.pendingBlockDetailsOpen,
        })
      : ""}

    {viewMore ? (
      <svg className="blocks-history-divider" aria-hidden="true">
        <line x1="1" y1="2" x2="100%" y2="2" />
      </svg>
    ) : (
      ""
    )}
    {viewMore ? <p className="blocks-section-title">Blocks History</p> : ""} */}
    {!blocks ? (
      loader()
    ) : !blocks.length ? (
      <p>{t`No recent blocks`}</p>
    ) : (
      <div className="blocks-table">
        {blocks &&
          blocks.map((b, index) => (
            <a className="blocks-table-link-row" href={`block/${b.id}`}>
              <div className={`blocks-table-card ${index === 0 ? "first-blocks-table-card" : ""}`}>
                <div className="block-icon-container">
                  <img src="img/icons/block-icon.svg" />
                </div>
                <div className="block-details">
                  <div className="block-card-header">
                    <div className="block-card-top-header">
                        <p className="block-number">
                          #{b.height.toLocaleString()}
                        </p>
                      {index === 0 ? <div className="latest-block-badge">Latest</div> : ""}
                    </div>

                    <p
                      className="block-timestamp"
                      title={new Date(b.timestamp * 1000)}
                    >
                      {formatRelativeTime(b.timestamp)?.toUpperCase()}
                    </p>
                  </div>
                  <div className="block-card-body">
                    <div className="block-stat">
                      <div className="block-stat-title">TRANSACTIONS</div>
                      <div className="block-stat-value">
                        {formatNumber(b.tx_count).toLocaleString()}
                      </div>
                    </div>
                    <div className="block-stat">
                      <div className="block-stat-title">SIZE</div>
                      <div className="block-stat-value">
                        {formatVMB(b.size, "MB")}
                      </div>
                    </div>

                    {/* <div className="block-stat">
                      <div className="block-stat-title">MINER</div>
                      <div className="block-stat-value">
                        -
                      </div>
                    </div> */}
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
            </a>
          ))}
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
    {blocks && viewMore ? (
      <a className="view-more font-link-semibold" href="blocks/recent">
        <span>{t`See more`}</span>
        <div>
          <img alt="" src={`${staticRoot}img/icons/arrow-right-blue.svg`} />
        </div>
      </a>
    ) : (
      ""
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
