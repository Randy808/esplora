import Snabbdom from "snabbdom-pragma";
import { formatSat, formatNumber } from "./util";
import loader from "../components/loading";

const staticRoot = process.env.STATIC_ROOT || "";

export const transactions = (txs, viewMore, { t }) => (
  <div className="tx-container">
    {!txs ? (
      loader()
    ) : !txs.length ? (
      <p>{t`No recent transactions`}</p>
    ) : (
      <div className="transactions-table-2">
        {/* <h3 className="table-title font-h3">{t`Latest Transactions`}</h3>
            <div className="transactions-table-row header">
              <div className="transactions-table-cell font-h4">{t`Transaction ID`}</div>
              { txs[0].value != null && <div className="transactions-table-cell font-h4">{t`Value`}</div> }
              <div className="transactions-table-cell font-h4">{t`Size`}</div>
              <div className="transactions-table-cell font-h4">{t`Fee`}</div>
            </div>
            {txs.map(txOverview => { const feerate = txOverview.fee/txOverview.vsize; return (
              <div className="transactions-table-link-row">
                <a className="transactions-table-row transaction-data" href={`tx/${txOverview.txid}`}>
                  <div className="transactions-table-cell highlighted-text" data-label={t`TXID`}>{txOverview.txid}</div>
                  { txOverview.value != null && <div className="transactions-table-cell" data-label={t`Value`}>{formatSat(txOverview.value)}</div> }
                  <div className="transactions-table-cell" data-label={t`Size`}>{`${formatNumber(txOverview.vsize)} vB`}</div>
                  <div className="transactions-table-cell" data-label={t`Fee`}>{`${feerate.toFixed(1)} sat/vB`}</div>
                </a>
              </div>
            )})} */}

        <div className="blocks-heading">
          <div className="block-header-icon-container">
            <img src="img/icons/block-icon.svg" />
          </div>
          <h1 className="blocks-heading-title">Latest Transactions</h1>
          <img className="blocks-heading-tooltip" src="img/icons/tooltip.svg" />
        </div>

        <div className="transaction-table-title-row">
          <div className="transaction-table-transaction-id">TRANSACTION ID</div>
          <div className="transaction-table-transaction-value">VALUE</div>
          <div className="transaction-table-transaction-size">SIZE</div>
          <div className="transaction-table-transaction-fee">
            FEE
            <img
              className="blocks-heading-tooltip"
              src="img/icons/tooltip.svg"
            />
          </div>
        </div>

        <div className="transaction-table-body">
          {txs.map((txOverview) => {
            const feerate = txOverview.fee / txOverview.vsize;
            return (
              <div className="transaction-table-row">
                <div className="transaction-table-transaction-id">
                  78b9f...92754
                </div>
                <div className="transaction-table-transaction-value">
                  {formatSat(txOverview.value)}
                </div>
                <div className="transaction-table-transaction-size">{`${formatNumber(txOverview.vsize)} vB`}</div>
                <div className="transaction-table-transaction-fee">{`${feerate.toFixed(1)} sat/vB`}</div>
              </div>
            );
          })}
        </div>

        {txs && viewMore ? (
          <a className="view-more font-link-semibold" href="tx/recent">
            <span>{t`View more transactions`}</span>
            <div>
              <img alt="" src={`${staticRoot}img/icons/arrow_right_blu.png`} />
            </div>
          </a>
        ) : (
          ""
        )}
      </div>
    )}
  </div>
);
