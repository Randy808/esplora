import { ArrowsInSimpleIcon } from "../components/icons";

const DIFFICULTY_PERIOD = 2016;
const TARGET_BLOCK_SECONDS = 10 * 60;

const formatAdjustment = value => {
  if (!Number.isFinite(value)) return "N/A";
  if (value === 0) return "0.00%";

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const adjustmentClass = value =>
  value > 0 ? "success" : value < 0 ? "danger" : "";

const expectedAdjustment = (latestBlock, epochStartBlock) => {
  if (
    !latestBlock ||
    !epochStartBlock ||
    epochStartBlock.requestedHeight !== latestBlock.height - (latestBlock.height % DIFFICULTY_PERIOD)
  ) {
    return null;
  }

  const blocksMined = latestBlock.height - epochStartBlock.height,
    actualSeconds = latestBlock.timestamp - epochStartBlock.timestamp,
    expectedSeconds = blocksMined * TARGET_BLOCK_SECONDS;

  if (blocksMined <= 0 || actualSeconds <= 0) return 0;

  return (expectedSeconds / actualSeconds - 1) * 100;
};

const previousAdjustment = (latestBlock, previousBlock) => {
  if (
    !latestBlock ||
    !previousBlock ||
    previousBlock.requestedHeight !== latestBlock.height - DIFFICULTY_PERIOD ||
    !Number.isFinite(latestBlock.difficulty) ||
    !Number.isFinite(previousBlock.difficulty) ||
    previousBlock.difficulty === 0
  ) {
    return null;
  }

  return (latestBlock.difficulty / previousBlock.difficulty - 1) * 100;
};

const blocksLeftInEpoch = latestBlock => {
  if (!latestBlock || !Number.isFinite(latestBlock.height)) return "N/A";

  return DIFFICULTY_PERIOD - 1 - (latestBlock.height % DIFFICULTY_PERIOD);
};

const stat = (title, value, className = "") =>
  <div className="difficulty-stat">
    <p className="difficulty-stat-title">{title}</p>
    <p className={`difficulty-stat-value ${className}`}>{value}</p>
  </div>;

const divider = () => <div className="divider"></div>;

export default ({ blocks, dashboardEpochStartBlock, dashboardPreviousDifficultyBlock }) => {
  const latestBlock = blocks && blocks[0],
    expected = expectedAdjustment(latestBlock, dashboardEpochStartBlock),
    previous = previousAdjustment(latestBlock, dashboardPreviousDifficultyBlock);

  return (
    <div className="difficulty-adjustment">
      <div className="table-header">
        <div className="table-header-icon-container">
          <ArrowsInSimpleIcon />
        </div>
        <h1 className="table-header-title">Difficulty Adjustment</h1>
      </div>
      <div className="difficulty-adjustment-body">
        {stat("AVERAGE BLOCK TIME", "~10 minutes")}

        {divider()}
        {stat("EXPECTED", formatAdjustment(expected), adjustmentClass(expected))}

        {divider()}
        {stat("PREVIOUS", formatAdjustment(previous), adjustmentClass(previous))}

        {divider()}
        {stat("BLOCKS LEFT", blocksLeftInEpoch(latestBlock))}
      </div>
    </div>
  );
};
