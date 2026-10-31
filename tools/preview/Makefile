# Renders the keychain face on your Mac - no hardware, no Wokwi needed.
#
#   make          build the preview tool
#   make sheet    render the six expressions  -> docs/_sheet
#   make frames   render the 14 s demo        -> docs/_frames
#   make gif      combine everything          -> docs/preview.gif, docs/expressions.png
#   make clean    remove build output
#
# The preview compiles the very same eye_engine.h that runs on the ESP32.

CXX      ?= g++
CXXFLAGS ?= -O2 -std=c++11 -Wall -Wextra
DOCS     := ../../docs

all: preview

preview: main.cpp canvas.h ../../firmware/keychain-eyes/eye_engine.h
	$(CXX) $(CXXFLAGS) -o $@ main.cpp

sheet: preview
	./preview sheet $(DOCS)/_sheet

frames: preview
	./preview frames $(DOCS)/_frames

gif: sheet frames
	python3 make_gif.py

clean:
	rm -f preview
	rm -rf $(DOCS)/_sheet $(DOCS)/_frames

.PHONY: all sheet frames gif clean
