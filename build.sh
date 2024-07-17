#!/bin/bash

# Assemble all for packaging:

mkdir packaging/

if [ -d dist/ ]; then
  cp -r dist/ packaging/
fi

cp -r language/ packaging/

cp icon.svg packaging/
cp library.json packaging/
cp semantics.json packaging/
cp upgrades.js packaging/

