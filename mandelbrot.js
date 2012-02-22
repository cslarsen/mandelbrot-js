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

function complex(re, im)
{
  this.re = re;
  this.im = im;
}

complex.prototype = {
  re: 0,
  im: 0,

  add: function() {
    var c = arguments[0];
    return new complex(this.re + c.re, this.im + c.im);
  },

  sub: function() {
    var c = arguments[0];
    return new complex(this.re - c.re, this.im - c.im);
  },

  mul: function() {
    var re = arguments[0].re;
    var im = arguments[0].im;

    return new complex(
      this.re*re - this.im*im,
      this.re*im + this.im*re);
  },

  mag: function() {
    return Math.sqrt(this.re*this.re + this.im*this.im)
  },

  toString: function() {
    return "" + this.re + (this.im<0? "" : "+") + this.im + "i";
  },
}

function mandelbrotp_iter(z, c, steps, threshold)
{
  while ( steps-- != 0 ) {
    if ( z.mag() > threshold )
      return [true, z.mag()];

    // C_{n+1} = C_{n}^2 + c, C_{0} = c
    z = z.mul(z).add(c);
  }

  return [false, z.mag()];
}

function mandelbrotp(c, steps, threshold)
{
  return mandelbrotp_iter(new complex(0, 0), c, steps, threshold);
}

function plot(img, x, y, r, g, b, a)
{
  var off = x + y*img.width;
  off <<= 2;
  img.data[off+0] = r;
  img.data[off+1] = g;
  img.data[off+2] = b;
  img.data[off+3] = a;
}

var canvas = document.getElementById('canvasMandelbrot');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext('2d');
var img = ctx.getImageData(0, 0, canvas.width, canvas.height);

window.onresize = function(event)
{
  canvas = document.getElementById('canvasMandelbrot');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx = canvas.getContext('2d');
  img = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function draw()
{
  var steps = parseInt(document.getElementById('steps').value);
  var threshold = parseFloat(document.getElementById('threshold').value);

  var x_start = -2.0;
  var x_stop = 1.0;
  var x_step = (x_stop - x_start) / (0.5 + (canvas.width-1));

  var y_start = -1.0;
  var y_stop = 1.0;
  var y_step = (y_stop - y_start) / (canvas.height - 1);

  var ploty = y_start;
  var y=0;

  var drawX = function() {
    var plotx = x_start;
    for ( var x=0; x<canvas.width; ++x ) {
      var result = mandelbrotp(new complex(plotx, ploty), steps, threshold);
      plotit = result[0];
      color = result[1];
      color *= 100;
      plot(img, x, y, color, color, color, 255);
      ++pixels;
      plotx += x_step;
    }
    ploty += y_step;
  };

  var start = (new Date).getTime();
  var pixels = 0;

  (function animation() {
    if ( y++ < canvas.height ) {
      drawX();
      ctx.putImageData(img, 0, 0);
      setTimeout(animation);
    }

    var stop = (new Date).getTime();
    var elapsedMS = stop - start;
    document.getElementById('renderMS').innerHTML = elapsedMS;
    document.getElementById('renderSpeed').innerHTML = Math.floor(1000.0*pixels/elapsedMS);
  })();

}
