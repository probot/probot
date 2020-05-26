#!/bin/bash

# Exit if a command returns a non-zero code
set -e

# Store the versions
VERSION=$(git describe --tags $(git rev-list --tags --max-count=1) | sed 's/^v//')
HEAD=$(git rev-parse HEAD)
REPO=https://${OCTOKITBOT_PAT}@github.com/probot/probot.github.io.git

echo "Version is $VERSION"
echo "Head is $HEAD"

# Generate docs
npm run doc

# Checkout the website into the tmp directory
[ -d tmp/website ] || {
  mkdir -p tmp
  git clone "$REPO" tmp/website
}

# Update the website checkout
cd tmp/website
git pull origin master

# Delete previously generated docs for this version
rm -rf "api/$VERSION"

# Copy over the new docs
mv ../../out "api/$VERSION"

# Update the /api/latest link to point to this version
ln -sfn "$VERSION" api/latest

# Update the submodule
git submodule update --init
cd _submodules/probot
git fetch
git checkout "$HEAD"
cd ../..

# Configure Git and commit, and publish
git config --global user.email "action@github.com"
git config --global user.name "GitHub Action"
git add .
git commit -m "Update docs from Probot v$VERSION" -m "via $GITHUB_REPOSITORY@$HEAD"
git push "$REPO" master
