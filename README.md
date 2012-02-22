Mandelbrot.js
=============

Vanilla Mandelbrot Set renderer in HTML5 canvas and javascript.

Author
------
Written by Christian Stigen Larsen

http://csl.sublevel3.org

Theory
------

The famous [Mandelbrot set](http://en.wikipedia.org/wiki/Mandelbrot_set) is
a set of points in the complex plane.  In essence, what we want to find out
is if the iterative function C below will _converge_ to some constant or _diverge_
to infinity.

The function is

  `$ C_{n+1} = C_{n}^2 + C_{0} $`

with the initial condition simply formed by taking the coordinates in the
complex plane,

  `$ C_{0} = x + iy $`

Looking at the function, one can easily see that for big initial values, the
function should diverge.  But for values close to origo (i.e., for |x| and
|y| less than 1), we would expect the function to converge to zero, since
the product of two numbers less than one will always be less than either of
the factors (e.g., 0.5 x 0.4 = 0.2, which is less than both factors).

So, if you draw a loop around origo for all the points where |x| and |y| <
1, what would you expect to see?  A circle of course.  **But that is _not_
the case!**  Instead, we get an irregular shape that resembles nothing like
a circle.  This is the Mandelbrot set.  One can also calculate it's
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

To do this, just take the current value of `C` and _map_ that against a
color spectrum, and paint that color.  So, functions diverging quickly will
get about the same color.

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

Embarrassingly parallel
-----------------------

Since the algorithm above is referentially transparent, meaning that it
always produces the same output for the same input (where input is defined
as `x, y, steps, threshold`), you could in theory calculate all points in
parallel.

Such algorithms are colloquially called
[embarrassingly parallel](http://en.wikipedia.org/wiki/Embarrassingly_parallel).

Now, I don't know how well the current javascript engines are at utilizing
multicores, but you could _easily_ split up the plotting into four threads
or so.

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
parallelism for hardware speedup.

License
-------
Put in the public domain by the author -- February, 2012
