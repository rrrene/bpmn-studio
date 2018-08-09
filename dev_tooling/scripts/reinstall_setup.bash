#!/bin/bash
_VERSION="0.0.1"

############
# This script reinstalls the current developement Setup by:
#   * Resetting your configuration by calling the npm reset script
#     that:
#       * Deletes your node_modules
#       * Deletes your package-lock file (if it exists)
#       * Clears your NPM - Cache
#   * Reinstalling all required node modules
#   * Rebuilding
#
# Note: Please DO NOT ADD THIS SCRIPT TO THE JENKINSFILE!
#
# This script is meant to give you, the human developer, a convenient way, to
# reinstall your setup. Adding this script to the jenkinsfile would not make
# that much sense, because:
#   * The jenkins *should* offer a clean setup anyway
#   * The jenkins already executes npm install (Since npm does not seems to that
#     consistent, a multiple execution of npm install may lead to an undefined
#     behavior and is pointless anyways.
############

# Reset the current setup
echo "Cleaning setup..."
npm run reset

# Reinstalling your node modules
echo "Installing node modules..."
npm install --no-package-lock

# If npm install fails, its likely that also the build process would fail,
# so we can exit here.
if [[ $? -ne 0 ]]; then
  echo "Error while running npm install. Exiting..."
  exit 1
fi

# Build all modules
echo "Building..."
npm run build
