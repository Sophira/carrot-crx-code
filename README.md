# Carrot Extension
This is the repository for Carrot's Chrome browser extension.

This extension is built using React and Redux. App state is handled using Redux's stores and all state changes are sent to (and from) background / popup / content scripts, thus maintaining a single source of truth for app state (in the `background` script). 

SASS is for CSS, and we try to stick to the BEM (block__element--modifier) philosophy.

### Development
Webpack and NPM are used. To keep things easier, all built files are included in this repository. Simply load it via chrome://extensions (see 'Usage' below).

TODO: Babel needs to be updated, as version used in this repo has been deprecated

## Dependencies

* Run `npm install`

## Building

* Run `make` (which runs `npm buildWatch`)

## Usage

* Go to chrome://extensions and select "Load unpacked extension" and point to this folder after the files have been built

## Deploying to Chrome Store

Two helper functions are provided in the Makefile. The first is `make prepareDeploy`, which bundles all the code together and moves the `.git` folder one folder up (`../`) so that you can manually compess this folder (without the entire .git repo) and upload it to the chrome store. Once compresses, restory the repo by running `make restoreFromDeploy`.
