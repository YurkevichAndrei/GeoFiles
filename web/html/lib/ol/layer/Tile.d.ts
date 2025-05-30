export default TileLayer;
/**
 * @classdesc
 * For layer sources that provide pre-rendered, tiled img in grids that are
 * organized by zoom levels for specific resolutions.
 * Note that any property set in the options is set as a {@link module:ol/Object~BaseObject}
 * property on the layer object; for example, setting `title: 'My Title'` in the
 * options means that `title` is observable, and has get/set accessors.
 *
 * @template {import("../source/Tile.js").default} [TileSourceType=import("../source/Tile.js").default]
 * @extends BaseTileLayer<TileSourceType, CanvasTileLayerRenderer>
 * @api
 */
declare class TileLayer<TileSourceType extends import("../source/Tile.js").default = import("../source/Tile.js").default<import("../Tile.js").default>> extends BaseTileLayer<TileSourceType, CanvasTileLayerRenderer<TileLayer<import("../source/Tile.js").default<import("../Tile.js").default>> | import("./VectorTile.js").default<import("../source.js").VectorTile<any>, any>>> {
    /**
     * @param {import("./BaseTile.js").Options<TileSourceType>} [options] Tile layer options.
     */
    constructor(options?: import("./BaseTile.js").Options<TileSourceType>);
    /**
     * @override
     */
    override createRenderer(): CanvasTileLayerRenderer<this>;
}
import CanvasTileLayerRenderer from '../renderer/canvas/TileLayer.js';
import BaseTileLayer from './BaseTile.js';
//# sourceMappingURL=Tile.d.ts.map