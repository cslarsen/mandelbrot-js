/*
 * Vanilla Mandelbrot Set renderer with canvas and javascript
 *
 * Written by Christian Stigen Larsen
 * http://csl.sublevel3.org
 *
 * Put in the public domain by the author
 * 2012-02-22
 *
 */

function plot(img, x, y, r, g, b, a)
{
  var off = x + y*img.width;
  off <<= 2;
  img.data[off+0] = r;
  img.data[off+1] = g;
  img.data[off+2] = b;
  img.data[off+3] = a;
}


/*
 * Color table can be any length, but should be
 * cyclical because of the modulus operation.
 */
var colors = new Array(512);
var interiorColor = [0, 0, 0, 255];

/*
 * Simple calculation of the color palette.
 * This version is non-cyclical.
 */
for ( var i=0; i<colors.length; ++i ) {
  var R = i<256? i : 255;
  var G = i<256? i : 255;
  var B = i<256? i : 255;
  var A = 255;
  colors[i] = [R, G, B, A];
}

// Whether to reload canvas size, etc.
var reinit = true;

window.onresize = function(event)
{
  // reinit dimentions on window resize
  reinit = true;
}

function draw()
{
  if ( reinit ) {
    canvas = document.getElementById('canvasMandelbrot');
    ctx = canvas.getContext('2d');

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    //canvas.width = 640; canvas.height = 480;

    img = ctx.createImageData(canvas.width, 1);
    reinit = false;
  }

  var steps = parseInt(document.getElementById('steps').value);
  var escapeRadius = parseFloat(document.getElementById('escapeRadius').value);
  escapeRadius *= escapeRadius; // optimization trick

  /*
   * Plot rectangle in the complex plane
   */
  var xRange = [-2.2, 1.0];
  var yRange = [-1.2, 1.2];

  /*
   * Adjust aspect ratio
   */
  {
    var ratio = Math.abs(xRange[1]-xRange[0]) / Math.abs(yRange[1]-yRange[0]);
    var sratio = canvas.width/canvas.height;

    if ( sratio > ratio ) {
      var f = sratio/ratio;
      xRange[1] *= f;
      xRange[0] *= f;
    } else if ( sratio < ratio ) {
      var f = ratio/sratio;
      yRange[1] *= f;
      yRange[0] *= f;
    }
  }

  var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width-1));
  var dy = (yRange[1] - yRange[0]) / (canvas.height - 1);

  var ploty = yRange[0];
  var y=0;

  var drawLine = function(Ci, off, Cr_init, Cr_step, pixels)
  {
    var Cr = Cr_init;
    var logBase = 1.0 / Math.log(2.0);
    var logHalfBase = Math.log(0.5)*logBase;

    for ( var x=0; x<canvas.width; ++x, Cr += Cr_step ) {
      var Zr = 0;
      var Zi = 0;
      var Tr = 0;
      var Ti = 0;
      var n  = 0;

      for ( ; n<steps && (Tr+Ti)<=escapeRadius; ++n ) {
        Zi = 2 * Zr * Zi + Ci;
        Zr = Tr - Ti + Cr;
        Tr = Zr * Zr;
        Ti = Zi * Zi;
      }

      /*
       * Four more iterations to decrease error term;
       * see http://linas.org/art-gallery/escape/escape.html
       */
      for ( var e=0; e<4; ++e ) {
        Zi = 2 * Zr * Zi + Ci;
        Zr = Tr - Ti + Cr;
        Tr = Zr * Zr;
        Ti = Zi * Zi;
      }

      /*
       * Did equation converge?  Then this is an interior, and we'll
       * simply paint it black.
       */
      var color = interiorColor;

      // Did it diverge? Then we've got an exterior
      if ( n != steps ) {
        // Instead of using RGB[i] directly, calculate smooth coloring:

        /*
         * Original smoothing equation is
         *
         * var v = 1 + n - Math.log(Math.log(Math.sqrt(Zr*Zr+Zi*Zi)))/Math.log(2.0);
         *
         * but can be simplified using some elementary logarithm rules to
         */
        var v = 5 + n - logHalfBase - Math.log(Math.log(Tr+Ti))*logBase;

        // then normalize for number of colors
        if ( isNaN(v) ) v = 0;
        if ( !isFinite(v) ) v = steps;
        v = Math.abs(colors.length*v/steps);

        // but above log-equation isn't completely connected to STEPS, so:
        color = colors[Math.floor(v) % colors.length];
      }

      img.data[off++] = color[0];
      img.data[off++] = color[1];
      img.data[off++] = color[2];
      img.data[off++] = color[3];
    }
  };

  var start = (new Date).getTime();
  var pixels = 0;

  // Do not allow several renderers
  document.getElementById('submitButton').disabled = true;

  (function animation() {
    if ( y++ < canvas.height ) {
      drawLine(ploty, 0, xRange[0], dx);
      ploty  += dy;
      pixels += canvas.width;
      ctx.putImageData(img, 0, y);
      setTimeout(animation);
    }

    if ( y >= canvas.height )
      document.getElementById('submitButton').disabled = false;

    var stop = (new Date).getTime();
    var elapsedMS = stop - start;
    document.getElementById('renderMS').innerHTML = elapsedMS;
    document.getElementById('renderSpeed').innerHTML = Math.floor(pixels/elapsedMS) + 'k';
  })();
}
