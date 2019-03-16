#! /bin/sh

if [ -n "$(git status --porcelain)" ]; then
  exit 1
fi

yarn build

rm -rf docs
mkdir docs
cp -r dist/* docs

git add -A
git commit -m "execute ./gen-docs.sh"
