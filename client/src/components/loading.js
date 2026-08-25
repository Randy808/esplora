export const loadingRing = size => <span className={`ring${size ? ` ${size}` : ''}`}></span>

export default (size) =>
        <div className="loading-container">
            <div className="spinner">
                <div className={`ring ${size}`}></div>
            </div>
        </div>
