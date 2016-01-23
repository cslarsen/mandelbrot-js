Mandelbrot.js
=============

Vanilla Mandelbrot Set renderer in HTML5 canvas and javascript.

This code running in action can be seen at https://csl.name/mandelbrot

Author
------
Written by Christian Stigen Larsen  
https://csl.name

Theory
------

The famous [Mandelbrot set](http://en.wikipedia.org/wiki/Mandelbrot_set) is
a set of points in the complex plane.  In essence, what we want to find out
is if the iterative function C below will _converge_ to some constant or _diverge_
to infinity.

The function is

  `C_{n+1} = C_{n}^2 + C_{0}`

with the initial condition simply formed by taking the coordinates in the
complex plane,

  `C_{0} = x + iy`

Looking at the function, one can easily see that for big initial values, the
function should diverge.  But for values close to origo (i.e., for |x| and
|y| less than 1), we would expect the function to converge to zero, since
the product of two numbers less than one will always be less than either of
the factors (e.g., 0.5 x 0.4 = 0.2, which is less than both factors).

But if we actually plot it, what we get out isn't any nice plot.  Instead,
we get an amazingly complex and fractured plot.  This is the Mandelbrot set.

You can zoom forever into the plot, and it will present you with an unending
complex shape.  One can also calculate it's
so-called [Hausdorff dimension](http://en.wikipedia.org/wiki/Hausdorff_dimension),
which yields a noninteger number.  Thus, it's a fractal.

Calculating the Mandelbrot Set
------------------------------

Calculating the Mandelbrot set is easy if you do it numerically.

Take any point `C_0 = (x, y)` and then calculate `C_1 = (x+iy)^2 + (x+iy)`
and continue doing this.  For practical purposes, let's predetermine a
_threshold_ value.  If the magnitude of `C` (defined for complex numbers
as being the distance to origo, or `sqrt(x^2+y^2)`) ever becomes larger than
this threshold value we will assume that it will diverge into infinity.  
If so, stop the calculation and plot a _black dot_ at the current location.

If `C` has not exceeded the threshold value after a predetermined number of
iterations, we will assume that the current parameters makes the function
converge.  In this case, plot a non-black dot at the current location.

Colorizing the plot
-------------------

I said above that if the function diverges, one should plot a non-black dot.
One could simply paint a white dot here.  But instead, maybe we want to get
an idea of _how fast_ the function is diverging to infinity at this point.

To do this, just take the current value of the number of steps performed
and _map_ that against a color spectrum, and paint that color.

So, functions diverging quickly will get about the same color.

Smooth coloring
---------------

If you use the number of iterations to pick a color, you'll get ugly color
bands in the plot.  There is a really cool trick to get smooth, gradual
color changes.

So, you basically calculate `Z = Z^2` until it diverges and make a note of
the iteration count.  What we really want, though, is a _fractional_
iteration count, so we can multiply that with a color value to get smooth
colors.

The trick is to note that when you calculate `Z = Z^2` you'll get values `Z,
Z^2, Z^4, Z^8` and so on.  If you take the logarithm of this, you'll get the
values 1, 2, 4, 8 etc.  If you take the logarithm one more time, you'll get
1, 2, 3, 4, 5 etc.  So to get a fractional number of iterations, just do:

    log(log |Z|) / log 2

This is all explained over at http://linas.org/art-gallery/escape/smooth.html

In my code, I originally used the following smoothing equation:

    1 + n - Math.log(Math.log(Math.sqrt(Zr*Zr+Zi*Zi)))/Math.log(2.0);

With some elementary logarithm rules, we can simplify this to

    // Some constants
    var logBase = 1.0 / Math.log(2.0);
    var logHalfBase = Math.log(0.5)*logBase;
    // ...
    return 5 + n - logHalfBase - Math.log(Math.log(Tr+Ti))*logBase;

which is faster.  The constant `5` is another little trick, which should
be explained in the code itself.

Anti-aliasing and supersampling
-------------------------------

Finally, when you calculate the color value of a single pixel, it is in
reality just the color of a single point in the Mandelbrot set that is
situated somewhere _inside_ that pixel.

What I'm saying is that you'll basically get pixel artifacts in the image,
especially in dense areas where the color changes (near the black set, for
instance).

So what I do is to use random sampling:  Just sample a given number of
random points inside the pixel and average the sum of the color values.
This is equivalent to rendering the plot at a higher resolution and scaling
down.

There are many supersampling techniques to use, and the random sampling was
chosen because of its simplicity.  The problem is that the resulting picture
will look a bit blurry (there are ways around this as well).

Optimizing the calculation for performance
==========================================

Calculating the Mandelbrot set is quite slow, but there are a lot of tricks
to speed it up.

When speeding up any code, the first step (after making the code _correct_,
of course) is to look at the algorithm and try to use one with a simpler
complexity class.  Unfortunately, for the Mandelbrot set, this isn't really
possible.  So the tricks mentioned here are all cases of 
_micro-optimizations_.  Nevertheless, they will improve the running time
quite a lot.

We also have to remember that we're using Javascript here, which is a
relatively slow language because of its dynamic nature.  What's interesting
in this regard, though, is to identify performance hot spots in the typical
javascript engines.  It's interesting to test the code on different browsers.

Removing the square root operation
----------------------------------

First, let's look at the inner loop.  It continually calculates the
magnitude of the complex number C, and compares this with a threshold value.
Observe that it takes the square root in doing so:

    if ( sqrt(x^2 + y^2) > threshold ) ...

If we just square the treshold value, we should be able to do away with the
square root operation:

    threshold_squared = threshold^2
    // ...
    if ( (x^2 + y^2) > threshold_squared ) ...

Taking advantage of symmetry
----------------------------

You've probably noticed that the plot is reflected vertically over the line
`y=0`.  One can take advantage of this.

Splitting up the main equation
------------------------------

The main equation is

    C_{n+1} = C_{n}^2 + C_{0}

Setting `Cr = Re(C)` and `Ci = Im(C)`, we get

    C_{n+1} = Cr^2 + 2Cr*Ci*i - Ci*Ci + C_{0}
    C_{n+1} = (Cr^2 - Ci^2) + i(2Cr*Ci) + C_{0}

giving us

    Re (C_{n+1}) = Cr^2 - Ci^2 + x
    Im (C_{n+1}) = 2*Cr*Ci + y
    Mag(C_{n+1}) = sqrt(Cr^2 + Ci^2)

If we introduce two variables `Tr = Cr^2` and `Ti = Ci^2`, we get

    Re (C_{n+1})   = Tr - Ti + x
    Im (C_{n+1})   = 2*Cr*Ci + y
    Mag(C_{n+1})^2 = Tr + Ti
    Tr             = Re(C_{n+1}))^2
    Ti             = Im(C_{n+1}))^2

So we have now replaced some multiplications with additions, which is
normally faster in most CPUs.  But, again, this is javascript, and
javascript has quite a different performance profile.  The code above indeed
does _not_ give us any **significant** speedup --- for a 640x480 image, we
only save a hundred milliseconds, or so.

Fast indexing into the image data struct
----------------------------------------

To plot individual pixels in HTML5 canvas, you get an array and you have to
calculate the array offset for a given coordinate pair.

I.e., given RGBA pixel format (four positions), an (x, y) coordinate pair
and a width and height, you calculate it by

    offset = 4*x + 4*y*width

so that you can now set the RGBA values as

    array[offset+0] = red
    array[offset+1] = green
    array[offset+2] = blue
    array[offset+3] = alpha

There are several ways of optimizing this.  For instance, we can simply
multiply the whole offset by four, which is the same as shifting all bits
left two positions.  However, javascript works in mysterious ways, so the
customary shift operations may not be as fast as in other languages like C
and C++.  The reason _probably_ has to do with the fact that javascript only
has _one_ data type for numbers, and my guess is that it's some kind of
float.

Anyway, we now have

    offset = (x + y*width) << 2

Another trick I'd like to mention.  Say that the width and height are fixed
to, say 640 and 480, respectively.  And old trick to multiply y by 640 would
be notice that 640 = 512 + 128 = 2^9 + 2^7, giving us

    y*640 = y*512 + y*128 = y*2^9 + y*2^7 = y<<9 + y<<7

So now we've converted one multiplication into two shifts and an add.  In
your commodity language and hardware, this might be quite fast in tight
innerloops.

Anyway, we still want to be able to use arbitrary heights and widths, so
let's skip that one.

By far, the fastest way of accessing the array is by doing it sequentially.

That is, instead of doing

    for ( y=0; y<height; ++y )
    for ( x=0; x<width; ++x ) {
      // calculate RGBA
      var offset = 4*(x + y*with);
      image.data[offset + 0] = R;
      image.data[offset + 1] = G;
      image.data[offset + 2] = B;
      image.data[offset + 3] = A;
    }

a _much_ faster way would be to do

    var offset = 0;
    for ( y=0; y<height; ++y )
    for ( x=0; x<width; ++x ) {
      image.data[offset++] = R;
      image.data[offset++] = G;
      image.data[offset++] = B;
      image.data[offset++] = A;
    }

So now we've basically saved the work of doing `2*width*height`
multiplications, or 600 thousand of them, assuming a 640x480 image.

Fast copying of the image data
------------------------------

To draw in the canvas, you request an array, update it and copy it back to
the canvas.

Of course, you want to reduce the number of such operations.  Because we
want an animation showing each line as it is drawn, we'll do this:

  * Get an image data array
  * For each line: Update the array
  * For each line: Copy the array back to the canvas

The trick here, though is to _not_ use `getImageData`.  You're going to
overwrite all existing image data, so you can use the same buffer for every
line.  So instead, we'll use these operations:

  * Get a line buffer by calling `createImageData(canvas.width, 1)`
  * For each line: Update the line buffer array
  * For each line: Call `putImageData(linebuffer, 0, y_position)` to copy only _one_ line

This ensures that we only copy _one_ line per frame update.

Embarrassingly parallel
-----------------------

Since the algorithm above is referentially transparent, meaning that it
always produces the same output for the same input (where input is defined
as `x, y, steps, threshold`), you could in theory calculate all points in
parallel.

Such algorithms are colloquially called
[embarrassingly parallel](http://en.wikipedia.org/wiki/Embarrassingly_parallel).

Now, JavaScript is inherently single-threaded:  You can only use so-called
green threads, meaning that the javascript engine will yield control between
them.

However, there is a new HTML5 APi called web workers that you can use to
create real, OS-level threads.  That should make it easy to split up
plotting into several threads (preferrably one per logical core).

Using vectorized procedures
---------------------------

The algorithm is very well suited for vector operations.  Most modern
computers come with hardware optimizations for such operations (SSE, etc).
However, we are again limited to what the javascript engines will do for us.

Even more optimizations
-----------------------

Take a look at the optimizations done to the Mandelbrot set in
[The Computer Language Benchmarks Game](http://shootout.alioth.debian.org/u32/performance.php?test=mandelbrot)

There are a lot of cool tricks going on there.  Most of _those_ use SSE
parallelism for hardware speedup or offloads to the GPU.

License
-------
Copyright 2012 Christian Stigen Larsen

Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License.  You may obtain a copy
of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
License for the specific language governing permissions and limitations
under the License.
