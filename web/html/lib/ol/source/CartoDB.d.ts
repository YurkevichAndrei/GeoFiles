export default CartoDB;
export type Options = {
    /**
     * Attributions.
     */
    attributions?: import("./Source.js").AttributionLike | undefined;
    /**
     * Deprecated.  Use the cacheSize option on the layer instead.
     */
    cacheSize?: number | undefined;
    /**
     * The `crossOrigin` attribute for loaded img.  Note that
     * you must provide a `crossOrigin` value if you want to access pixel data with the Canvas renderer.
     * See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more detail.
     */
    crossOrigin?: string | null | undefined;
    /**
     * Projection.
     */
    projection?: import("../proj.js").ProjectionLike;
    /**
     * Max zoom.
     */
    maxZoom?: number | undefined;
    /**
     * Minimum zoom.
     */
    minZoom?: number | undefined;
    /**
     * Whether to wrap the world horizontally.
     */
    wrapX?: boolean | undefined;
    /**
     * If using anonymous maps, the CartoDB config.json to use. See
     * https://carto.com/developers/maps-api/guides/anonymous-maps/
     * for more detail.
     * If using named maps, a key-value lookup with the template parameters.
     * See https://carto.com/developers/maps-api/guides/named-maps/
     * for more detail.
     */
    config?: any;
    /**
     * If using named maps, this will be the name of the template to load.
     * See https://carto.com/developers/maps-api/guides/named-maps/
     * for more detail.
     */
    map?: string | undefined;
    /**
     * Username as used to access public Carto dashboard at https://{username}.carto.com/.
     */
    account?: string | undefined;
    /**
     * Duration of the opacity transition for rendering.
     * To disable the opacity transition, pass `transition: 0`.
     */
    transition?: number | undefined;
    /**
     * Choose whether to use tiles with a higher or lower zoom level when between integer
     * zoom levels. See {@link module :ol/tilegrid/TileGrid~TileGrid#getZForResolution}.
     */
    zDirection?: number | import("../array.js").NearestDirectionFunction | undefined;
};
export type CartoDBLayerInfo = {
    /**
     * The layer group ID
     */
    layergroupid: string;
    /**
     * The CDN URL
     */
    cdn_url: {
        https: string;
    };
};
/**
 * @typedef {Object} Options
 * @property {import("./Source.js").AttributionLike} [attributions] Attributions.
 * @property {number} [cacheSize] Deprecated.  Use the cacheSize option on the layer instead.
 * @property {null|string} [crossOrigin] The `crossOrigin` attribute for loaded img.  Note that
 * you must provide a `crossOrigin` value if you want to access pixel data with the Canvas renderer.
 * See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more detail.
 * @property {import("../proj.js").ProjectionLike} [projection='EPSG:3857'] Projection.
 * @property {number} [maxZoom=18] Max zoom.
 * @property {number} [minZoom] Minimum zoom.
 * @property {boolean} [wrapX=true] Whether to wrap the world horizontally.
 * @property {Object} [config] If using anonymous maps, the CartoDB config.json to use. See
 * https://carto.com/developers/maps-api/guides/anonymous-maps/
 * for more detail.
 * If using named maps, a key-value lookup with the template parameters.
 * See https://carto.com/developers/maps-api/guides/named-maps/
 * for more detail.
 * @property {string} [map] If using named maps, this will be the name of the template to load.
 * See https://carto.com/developers/maps-api/guides/named-maps/
 * for more detail.
 * @property {string} [account] Username as used to access public Carto dashboard at https://{username}.carto.com/.
 * @property {number} [transition=250] Duration of the opacity transition for rendering.
 * To disable the opacity transition, pass `transition: 0`.
 * @property {number|import("../array.js").NearestDirectionFunction} [zDirection=0]
 * Choose whether to use tiles with a higher or lower zoom level when between integer
 * zoom levels. See {@link module:ol/tilegrid/TileGrid~TileGrid#getZForResolution}.
 */
/**
 * @typedef {Object} CartoDBLayerInfo
 * @property {string} layergroupid The layer group ID
 * @property {{https: string}} cdn_url The CDN URL
 */
/**
 * @classdesc
 * Layer source for the CartoDB Maps API.
 * @api
 */
declare class CartoDB extends XYZ {
    /**
     * @param {Options} options CartoDB options.
     */
    constructor(options: Options);
    /**
     * @type {string}
     * @private
     */
    private account_;
    /**
     * @type {string}
     * @private
     */
    private mapId_;
    /**
     * @type {!Object}
     * @private
     */
    private config_;
    /**
     * @type {!Object<string, CartoDBLayerInfo>}
     * @private
     */
    private templateCache_;
    /**
     * Returns the current config.json.
     * @return {!Object} The current configuration.
     * @api
     */
    getConfig(): any;
    /**
     * Updates the carto db config.json.
     * @param {Object} config a key-value lookup. Values will replace current values
     *     in the config.json.
     * @api
     */
    updateConfig(config: any): void;
    /**
     * Sets the CartoDB config.json
     * @param {Object} config In the case of anonymous maps, a CartoDB configuration
     *     object.
     * If using named maps, a key-value lookup with the template parameters.
     * @api
     */
    setConfig(config: any): void;
    /**
     * Issue a request to initialize the CartoDB map.
     * @private
     */
    private initializeMap_;
    /**
     * Handle map initialization response.
     * @param {string} paramHash a hash representing the parameter set that was used
     *     for the request
     * @param {Event} event Event.
     * @private
     */
    private handleInitResponse_;
    /**
     * @private
     * @param {Event} event Event.
     */
    private handleInitError_;
    /**
     * Apply the new tile urls returned by carto db
     * @param {CartoDBLayerInfo} data Result of carto db call.
     * @private
     */
    private applyTemplate_;
}
import XYZ from './XYZ.js';
//# sourceMappingURL=CartoDB.d.ts.map