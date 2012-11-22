TARGETS = mandelbrot.min.js

JSLINT = jsl
CLOSURE_CC = closure-compiler
CLOSURE_FLAGS = --compilation_level ADVANCED_OPTIMIZATIONS \
								--warning_level VERBOSE

all: $(TARGETS)

lint: mandelbrot.js
	$(JSLINT) -process $<

mandelbrot.min.js: mandelbrot.js
	$(CLOSURE_CC) $(CLOSURE_FLAGS) $< > $@

clean:
	rm -f $(TARGETS)
