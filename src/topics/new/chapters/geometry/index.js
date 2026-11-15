/* geometry pack of the "חדש" module (board #84). ../index.js decides the final order by id.
   Drawings: ../../figs-geo.jsx (tri, simtri, prism); their maths: ./geo.js. */
import transformations from './transformations.js';
import prism from './prism.js';
import exteriorAngle from './exterior-angle.js';
import triangleSides from './triangle-sides.js';
import rightTriangleSpecial from './right-triangle-special.js';
import areaRatio from './area-ratio.js';

export default [transformations, prism, exteriorAngle, triangleSides, rightTriangleSpecial, areaRatio];
