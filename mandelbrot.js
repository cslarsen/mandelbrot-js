/*
 * Vanilla Mandelbrot Set renderer with canvas and javascript
 *
 * Written by Christian Stigen Larsen
 * http://csl.sublevel3.org
 * https://github.com/cslarsen/mandelbrot-js
 *
 * Put in the public domain by the author
 * 2012-03-01
 *
 */

/*
 * Global variables:
 */
var zoomStart = 3.4;
var zoom = [zoomStart, zoomStart];
var lookAt = [-0.6, 0];
var xRange = [0, 0];
var yRange = [0, 0];
var interiorColor = [0, 0, 0, 255];
var reInitCanvas = true; // Whether to reload canvas size, etc
var useZoom = true;
var colors = [[0,0,0,0]];

/*
 * Just a shorthand function: Fetch given element, jQuery-style
 */
function $(id)
{
  return document.getElementById(id);
}

/*
 * Return number with metric units
 */
function scaled(number)
{
  var unit = ["", "k", "M", "G", "T", "P", "E"];
  var mag = Math.ceil((1+Math.log(number)/Math.log(10))/3);
  return "" + number/Math.pow(10, 3*(mag-1)) + unit[mag];
}

/*
 * Convert hue-saturation-value/luminosity to RGB.
 *
 * Input ranges:
 *   H =   [0, 360] (integer degrees)
 *   S = [0.0, 1.0] (float)
 *   V = [0.0, 1.0] (float)
 */
function hsv_to_rgb(h, s, v)
{
  if ( v > 1.0 ) v = 1.0;
  var hp = h/60.0;
  var c = v * s;
  var x = c*(1 - Math.abs((hp % 2) - 1));

  if ( 0<=hp && hp<1 ) rgb = [c, x, 0];
  if ( 1<=hp && hp<2 ) rgb = [x, c, 0];
  if ( 2<=hp && hp<3 ) rgb = [0, c, x];
  if ( 3<=hp && hp<4 ) rgb = [0, x, c];
  if ( 4<=hp && hp<5 ) rgb = [x, 0, c];
  if ( 5<=hp && hp<6 ) rgb = [c, 0, x];

  var m = v - c;
  rgb[0] += m;
  rgb[1] += m;
  rgb[2] += m;

  rgb[0] *= 255;
  rgb[1] *= 255;
  rgb[2] *= 255;
  return rgb;
}

/*
 * Adjust aspect ratio based on plot ranges and
 * canvas dimensions.
 */
function adjustAspectRatio(xRange, yRange, canvas)
{
  var ratio = Math.abs(xRange[1]-xRange[0]) / Math.abs(yRange[1]-yRange[0]);
  var sratio = canvas.width/canvas.height;
  if ( sratio>ratio ) {
    var xf = sratio/ratio;
    xRange[0] *= xf;
    xRange[1] *= xf;
      zoom[0] *= xf;
  } else {
    var yf = ratio/sratio;
    yRange[0] *= yf;
    yRange[1] *= yf;
      zoom[1] *= yf;
  }
}

function precision(number, decimals)
{
  var pow = Math.pow;
  var floor = Math.floor;
  return floor(pow(10.0, decimals)*number)/floor(10, decimals);
}

function updateGUI()
{
  $('bounds').innerHTML =
    "x=(" + precision(xRange[0], 2) + ", " + precision(xRange[1], 2) + ") " +
    "y=(" + precision(yRange[0], 2) + ", " + precision(yRange[1], 2) + ")";
}

/*
 * Render the Mandelbrot set
 */
function draw(lookAt, zoom, pickColor)
{
  if ( lookAt === null ) lookAt = [-0.6, 0];
  if ( zoom === null ) zoom = [zoomStart, zoomStart];
  xRange = [lookAt[0]-zoom[0]/2, lookAt[0]+zoom[0]/2];
  yRange = [lookAt[1]-zoom[1]/2, lookAt[1]+zoom[1]/2];

  if ( reInitCanvas ) {
    reInitCanvas = false;

    canvas = $('canvasMandelbrot');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx = canvas.getContext('2d');
    img = ctx.createImageData(canvas.width, 1);

    adjustAspectRatio(xRange, yRange, canvas);
  }

  updateGUI();

  var steps = parseInt($('steps').value, 10);
  var escapeRadius = Math.pow(parseFloat($('escapeRadius').value), 2.0);


  var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width-1));
  var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height-1));

  function drawLine(Ci, off, Cr_init, Cr_step)
  {
    var Cr = Cr_init;

    for ( var x=0; x<canvas.width; ++x, Cr += Cr_step, off += 4 ) {
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

      var color = pickColor(steps, n, Tr, Ti);

      img.data[off  ] = color[0];
      img.data[off+1] = color[1];
      img.data[off+2] = color[2];
      img.data[off+3] = color[3];
    }
  }

  function render()
  {
    var start  = (new Date).getTime();
    var lastUpdate = start;
    var updateTimeout = 250.0; // ms
    var pixels = 0;
    var y = yRange[0];
    var sy = 0;

    var scanline = function()
    {
      drawLine(y, 0, xRange[0], dx);
      y += dy;
      pixels += canvas.width;
      ctx.putImageData(img, 0, sy);

      var now = (new Date).getTime();
      var elapsedMS = now - start;

      $('renderTime').innerHTML = elapsedMS/1000.0;
      $('renderSpeed').innerHTML = scaled(Math.floor(pixels/elapsedMS));

      /*
       * Javascript is inherently single-threaded, and the way
       * you yield thread control back to the browser is MYSTERIOUS.
       *
       * People seem to use setTimeout() to yield, which lets us
       * make sure the canvas is updated, so that we can do animations.
       *
       * But if we do that for every scanline, it will take 100x longer
       * to render everything, because of overhead.  So therefore, we'll
       * do something in between.
       */
      if ( sy++ < canvas.height ) {
        if ( (now - lastUpdate) >= updateTimeout ) {
          // yield control back to browser, so that canvas is updated
          lastUpdate = now;
          setTimeout(scanline);
        } else
          scanline();
      } else {
        // finished rendering
        $('submitButton').disabled = false;
      }
    };

    // Disallow redrawing while rendering
    $('submitButton').disabled = true;
    setTimeout(scanline);
  }

  render();
}

// Some constants used with smoothColor
var logBase = 1.0 / Math.log(2.0);
var logHalfBase = Math.log(0.5)*logBase;

function smoothColor(steps, n, Tr, Ti)
{
  /*
   * Original smoothing equation is
   *
   * var v = 1 + n - Math.log(Math.log(Math.sqrt(Zr*Zr+Zi*Zi)))/Math.log(2.0);
   *
   * but can be simplified using some elementary logarithm rules to
   */
  return 5 + n - logHalfBase - Math.log(Math.log(Tr+Ti))*logBase;
}

function pickColorHSV1(steps, n, Tr, Ti)
{
  if ( n == steps ) // converged?
    return interiorColor;

  var v = smoothColor(steps, n, Tr, Ti);
  c = hsv_to_rgb(360.0*v/steps, 1.0, 1.0);
  c.push(255); // alpha
  return c;
}

function pickColorHSV2(steps, n, Tr, Ti)
{
  if ( n == steps ) // converged?
    return interiorColor;

  var v = smoothColor(steps, n, Tr, Ti);
  var c = hsv_to_rgb(360.0*v/steps, 1.0, 10.0*v/steps);
  c.push(255); // alpha
  return c;
}

function pickColorGrayscale(steps, n, Tr, Ti)
{
  if ( n == steps ) // converged?
    return interiorColor;

  var v = smoothColor(steps, n, Tr, Ti);
  v = Math.floor(512.0*v/steps);
  if ( v > 255 ) v = 255;
  return [v, v, v, 255];
}

function pickColorGrayscale2(steps, n, Tr, Ti)
{
  if ( n == steps ) { // converged?
    var c = 255 - Math.floor(255.0*Math.sqrt(Tr+Ti)) % 255;
    if ( c < 0 ) c = 0;
    if ( c > 255 ) c = 255;
    return [c, c, c, 255];
  }

  return pickColorGrayscale(steps, n, Tr, Ti);
}

function main()
{
  updateGUI();

  /*
   * Enable zooming (currently, the zooming is inexact!)
   */
  if ( useZoom ) {
    $('canvasMandelbrot').onclick = function(event)
    {
      // disallow zooming while rendering
      // (or; you could just cancel rendering and zoom instead)
      if ( $('submitButton').disabled == true )
        return;

      var x = event.clientX;
      var y = event.clientY;
      var w = window.innerWidth;
      var h = window.innerHeight;

      var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width-1));
      x = xRange[0] + x*dx;

      var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height-1));
      y = yRange[0] + y*dy;

      lookAt = [x, y];

      if ( event.shiftKey ) {
        zoom[0] /= 0.5;
        zoom[1] /= 0.5;
      } else {
        zoom[0] *= 0.5;
        zoom[1] *= 0.5;
      }

      draw(lookAt, zoom, getColorPicker());
    };
  }

  /*
   * When resizing the window, be sure to update
   * all the canvas stuff.
   */
  window.onresize = function(event)
  {
    reInitCanvas = true;
  };
}

main();
