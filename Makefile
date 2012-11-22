TARGETS = mandelbrot.min.js

# Google Closure Compiler
# https://developers.google.com/closure/compiler/
#
CLOSURE_CC = closure-compiler
CLOSURE_FLAGS = --compilation_level ADVANCED_OPTIMIZATIONS \
								--warning_level VERBOSE

all: $(TARGETS)

mandelbrot.min.js: mandelbrot.js
	$(CLOSURE_CC) $(CLOSURE_FLAGS) $< > $@

clean:
	rm -f $(TARGETS)
