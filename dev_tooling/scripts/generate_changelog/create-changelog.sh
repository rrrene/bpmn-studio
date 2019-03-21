#!/bin/bash

#
# This script creates the changelog almost automatically.
#
# Usage: create-changelog.sh <Previous_Version> <Current_Version>"
#

set -e

PLATFORM=$(uname -s)

if [[ $PLATFORM != "Darwin" ]]; then
  exit 1
fi

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <Previous_Version> <Current_Version>"

  exit 1
fi

if [[ -z $GHNAME ]]; then
  echo "Set Github username via export GHNAME=<Github Username>"
  echo "To set it permanently use: 'echo \"export GHNAME=<Github Username>\" >> ~/.bash_profile'"

  exit 1
fi

if [[ -z $GHAUTH ]]; then
  echo "Set Github Authtoken via export GHAUTH=<Github Authtoken>"
  echo "To set it permanently use: 'echo \"export GHAUTH=<Github Authtoken>\" >> ~/.bash_profile'"

  exit 1
fi

echo "⚙️ Generating Changelog File..."

bash generate_release_markdown_file.sh $1 $2

echo "⚙️ Getting Merge Commits.."
bash get_merge_commits.sh $1 $2
bash format_messages.bash merge_commits_of_release.txt formatted_messages.txt

echo "🛀 Please clean up the Merge Commits!"
code formatted_messages.txt --wait
bash sort_and_format_merge_commits.sh
echo "📋 Merge Commits have been copied to clipboard."

echo "✏️  Please paste the Merge Commits into the 'Full Changelog' section!"
code releasenotes_$2.md --wait

echo "⚙️ Getting Closed Issues.."
GITHUB_AUTH="$GHNAME:$GHAUTH" bash get_fixed_issues.sh

echo "🛀 Please clean up the Closed Issues!"
code closed_issues --wait
bash format_messages.bash closed_issues formatted_closed_issues.txt
cat formatted_closed_issues.txt | pbcopy
echo "📋 Closed Issues have been copied to clipboard."

echo "✏️  Please paste the Closed Issues in the 'Fixed Issues' section!"
code releasenotes_$2.md --wait

echo "✏️  Please fill out the 'Feature' sections!"
code releasenotes_$2.md --wait

cat releasenotes_$2.md | pbcopy
echo "📋 Releasenotes have been copied to clipboard."

echo "⚙️ Release Notes have been created successfully!"
