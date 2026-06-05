import Snabbdom from "snabbdom-pragma";

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

function blockStat(title, value) {
  return (
    <div className="pending-block-stat">
      <p className="pending-block-stat-header">{title}</p>
      <p className="pending-block-stat-value">{value}</p>
    </div>
  );
}

/* TODO: REMOVE THIS AND USE ACTUAL PENDING BLOCK FILL AFTER ENDPOINT CHANGE IS MADE ON ELECTRS */
const WIDTH = 23;

const blockDetailsCard = ({ block, detailsOpen }) => (
  <div className="block-details-card">
    <div className="block-details-card-summary">
      <div className="pending-block-grid">
        {makeBlockGrid(2_000_838, 15)}
      </div>

      <div className="pending-block-details">
        <div className="block-details-card-header">
          <p className="block-number">
            {block ? `#${block.height.toLocaleString()}` : "-"}
          </p>

          <p className="pending-block-timestamp">in ~10 minutes</p>
          <button
            className="block-details-button"
            type="button"
            data-togglePendingBlockDetails
          >
            <img className="plus" src="img/icons/plus.svg" /> Details
          </button>
        </div>

        <div className="pending-block-stats">
          {blockStat("AVG FEE", "-")}
          {blockStat("TRANSACTIONS", "-")}
          {blockStat("SIZE", "-")}
          {blockStat("TOTAL FEE COLLECTED", "-")}
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
                backgroundSize: `${100 * (100 / WIDTH)}%`,
              }}
            ></div>
          </div>

          <p className="target-text">Target: 2,845 tx</p>
        </div>
      </div>
    </div>

    {detailsOpen ? (
      <div className="expanded-block-details">
        <div className="expanded-pending-block-grid-container">
          <div className="pending-block-grid">
            {makeBlockGrid(2_000_838, 50)}
          </div>
        </div>
        <div className="expanded-block-details-stats">
          <div className="expanded-block-details-row">
            <div className="time-since-last-block">
              <p className="block-details-panel-title">
                Time Since Last Block
              </p>
              <p className="block-details-panel-value">8m 42s</p>

              <p className="block-details-panel-footer">Block #922,598</p>
            </div>
            <div className="block-transactions">
              <p className="block-details-panel-title">Transactions</p>
              <p className="block-details-panel-value">2,637</p>

              <p className="block-details-panel-footer">Target 2,986</p>
            </div>
          </div>
          <div className="expanded-block-details-row">
            <div className="low-fee">
              <p className="block-details-panel-title">Low</p>
              <p className="block-details-panel-value">1.3 sat/vB</p>

              <p className="block-details-panel-footer">0.0000046</p>
            </div>
            <div className="avg-fee">
              <p className="block-details-panel-title">Average</p>
              <p className="block-details-panel-value">1.3 sat/vB</p>

              <p className="block-details-panel-footer">0.0000046</p>
            </div>
            <div className="high-fee">
              <p className="block-details-panel-title">High</p>
              <p className="block-details-panel-value">1.3 sat/vB</p>

              <p className="block-details-panel-footer">0.0000046</p>
            </div>
          </div>
          <div className="expanded-block-details-row">
            <div className="total-fees-collected">
              <p className="block-details-panel-title">
                Total Fees Collected
              </p>
              <p className="block-details-panel-value">0.037 BTC</p>

              <p className="block-details-panel-footer">$2,482.29 USD</p>
            </div>
          </div>
          <div className="expanded-block-details-row-bigger">
            <div className="pending-transactions">
              <p className="block-details-panel-title">
                Pending Transactions
              </p>
              <p className="block-details-panel-value">45,823</p>
            </div>
            <div className="block-weight"></div>
          </div>
          <div className="expanded-block-details-row-bigger">
            <div className="mempool-congestion"></div>
            <div className="transaction-types"></div>
          </div>
        </div>
      </div>
    ) : (
      ""
    )}
  </div>
);

export default blockDetailsCard;
