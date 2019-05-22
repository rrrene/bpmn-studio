#!/bin/bash

npm run jenkins-start-process-engine &

node node_modules/webdriver-manager update --versions.chrome=73.0.3683.68
node node_modules/webdriver-manager start --versions.chrome=73.0.3683.68 &

npm start -- --port=9000 &

# Wait for required resources to be up and running.
while ! curl --silent localhost:8000 > /dev/null; do sleep 1; done
while ! curl --silent localhost:4444 > /dev/null; do sleep 1; done
while ! curl --silent localhost:9000 > /dev/null; do sleep 1; done

npm run jenkins-run-end-to-end-tests
