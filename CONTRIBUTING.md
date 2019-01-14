# Contributing

## Committing

minidrone is protected by commitizen which will block all commits unless they pass tests and are formatted to `cz-conventional-changelog` standards. You can read more about commitizen [here](https://github.com/commitizen/cz-cli).

When ready to commit stage your commits then run `npm run commit` to walk through a curated commit workflow.

example

```bash
git add -A
npm run commit
git push
```

## Running the test suite

```bash
git clone <git url>
cd <clone dir>
npm install
npm test
```

Funny story, as of right now we don't have many tests, they mainly live in the
`eg` directory for use with a real drone. Please, please, please if
you rock at test, help out!

## Fixing bugs

Bug fixes are always welcome. Please add a test!
