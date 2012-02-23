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
 * Color table can be any length,
 * but should be cyclical
 */

var colors = new Array(256);
var interiorColor = [0, 0, 0];

for ( var i=0; i<colors.length; ++i ) {
  var R = 255*(i/(colors.length-1));
  var G = 255*(i/(colors.length-1));
  var B = 255*(i/(colors.length-1));
  colors[i] = [R, G, B];
}

var reinit = true;

window.onresize = function(event)
{
  reinit = true;
}

function draw()
{
  if ( reinit ) {
    canvas = document.getElementById('canvasMandelbrot');
    ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    //canvas.width = 640; canvas.height = 480;

    img = ctx.createImageData(canvas.width, 1);
    reinit = false;
  }

  var steps = parseInt(document.getElementById('steps').value);
  var threshold = parseFloat(document.getElementById('threshold').value);
  threshold *= threshold; // optimization trick

  var x_start = -2.0;
  var x_stop = 1.0;
  var x_step = (x_stop - x_start) / (0.5 + (canvas.width-1));

  var y_start = -1.0;
  var y_stop = 1.0;
  var y_step = (y_stop - y_start) / (canvas.height - 1);

  var ploty = y_start;
  var y=0;

  var drawLine = function(Ci, off, x_start, x_step, pixels)
  {
    var Cr = x_start;
    var logBase = 1.0 / Math.log(2.0);
    var logHalfBaseMinusOne = Math.log(0.5)*logBase - 1.0;

    for ( var x=0; x<img.width; ++x, Cr += x_step ) {
      var Zr = 0;
      var Zi = 0;
      var Tr = 0;
      var Ti = 0;
      var n  = 0;

      for ( ; n<steps && (Tr+Ti)<=threshold; ++n ) {
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
        var v = n - logHalfBaseMinusOne - Math.log(Math.log(Tr+Ti))*logBase;

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
      img.data[off++] = 255;
    }
  };

  var start = (new Date).getTime();
  var pixels = 0;

  (function animation() {
    if ( y++ < canvas.height ) {
      drawLine(ploty, 0, x_start, x_step);
      ploty  += y_step;
      pixels += img.width;
      ctx.putImageData(img, 0, y);
      setTimeout(animation);
    }

    var stop = (new Date).getTime();
    var elapsedMS = stop - start;
    document.getElementById('renderMS').innerHTML = elapsedMS;
    document.getElementById('renderSpeed').innerHTML = Math.floor(pixels/elapsedMS) + 'k';
  })();
}
