/*
 * The Mandelbrot Set, in HTML5 canvas and javascript.
 * https://github.com/cslarsen/mandelbrot-js
 *
 * Copyright (C) 2012 Christian Stigen Larsen
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.  You may obtain
 * a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 */

/*
 * Global variables:
 */
var zoomStart = 3.4;
var zoom = [zoomStart, zoomStart];
var lookAtDefault = [-0.6, 0];
var lookAt = lookAtDefault;
var xRange = [0, 0];
var yRange = [0, 0];
var escapeRadius = 10.0;
var interiorColor = [0, 0, 0, 255];
var reInitCanvas = true; // Whether to reload canvas size, etc
var dragToZoom = true;
var colors = [[0,0,0,0]];
var renderId = 0; // To zoom before current render is finished

/*
 * Initialize canvas
 */
var canvas = $('canvasMandelbrot');
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
//
var ccanvas = $('canvasControls');
ccanvas.width  = window.innerWidth;
ccanvas.height = window.innerHeight;
//
var ctx = canvas.getContext('2d');
var img = ctx.createImageData(canvas.width, 1);

/*
 * Just a shorthand function: Fetch given element, jQuery-style
 */
function $(id)
{
  return document.getElementById(id);
}

function focusOnSubmit()
{
  var e = $('submitButton');
  if ( e ) e.focus();
}

function getColorPicker()
{
  var p = $("colorScheme").value;
  if ( p == "pickColorHSV1" ) return pickColorHSV1;
  if ( p == "pickColorHSV2" ) return pickColorHSV2;
  if ( p == "pickColorHSV3" ) return pickColorHSV3;
  if ( p == "pickColorGrayscale2" ) return pickColorGrayscale2;
  return pickColorGrayscale;
}

function getSamples()
{
  var i = parseInt($('superSamples').value, 10);
  return i<=0? 1 : i;
}

/*
 * Main renderer equation.
 *
 * Returns number of iterations and values of Z_{n}^2 = Tr + Ti at the time
 * we either converged (n == iterations) or diverged.  We use these to
 * determined the color at the current pixel.
 *
 * The Mandelbrot set is rendered taking
 *
 *     Z_{n+1} = Z_{n} + C
 *
 * with C = x + iy, based on the "look at" coordinates.
 *
 * The Julia set can be rendered by taking
 *
 *     Z_{0} = C = x + iy
 *     Z_{n+1} = Z_{n} + K
 *
 * for some arbitrary constant K.  The point C for Z_{0} must be the
 * current pixel we're rendering, but K could be based on the "look at"
 * coordinate, or by letting the user select a point on the screen.
 */
function iterateEquation(Cr, Ci, escapeRadius, iterations)
{
  var Zr = 0;
  var Zi = 0;
  var Tr = 0;
  var Ti = 0;
  var n  = 0;

  for ( ; n<iterations && (Tr+Ti)<=escapeRadius; ++n ) {
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

  return [n, Tr, Ti];
}

/*
 * Update URL's hash with render parameters so we can pass it around.
 */
function updateHashTag(samples, iterations)
{
  var radius = $('escapeRadius').value;
  var scheme = $('colorScheme').value;

  location.hash = 'zoom=' + zoom + '&' +
                  'lookAt=' + lookAt + '&' +
                  'iterations=' + iterations + '&' +
                  'superSamples=' + samples + '&' +
                  'escapeRadius=' + radius + '&' +
                  'colorScheme=' + scheme;
}

/*
 * Update small info box in lower right hand side
 */
function updateInfoBox()
{
  // Update infobox
  $('infoBox').innerHTML =
    'x<sub>0</sub>=' + xRange[0] + ' y<sub>0</sub>=' + yRange[0] + ' ' +
    'x<sub>1</sub>=' + xRange[1] + ' y<sub>1</sub>=' + yRange[1] + ' ' +
    'w&#10799;h=' + canvas.width + 'x' + canvas.height + ' '
        + (canvas.width*canvas.height/1000000.0).toFixed(1) + 'MP';
}

/*
 * Parse URL hash tag, returns whether we should redraw.
 */
function readHashTag()
{
  var redraw = false;
  var tags = location.hash.split('&');

  for ( var i=0; i<tags.length; ++i ) {
    var tag = tags[i].split('=');
    var key = tag[0];
    var val = tag[1];

    switch ( key ) {
      case '#zoom': {
        var z = val.split(',');
        zoom = [parseFloat(z[0]), parseFloat(z[1])];
        redraw = true;
      } break;

      case 'lookAt': {
        var l = val.split(',');
        lookAt = [parseFloat(l[0]), parseFloat(l[1])];
        redraw = true;
      } break;

      case 'iterations': {
        $('steps').value = String(parseInt(val, 10));
        $('autoIterations').checked = false;
        redraw = true;
      } break;

      case 'escapeRadius': {
        escapeRadius = parseFloat(val);
        $('escapeRadius').value = String(escapeRadius);
        redraw = true;
      } break;

      case 'superSamples': {
        $('superSamples').value = String(parseInt(val, 10));
        redraw = true;
      } break;

      case 'colorScheme': {
        $('colorScheme').value = String(val);
        redraw = true;
      } break;
    }
  }

  if ( redraw )
    reInitCanvas = true;

  return redraw;
}

/*
 * Return number with metric units
 */
function metric_units(number)
{
  var unit = ["", "k", "M", "G", "T", "P", "E"];
  var mag = Math.ceil((1+Math.log(number)/Math.log(10))/3);
  return "" + (number/Math.pow(10, 3*(mag-1))).toFixed(2) + unit[mag];
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
  var rgb = [0,0,0];

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
 * Adjust aspect ratio based on plot ranges and canvas dimensions.
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

function addRGB(v, w)
{
  v[0] += w[0];
  v[1] += w[1];
  v[2] += w[2];
  v[3] += w[3];
  return v;
}

function divRGB(v, div)
{
  v[0] /= div;
  v[1] /= div;
  v[2] /= div;
  v[3] /= div;
  return v;
}

/*
 * Render the Mandelbrot set
 */
function draw(pickColor, superSamples)
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

    ccanvas = $('canvasControls');
    ccanvas.width  = window.innerWidth;
    ccanvas.height = window.innerHeight;

    ctx = canvas.getContext('2d');
    img = ctx.createImageData(canvas.width, 1);

    adjustAspectRatio(xRange, yRange, canvas);
  }

  var steps = parseInt($('steps').value, 10);

  if ( $('autoIterations').checked ) {
    var f = Math.sqrt(
            0.001+2.0 * Math.min(
              Math.abs(xRange[0]-xRange[1]),
              Math.abs(yRange[0]-yRange[1])));

    steps = Math.floor(223.0/f);
    $('steps').value = String(steps);
  }

  var escapeRadius = Math.pow(parseFloat($('escapeRadius').value), 2.0);
  var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width-1));
  var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height-1));
  var Ci_step = (yRange[1] - yRange[0]) / (0.5 + (canvas.height-1));

  updateHashTag(superSamples, steps);
  updateInfoBox();

  // Only enable one render at a time
  renderId += 1;

  function drawLineSuperSampled(Ci, off, Cr_init, Cr_step)
  {
    var Cr = Cr_init;

    for ( var x=0; x<canvas.width; ++x, Cr += Cr_step ) {
      var color = [0, 0, 0, 255];

      for ( var s=0; s<superSamples; ++s ) {
        var rx = Math.random()*Cr_step;
        var ry = Math.random()*Ci_step;
        var p = iterateEquation(Cr - rx/2, Ci - ry/2, escapeRadius, steps);
        color = addRGB(color, pickColor(steps, p[0], p[1], p[2]));
      }

      color = divRGB(color, superSamples);

      img.data[off++] = color[0];
      img.data[off++] = color[1];
      img.data[off++] = color[2];
      img.data[off++] = 255;
    }
  }

  function drawLine(Ci, off, Cr_init, Cr_step)
  {
    var Cr = Cr_init;

    for ( var x=0; x<canvas.width; ++x, Cr += Cr_step ) {
      var p = iterateEquation(Cr, Ci, escapeRadius, steps);
      var color = pickColor(steps, p[0], p[1], p[2]);
      img.data[off++] = color[0];
      img.data[off++] = color[1];
      img.data[off++] = color[2];
      img.data[off++] = 255;
    }
  }

  function drawSolidLine(y, color)
  {
    var off = y*canvas.width;

    for ( var x=0; x<canvas.width; ++x ) {
      img.data[off++] = color[0];
      img.data[off++] = color[1];
      img.data[off++] = color[2];
      img.data[off++] = color[3];
    }
  }

  function render()
  {
    var start  = (new Date).getTime();
    var startHeight = canvas.height;
    var startWidth = canvas.width;
    var lastUpdate = start;
    var updateTimeout = parseFloat($('updateTimeout').value);
    var pixels = 0;
    var Ci = yRange[0];
    var sy = 0;
    var drawLineFunc = superSamples>1? drawLineSuperSampled : drawLine;
    var ourRenderId = renderId;

    var scanline = function()
    {
      if (    renderId != ourRenderId ||
           startHeight != canvas.height ||
            startWidth != canvas.width )
      {
        // Stop drawing
        return;
      }

      drawLineFunc(Ci, 0, xRange[0], dx);
      Ci += Ci_step;
      pixels += canvas.width;
      ctx.putImageData(img, 0, sy);

      var now = (new Date).getTime();

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
          // show the user where we're rendering
          drawSolidLine(0, [255,59,3,255]);
          ctx.putImageData(img, 0, sy);

          // Update speed and time taken
          var elapsedMS = now - start;
          $('renderTime').innerHTML = (elapsedMS/1000.0).toFixed(1); // 1 comma

          var speed = Math.floor(pixels / elapsedMS);

          if ( metric_units(speed).substr(0,3)=="NaN" ) {
            speed = Math.floor(60.0*pixels / elapsedMS);
            $('renderSpeedUnit').innerHTML = 'minute';
          } else
            $('renderSpeedUnit').innerHTML = 'second';

          $('renderSpeed').innerHTML = metric_units(speed);

          // yield control back to browser, so that canvas is updated
          lastUpdate = now;
          setTimeout(scanline, 0);
        } else
          scanline();
      }
    };

    // Disallow redrawing while rendering
    scanline();
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
  var c = hsv_to_rgb(360.0*v/steps, 1.0, 1.0);
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

function pickColorHSV3(steps, n, Tr, Ti)
{
  if ( n == steps ) // converged?
    return interiorColor;

  var v = smoothColor(steps, n, Tr, Ti);
  var c = hsv_to_rgb(360.0*v/steps, 1.0, 10.0*v/steps);

  // swap red and blue
  var t = c[0];
  c[0] = c[2];
  c[2] = t;

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
  $('viewPNG').onclick = function(event)
  {
    window.location = canvas.toDataURL('image/png');
  };

  $('steps').onkeypress = function(event)
  {
    // disable auto-iterations when user edits it manually
    $('autoIterations').checked = false;
  }

  $('resetButton').onclick = function(even)
  {
    $('settingsForm').reset();
    setTimeout(function() { location.hash = ''; }, 1);
    zoom = [zoomStart, zoomStart];
    lookAt = lookAtDefault;
    reInitCanvas = true;
    draw(getColorPicker(), getSamples());
  };

  if ( dragToZoom == true ) {
    var box = null;

    $('canvasControls').onmousedown = function(e)
    {
      if ( box == null )
        box = [e.clientX, e.clientY, 0, 0];
    }

    $('canvasControls').onmousemove = function(e)
    {
      if ( box != null ) {
        var c = ccanvas.getContext('2d');
        c.lineWidth = 1;

        // clear out old box first
        c.clearRect(0, 0, ccanvas.width, ccanvas.height);

        // draw new box
        c.strokeStyle = '#FF3B03';
        box[2] = e.clientX;
        box[3] = e.clientY;
        c.strokeRect(box[0], box[1], box[2]-box[0], box[3]-box[1]);
      }
    }

    var zoomOut = function(event) {
      var x = event.clientX;
      var y = event.clientY;

      var w = window.innerWidth;
      var h = window.innerHeight;

      var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width-1));
      var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height-1));

      x = xRange[0] + x*dx;
      y = yRange[0] + y*dy;

      lookAt = [x, y];

      if ( event.shiftKey ) {
        zoom[0] /= 0.5;
        zoom[1] /= 0.5;
      }

      draw(getColorPicker(), getSamples());
    };

    $('canvasControls').onmouseup = function(e)
    {
      if ( box != null ) {
        // Zoom out?
        if ( e.shiftKey ) {
          box = null;
          zoomOut(e);
          return;
        }

        /*
         * Cleaer entire canvas
         */
        var c = ccanvas.getContext('2d');
        c.clearRect(0, 0, ccanvas.width, ccanvas.height);

        /*
         * Calculate new rectangle to render
         */
        var x = Math.min(box[0], box[2]) + Math.abs(box[0] - box[2]) / 2.0;
        var y = Math.min(box[1], box[3]) + Math.abs(box[1] - box[3]) / 2.0;

        var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width-1));
        var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height-1));

        x = xRange[0] + x*dx;
        y = yRange[0] + y*dy;

        lookAt = [x, y];

        /*
         * This whole code is such a mess ...
         */

        var xf = Math.abs(Math.abs(box[0]-box[2])/canvas.width);
        var yf = Math.abs(Math.abs(box[1]-box[3])/canvas.height);

        zoom[0] *= Math.max(xf, yf); // retain aspect ratio
        zoom[1] *= Math.max(xf, yf);

        box = null;
        draw(getColorPicker(), getSamples());
      }
    }
  }

  /*
   * Enable zooming (currently, the zooming is inexact!) Click to zoom;
   * perfect to mobile phones, etc.
   */
  if ( dragToZoom == false ) {
    $('canvasMandelbrot').onclick = function(event)
    {
      var x = event.clientX;
      var y = event.clientY;
      var w = window.innerWidth;
      var h = window.innerHeight;

      var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width-1));
      var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height-1));

      x = xRange[0] + x*dx;
      y = yRange[0] + y*dy;

      lookAt = [x, y];

      if ( event.shiftKey ) {
        zoom[0] /= 0.5;
        zoom[1] /= 0.5;
      } else {
        zoom[0] *= 0.5;
        zoom[1] *= 0.5;
      }

      draw(getColorPicker(), getSamples());
    };
  }

  /*
   * When resizing the window, be sure to update all the canvas stuff.
   */
  window.onresize = function(event)
  {
    reInitCanvas = true;
  };

  /*
   * Read hash tag and render away at page load.
   */
  readHashTag();

  /*
   * This is the weirdest bug ever.  When I go directly to a link like
   *
   *   mandelbrot.html#zoom=0.01570294345468629,0.010827482681521361&
   *   lookAt=-0.3083866260309053,-0.6223590662533901&iterations=5000&
   *   superSamples=1&escapeRadius=16&colorScheme=pickColorHSV2
   *
   * it will render a black image, but if I call the function twice, it
   * works nicely.  Must be a global variable that's not been set upon the
   * first entry to the function (TODO: Find out what's wrong).
   *
   * Yeah, I know, the code is a total mess at the moment.  I'll get back
   * to that.
   */
  draw(getColorPicker(), getSamples());
  draw(getColorPicker(), getSamples());
}

main();
