/**
 * @module ol/style/RegularShape
 */

import IconImage from './IconImage.js';
import ImageState from '../ImageState.js';
import ImageStyle from './Image.js';
import {asArray} from '../color.js';
import {asColorLike} from '../colorlike.js';
import {createCanvasContext2D} from '../dom.js';
import {
  defaultFillStyle,
  defaultLineCap,
  defaultLineJoin,
  defaultLineWidth,
  defaultMiterLimit,
  defaultStrokeStyle,
} from '../render/canvas.js';
import {shared as iconImageCache} from './IconImageCache.js';

/**
 * Specify radius for regular polygons, or both radius and radius2 for stars.
 * @typedef {Object} Options
 * @property {import("./Fill.js").default} [fill] Fill style.
 * @property {number} points Number of points for stars and regular polygons. In case of a polygon, the number of points
 * is the number of sides.
 * @property {number} radius Radius of a regular polygon.
 * @property {number} [radius2] Second radius to make a star instead of a regular polygon.
 * @property {number} [angle=0] Shape's angle in radians. A value of 0 will have one of the shape's points facing up.
 * @property {Array<number>} [displacement=[0, 0]] Displacement of the shape in pixels.
 * Positive values will shift the shape right and up.
 * @property {import("./Stroke.js").default} [stroke] Stroke style.
 * @property {number} [rotation=0] Rotation in radians (positive rotation clockwise).
 * @property {boolean} [rotateWithView=false] Whether to rotate the shape with the view.
 * @property {number|import("../size.js").Size} [scale=1] Scale. Unless two dimensional scaling is required a better
 * result may be obtained with appropriate settings for `radius` and `radius2`.
 * @property {import('./Style.js').DeclutterMode} [declutterMode] Declutter mode.
 */

/**
 * @typedef {Object} RenderOptions
 * @property {import("../colorlike.js").ColorLike|undefined} strokeStyle StrokeStyle.
 * @property {number} strokeWidth StrokeWidth.
 * @property {number} size Size.
 * @property {CanvasLineCap} lineCap LineCap.
 * @property {Array<number>|null} lineDash LineDash.
 * @property {number} lineDashOffset LineDashOffset.
 * @property {CanvasLineJoin} lineJoin LineJoin.
 * @property {number} miterLimit MiterLimit.
 */

/**
 * @classdesc
 * Set regular shape style for vector features. The resulting shape will be
 * a regular polygon when `radius` is provided, or a star when both `radius` and
 * `radius2` are provided.
 * @api
 */
class RegularShape extends ImageStyle {
  /**
   * @param {Options} options Options.
   */
  constructor(options) {
    super({
      opacity: 1,
      rotateWithView:
        options.rotateWithView !== undefined ? options.rotateWithView : false,
      rotation: options.rotation !== undefined ? options.rotation : 0,
      scale: options.scale !== undefined ? options.scale : 1,
      displacement:
        options.displacement !== undefined ? options.displacement : [0, 0],
      declutterMode: options.declutterMode,
    });

    /**
     * @private
     * @type {HTMLCanvasElement|null}
     */
    this.hitDetectionCanvas_ = null;

    /**
     * @private
     * @type {import("./Fill.js").default|null}
     */
    this.fill_ = options.fill !== undefined ? options.fill : null;

    /**
     * @private
     * @type {Array<number>}
     */
    this.origin_ = [0, 0];

    /**
     * @private
     * @type {number}
     */
    this.points_ = options.points;

    /**
     * @protected
     * @type {number}
     */
    this.radius = options.radius;

    /**
     * @private
     * @type {number|undefined}
     */
    this.radius2_ = options.radius2;

    /**
     * @private
     * @type {number}
     */
    this.angle_ = options.angle !== undefined ? options.angle : 0;

    /**
     * @private
     * @type {import("./Stroke.js").default|null}
     */
    this.stroke_ = options.stroke !== undefined ? options.stroke : null;

    /**
     * @private
     * @type {import("../size.js").Size}
     */
    this.size_;

    /**
     * @private
     * @type {RenderOptions}
     */
    this.renderOptions_;

    /**
     * @private
     */
    this.imageState_ =
      this.fill_ && this.fill_.loading()
        ? ImageState.LOADING
        : ImageState.LOADED;
    if (this.imageState_ === ImageState.LOADING) {
      this.ready().then(() => (this.imageState_ = ImageState.LOADED));
    }
    this.render();
  }

  /**
   * Clones the style.
   * @return {RegularShape} The cloned style.
   * @api
   * @override
   */
  clone() {
    const scale = this.getScale();
    const style = new RegularShape({
      fill: this.getFill() ? this.getFill().clone() : undefined,
      points: this.getPoints(),
      radius: this.getRadius(),
      radius2: this.getRadius2(),
      angle: this.getAngle(),
      stroke: this.getStroke() ? this.getStroke().clone() : undefined,
      rotation: this.getRotation(),
      rotateWithView: this.getRotateWithView(),
      scale: Array.isArray(scale) ? scale.slice() : scale,
      displacement: this.getDisplacement().slice(),
      declutterMode: this.getDeclutterMode(),
    });
    style.setOpacity(this.getOpacity());
    return style;
  }

  /**
   * Get the anchor point in pixels. The anchor determines the center point for the
   * symbolizer.
   * @return {Array<number>} Anchor.
   * @api
   * @override
   */
  getAnchor() {
    const size = this.size_;
    const displacement = this.getDisplacement();
    const scale = this.getScaleArray();
    // anchor is scaled by renderer but displacement should not be scaled
    // so divide by scale here
    return [
      size[0] / 2 - displacement[0] / scale[0],
      size[1] / 2 + displacement[1] / scale[1],
    ];
  }

  /**
   * Get the angle used in generating the shape.
   * @return {number} Shape's rotation in radians.
   * @api
   */
  getAngle() {
    return this.angle_;
  }

  /**
   * Get the fill style for the shape.
   * @return {import("./Fill.js").default|null} Fill style.
   * @api
   */
  getFill() {
    return this.fill_;
  }

  /**
   * Set the fill style.
   * @param {import("./Fill.js").default|null} fill Fill style.
   * @api
   */
  setFill(fill) {
    this.fill_ = fill;
    this.render();
  }

  /**
   * @return {HTMLCanvasElement} Image element.
   * @override
   */
  getHitDetectionImage() {
    if (!this.hitDetectionCanvas_) {
      this.hitDetectionCanvas_ = this.createHitDetectionCanvas_(
        this.renderOptions_,
      );
    }
    return this.hitDetectionCanvas_;
  }

  /**
   * Get the image icon.
   * @param {number} pixelRatio Pixel ratio.
   * @return {HTMLCanvasElement} Image or Canvas element.
   * @api
   * @override
   */
  getImage(pixelRatio) {
    const fillKey = this.fill_?.getKey();
    const cacheKey =
      `${pixelRatio},${this.angle_},${this.radius},${this.radius2_},${this.points_},${fillKey}` +
      Object.values(this.renderOptions_).join(',');
    let image = /** @type {HTMLCanvasElement} */ (
      iconImageCache.get(cacheKey, null, null)?.getImage(1)
    );
    if (!image) {
      const renderOptions = this.renderOptions_;
      const size = Math.ceil(renderOptions.size * pixelRatio);
      const context = createCanvasContext2D(size, size);
      this.draw_(renderOptions, context, pixelRatio);

      image = context.canvas;
      iconImageCache.set(
        cacheKey,
        null,
        null,
        new IconImage(image, undefined, null, ImageState.LOADED, null),
      );
    }
    return image;
  }

  /**
   * Get the image pixel ratio.
   * @param {number} pixelRatio Pixel ratio.
   * @return {number} Pixel ratio.
   * @override
   */
  getPixelRatio(pixelRatio) {
    return pixelRatio;
  }

  /**
   * @return {import("../size.js").Size} Image size.
   * @override
   */
  getImageSize() {
    return this.size_;
  }

  /**
   * @return {import("../ImageState.js").default} Image state.
   * @override
   */
  getImageState() {
    return this.imageState_;
  }

  /**
   * Get the origin of the symbolizer.
   * @return {Array<number>} Origin.
   * @api
   * @override
   */
  getOrigin() {
    return this.origin_;
  }

  /**
   * Get the number of points for generating the shape.
   * @return {number} Number of points for stars and regular polygons.
   * @api
   */
  getPoints() {
    return this.points_;
  }

  /**
   * Get the (primary) radius for the shape.
   * @return {number} Radius.
   * @api
   */
  getRadius() {
    return this.radius;
  }

  /**
   * Get the secondary radius for the shape.
   * @return {number|undefined} Radius2.
   * @api
   */
  getRadius2() {
    return this.radius2_;
  }

  /**
   * Get the size of the symbolizer (in pixels).
   * @return {import("../size.js").Size} Size.
   * @api
   * @override
   */
  getSize() {
    return this.size_;
  }

  /**
   * Get the stroke style for the shape.
   * @return {import("./Stroke.js").default|null} Stroke style.
   * @api
   */
  getStroke() {
    return this.stroke_;
  }

  /**
   * Set the stroke style.
   * @param {import("./Stroke.js").default|null} stroke Stroke style.
   * @api
   */
  setStroke(stroke) {
    this.stroke_ = stroke;
    this.render();
  }

  /**
   * @param {function(import("../events/Event.js").default): void} listener Listener function.
   * @override
   */
  listenImageChange(listener) {}

  /**
   * Load not yet loaded URI.
   * @override
   */
  load() {}

  /**
   * @param {function(import("../events/Event.js").default): void} listener Listener function.
   * @override
   */
  unlistenImageChange(listener) {}

  /**
   * Calculate additional canvas size needed for the miter.
   * @param {string} lineJoin Line join
   * @param {number} strokeWidth Stroke width
   * @param {number} miterLimit Miter limit
   * @return {number} Additional canvas size needed
   * @private
   */
  calculateLineJoinSize_(lineJoin, strokeWidth, miterLimit) {
    if (
      strokeWidth === 0 ||
      this.points_ === Infinity ||
      (lineJoin !== 'bevel' && lineJoin !== 'miter')
    ) {
      return strokeWidth;
    }
    // m  | ^
    // i  | |\                  .
    // t >|  #\
    // e  | |\ \              .
    // r      \s\
    //      |  \t\          .                 .
    //          \r\                      .   .
    //      |    \o\      .          .  . . .
    //          e \k\            .  .    . .
    //      |      \e\  .    .  .       . .
    //       d      \ \  .  .          . .
    //      | _ _a_ _\#  .            . .
    //   r1          / `             . .
    //      |                       . .
    //       b     /               . .
    //      |                     . .
    //           / r2            . .
    //      |                        .   .
    //         /                           .   .
    //      |α                                   .   .
    //       /                                         .   .
    //      ° center
    let r1 = this.radius;
    let r2 = this.radius2_ === undefined ? r1 : this.radius2_;
    if (r1 < r2) {
      const tmp = r1;
      r1 = r2;
      r2 = tmp;
    }
    const points =
      this.radius2_ === undefined ? this.points_ : this.points_ * 2;
    const alpha = (2 * Math.PI) / points;
    const a = r2 * Math.sin(alpha);
    const b = Math.sqrt(r2 * r2 - a * a);
    const d = r1 - b;
    const e = Math.sqrt(a * a + d * d);
    const miterRatio = e / a;
    if (lineJoin === 'miter' && miterRatio <= miterLimit) {
      return miterRatio * strokeWidth;
    }
    // Calculate the distance from center to the stroke corner where
    // it was cut short because of the miter limit.
    //              l
    //        ----+---- <= distance from center to here is maxr
    //       /####|k ##\
    //      /#####^#####\
    //     /#### /+\# s #\
    //    /### h/+++\# t #\
    //   /### t/+++++\# r #\
    //  /### a/+++++++\# o #\
    // /### p/++ fill +\# k #\
    ///#### /+++++^+++++\# e #\
    //#####/+++++/+\+++++\#####\
    const k = strokeWidth / 2 / miterRatio;
    const l = (strokeWidth / 2) * (d / e);
    const maxr = Math.sqrt((r1 + k) * (r1 + k) + l * l);
    const bevelAdd = maxr - r1;
    if (this.radius2_ === undefined || lineJoin === 'bevel') {
      return bevelAdd * 2;
    }
    // If outer miter is over the miter limit the inner miter may reach through the
    // center and be longer than the bevel, same calculation as above but swap r1 / r2.
    const aa = r1 * Math.sin(alpha);
    const bb = Math.sqrt(r1 * r1 - aa * aa);
    const dd = r2 - bb;
    const ee = Math.sqrt(aa * aa + dd * dd);
    const innerMiterRatio = ee / aa;
    if (innerMiterRatio <= miterLimit) {
      const innerLength = (innerMiterRatio * strokeWidth) / 2 - r2 - r1;
      return 2 * Math.max(bevelAdd, innerLength);
    }
    return bevelAdd * 2;
  }

  /**
   * @return {RenderOptions}  The render options
   * @protected
   */
  createRenderOptions() {
    let lineCap = defaultLineCap;
    let lineJoin = defaultLineJoin;
    let miterLimit = 0;
    let lineDash = null;
    let lineDashOffset = 0;
    let strokeStyle;
    let strokeWidth = 0;

    if (this.stroke_) {
      strokeStyle = asColorLike(this.stroke_.getColor() ?? defaultStrokeStyle);
      strokeWidth = this.stroke_.getWidth() ?? defaultLineWidth;
      lineDash = this.stroke_.getLineDash();
      lineDashOffset = this.stroke_.getLineDashOffset() ?? 0;
      lineJoin = this.stroke_.getLineJoin() ?? defaultLineJoin;
      lineCap = this.stroke_.getLineCap() ?? defaultLineCap;
      miterLimit = this.stroke_.getMiterLimit() ?? defaultMiterLimit;
    }

    const add = this.calculateLineJoinSize_(lineJoin, strokeWidth, miterLimit);
    const maxRadius = Math.max(this.radius, this.radius2_ || 0);
    const size = Math.ceil(2 * maxRadius + add);

    return {
      strokeStyle: strokeStyle,
      strokeWidth: strokeWidth,
      size: size,
      lineCap: lineCap,
      lineDash: lineDash,
      lineDashOffset: lineDashOffset,
      lineJoin: lineJoin,
      miterLimit: miterLimit,
    };
  }

  /**
   * @protected
   */
  render() {
    this.renderOptions_ = this.createRenderOptions();
    const size = this.renderOptions_.size;
    this.hitDetectionCanvas_ = null;
    this.size_ = [size, size];
  }

  /**
   * @private
   * @param {RenderOptions} renderOptions Render options.
   * @param {CanvasRenderingContext2D} context The rendering context.
   * @param {number} pixelRatio The pixel ratio.
   */
  draw_(renderOptions, context, pixelRatio) {
    context.scale(pixelRatio, pixelRatio);
    // set origin to canvas center
    context.translate(renderOptions.size / 2, renderOptions.size / 2);

    this.createPath_(context);

    if (this.fill_) {
      let color = this.fill_.getColor();
      if (color === null) {
        color = defaultFillStyle;
      }
      context.fillStyle = asColorLike(color);
      context.fill();
    }
    if (renderOptions.strokeStyle) {
      context.strokeStyle = renderOptions.strokeStyle;
      context.lineWidth = renderOptions.strokeWidth;
      if (renderOptions.lineDash) {
        context.setLineDash(renderOptions.lineDash);
        context.lineDashOffset = renderOptions.lineDashOffset;
      }
      context.lineCap = renderOptions.lineCap;
      context.lineJoin = renderOptions.lineJoin;
      context.miterLimit = renderOptions.miterLimit;
      context.stroke();
    }
  }

  /**
   * @private
   * @param {RenderOptions} renderOptions Render options.
   * @return {HTMLCanvasElement} Canvas containing the icon
   */
  createHitDetectionCanvas_(renderOptions) {
    let context;
    if (this.fill_) {
      let color = this.fill_.getColor();

      // determine if fill is transparent (or pattern or gradient)
      let opacity = 0;
      if (typeof color === 'string') {
        color = asArray(color);
      }
      if (color === null) {
        opacity = 1;
      } else if (Array.isArray(color)) {
        opacity = color.length === 4 ? color[3] : 1;
      }
      if (opacity === 0) {
        // if a transparent fill style is set, create an extra hit-detection image
        // with a default fill style
        context = createCanvasContext2D(renderOptions.size, renderOptions.size);
        this.drawHitDetectionCanvas_(renderOptions, context);
      }
    }
    return context ? context.canvas : this.getImage(1);
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} context The context to draw in.
   */
  createPath_(context) {
    let points = this.points_;
    const radius = this.radius;
    if (points === Infinity) {
      context.arc(0, 0, radius, 0, 2 * Math.PI);
    } else {
      const radius2 = this.radius2_ === undefined ? radius : this.radius2_;
      if (this.radius2_ !== undefined) {
        points *= 2;
      }
      const startAngle = this.angle_ - Math.PI / 2;
      const step = (2 * Math.PI) / points;
      for (let i = 0; i < points; i++) {
        const angle0 = startAngle + i * step;
        const radiusC = i % 2 === 0 ? radius : radius2;
        context.lineTo(radiusC * Math.cos(angle0), radiusC * Math.sin(angle0));
      }
      context.closePath();
    }
  }

  /**
   * @private
   * @param {RenderOptions} renderOptions Render options.
   * @param {CanvasRenderingContext2D} context The context.
   */
  drawHitDetectionCanvas_(renderOptions, context) {
    // set origin to canvas center
    context.translate(renderOptions.size / 2, renderOptions.size / 2);

    this.createPath_(context);

    context.fillStyle = defaultFillStyle;
    context.fill();
    if (renderOptions.strokeStyle) {
      context.strokeStyle = renderOptions.strokeStyle;
      context.lineWidth = renderOptions.strokeWidth;
      if (renderOptions.lineDash) {
        context.setLineDash(renderOptions.lineDash);
        context.lineDashOffset = renderOptions.lineDashOffset;
      }
      context.lineJoin = renderOptions.lineJoin;
      context.miterLimit = renderOptions.miterLimit;
      context.stroke();
    }
  }

  /**
   * @override
   */
  ready() {
    return this.fill_ ? this.fill_.ready() : Promise.resolve();
  }
}

export default RegularShape;
